import type { AiIntakeService } from "./service";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { AI_LIMITS } from "./contract";
import { aiImagePreviewUri, safeAiError } from "./native-bridge";
import { useV2DialogAppearance } from "../ui-v2/appearance";
import { NativeV2Sheet } from "../ui-v2/native-sheet";
import { V2Image } from "../ui-v2/components";

export function AiIntakeScreen({ service, onPreview, onCancel, onConfigureKey, onManual }: {
  service: AiIntakeService; onPreview: () => void; onCancel: () => void;
  onConfigureKey: () => void; onManual?: () => void;
}) {
  const state = useSyncExternalStore(service.subscribe, service.snapshot, service.snapshot);
  const dialogAppearance = useV2DialogAppearance("v2");
  const [configured, setConfigured] = useState<boolean | null>(null), [localError, setLocalError] = useState("");
  const [confirm, setConfirm] = useState(false), [discarding, setDiscarding] = useState(false), [cancelling, setCancelling] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const alive = useRef(true), destination = useRef<"back" | "manual">("back");
  useEffect(() => {
    alive.current = true; let current = true;
    void service.startSession().then(() => service.refreshKey()).then(value => { if (current) setConfigured(value); })
      .catch(e => { if (current) { const safe = safeAiError(e); setLocalError(safe.message); if (safe.code === "key_unavailable") setConfigured(false); } });
    return () => { current = false; alive.current = false; };
  }, [service]);
  useEffect(() => {
    const back = (event: Event) => { if (event.defaultPrevented) return; event.preventDefault(); setConfirm(true); };
    window.addEventListener("recipio:back", back);
    return () => window.removeEventListener("recipio:back", back);
  }, []);
  async function send() {
    try { await service.organize(state.input); if (alive.current) onPreview(); }
    catch { /* Safe service error remains visible; never an automatic retry. */ }
  }
  async function discard() {
    if (discarding) return; setDiscarding(true);
    try { await service.discard(); if (alive.current) { if (destination.current === "manual" && onManual) onManual(); else onCancel(); } }
    catch (e) { if (alive.current) { setLocalError(safeAiError(e).message); setDiscarding(false); setConfirm(false); } }
  }
  async function cancel() {
    if (cancelling) return; setCancelling(true);
    try { await service.cancelRequest(); }
    catch (e) { if (alive.current) setLocalError(safeAiError(e).message); }
    finally { if (alive.current) setCancelling(false); }
  }
  const busy = state.phase === "requesting" || state.imageBusy || discarding || cancelling;
  const count = Array.from(state.input.text.trim()).length;
  const preview = state.images.find(image => image.id === previewId);
  return <section className="v2-task v2-ai-intake">
    <header className="v2-task-header"><h2 className="v2-page-title">整理菜谱</h2>
      <Button variant="outline" disabled={discarding || cancelling} onClick={() => { destination.current = "back"; setConfirm(true); }}>返回</Button>
    </header>
    <label className="v2-field-label"><span>菜谱文字</span>
      <textarea aria-describedby="ai-text-count" value={state.input.text} disabled={busy} onChange={e => service.updateInput({ ...state.input, text: e.target.value })} />
    </label>
    <p id="ai-text-count" className="v2-task-note">{count} / {AI_LIMITS.textCodePoints} 字符；支持口语、换行和 Emoji。</p>
    <section className="v2-intake-images" aria-label="本轮截图">
      <div className="v2-task-header"><h3>本轮截图（{state.images.length} / {AI_LIMITS.imageCount}）</h3>
        <Button variant="outline" disabled={busy || !state.operationId || state.images.length >= AI_LIMITS.imageCount}
          onClick={() => void service.pickImage().catch(e => setLocalError(safeAiError(e).message))}>添加截图</Button>
      </div>
      <p className="v2-task-note">可只选截图，也可补充文字。JPG、PNG 或 WebP 会在本机检查、缩小；每张原图不超过 {AI_LIMITS.originalImageBytes / 1048576} MiB / {AI_LIMITS.originalPixels / 10000} 万像素。截图不会成为菜谱图片，也不会进入备份。</p>
      {state.imageBusy && <p role="status" className="v2-task-status">正在选择或处理截图…</p>}
      {state.images.length === 0 && <p className="v2-task-note">还没有添加截图，也可以只用文字整理。</p>}
      <ol className="v2-intake-image-grid">{state.images.map((image, index) => <li key={image.id}>
        <button type="button" className="v2-intake-image-preview" disabled={busy} aria-label={`预览截图 ${index + 1}`} onClick={() => setPreviewId(image.id)}>
          <V2Image src={aiImagePreviewUri(image)} alt={`截图 ${index + 1}`} />
        </button>
        <p>截图 {index + 1}<span className="v2-task-note"> · {image.width} × {image.height}</span></p>
        <div className="v2-image-actions">
          <Button variant="outline" disabled={busy || index === 0} aria-label={`前移截图 ${index + 1}`} onClick={() => service.moveImage(image.id, -1)}>前移</Button>
          <Button variant="outline" disabled={busy || index === state.images.length - 1} aria-label={`后移截图 ${index + 1}`} onClick={() => service.moveImage(image.id, 1)}>后移</Button>
          <Button variant="outline" disabled={busy} aria-label={`移除截图 ${index + 1}`} onClick={() => void service.removeImage(image.id).catch(e => setLocalError(safeAiError(e).message))}>移除</Button>
        </div>
      </li>)}</ol>
    </section>
    {state.pendingCleanup && <p role="status" className="v2-task-status">有临时截图尚未清理，下次启动会重试；已有菜谱与备份不受影响。</p>}
    {configured === false && <div className="v2-task-status"><p>尚未配置本机 AI 密钥，当前文字和截图会保留。</p><Button variant="outline" disabled={busy} onClick={onConfigureKey}>前往设置 AI 密钥</Button></div>}
    {(state.error || localError) && <div className="v2-task-status" role="alert"><p>{state.error?.message ?? localError}</p>
      {onManual && <Button variant="outline" disabled={busy} onClick={() => { destination.current = "manual"; setConfirm(true); }}>改为手动录入</Button>}
    </div>}
    <p className="v2-task-note v2-online-notice">可选联网功能。仅在点击整理后，将本轮文字与选中的截图按密钥类型发送给千问 AI 平台或北京百炼，可能产生 API 费用。AI 结果需要人工检查，不会自动保存。</p>
    {state.phase === "requesting" ? <div className="v2-task-actions"><p role="status">{cancelling ? "正在取消本轮请求…" : "正在整理，仍可取消或返回…"}</p>
      <Button variant="outline" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? "正在取消…" : "取消请求"}</Button>
    </div> : <div className="v2-task-actions"><Button disabled={busy || !state.operationId || configured !== true || !state.input.text.trim() && !state.input.imageIds.length || count > AI_LIMITS.textCodePoints} onClick={() => void send()}>{state.phase === "error" ? "重试 AI 整理" : "开始 AI 整理"}</Button>
      {!state.input.text.trim() && !state.input.imageIds.length && <p className="v2-task-note">输入文字或添加截图后即可整理。</p>}
    </div>}
    <Dialog open={confirm} onOpenChange={value => { if (!discarding && !cancelling) setConfirm(value); }}>
      <DialogContent {...dialogAppearance} showCloseButton={!discarding}><DialogTitle>放弃本轮整理？</DialogTitle><DialogDescription>将取消在途请求并清理本轮临时截图，已有本地菜谱不受影响。</DialogDescription>
        <DialogFooter><Button autoFocus variant="outline" disabled={discarding || cancelling} onClick={() => setConfirm(false)}>继续整理</Button><Button disabled={discarding || cancelling} onClick={() => void discard()}>{discarding ? "正在放弃…" : "放弃本轮整理"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <NativeV2Sheet open={!!preview} onOpenChange={open => { if (!open) setPreviewId(null); }} title="查看截图" description="仅查看本轮临时来源，不保存为封面或步骤图。">
      {preview && <V2Image className="v2-source-image-full" src={aiImagePreviewUri(preview)} alt={`本轮截图 ${state.images.indexOf(preview) + 1}`} />}
    </NativeV2Sheet>
  </section>;
}
