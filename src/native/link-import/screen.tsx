import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { RecipeEditor } from "../recipe-editor";
import { AiPreview } from "../ai/preview";
import type { RecipeDetails, RecipeDetailsInput } from "../recipe-model";
import type { LinkImportService } from "./service";
import { useV2DialogAppearance } from "../ui-v2/appearance";

function ParserPreview({ service, onSaved, onBack }: { service: LinkImportService; onSaved: (recipe: RecipeDetails) => void; onBack: () => void }) {
  const selected = service.selected()!;
  const dialogAppearance = useV2DialogAppearance("v2");
  const [duplicate, setDuplicate] = useState(false); const decision = useRef<((yes: boolean) => void) | null>(null);
  const decide = (yes: boolean) => { setDuplicate(false); decision.current?.(yes); decision.current = null; };
  useEffect(() => () => { decision.current?.(false); decision.current = null; }, []);
  useEffect(() => {
    if (!duplicate) return; const back = (event: Event) => { event.preventDefault(); decide(false); };
    window.addEventListener("recipio:back", back); return () => window.removeEventListener("recipio:back", back);
  }, [duplicate]);
  async function save(input: RecipeDetailsInput) {
    let exists: boolean;
    try { exists = await service.dependencies.store.hasExactTitle(input.title.trim()); } catch { throw new Error("同名检查未完成，请重试；当前内容尚未保存。"); }
    if (exists && !await new Promise<boolean>(resolve => { decision.current = resolve; setDuplicate(true); })) return;
    onSaved(await service.saveParser(input));
  }
  return <section className="v2-task v2-link-intake v2-import-preview v2-parser-preview">
    <div className="v2-task-status"><p>{selected.quality === "partial" ? "网页信息不完整" : "已从网页读取"}</p><p className="v2-task-note">已读取网页自带菜谱结构，未调用 AI。请检查后保存；缺失信息保持空白。网页图片和来源不会保存。</p></div>
    {selected.warnings.map(warning => <p className="v2-task-status" role="status" key={warning}>{warning}</p>)}
    <RecipeEditor appearance="v2" heading="检查网页菜谱" submitLabel="确认保存菜谱" initial={service.snapshot().parserDraft ?? selected.recipe} mediaEnabled={false} onSave={save} onCancel={onBack} />
    <Dialog open={duplicate} onOpenChange={open => { if (!open) decide(false); }}><DialogContent {...dialogAppearance}><DialogTitle>已存在同名菜谱</DialogTitle><DialogDescription>继续会新建另一条，不覆盖或合并原菜谱。</DialogDescription><DialogFooter><Button variant="outline" onClick={() => decide(false)}>返回检查</Button><Button onClick={() => decide(true)}>仍然新建菜谱</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
export function LinkImportScreen({ service, active, onSaved, onCancel, onConfigureKey, onFallback }: { service: LinkImportService; active: boolean; onSaved: (recipe: RecipeDetails) => void; onCancel: () => void; onConfigureKey: () => void; onFallback: (target: "ai" | "manual") => void }) {
  const dialogAppearance = useV2DialogAppearance("v2");
  const descriptionId = useId(), errorId = useId();
  const state = useSyncExternalStore(service.subscribe, service.snapshot, service.snapshot);
  const ai = service.dependencies.ai, aiState = useSyncExternalStore(ai.subscribe, ai.snapshot, ai.snapshot);
  const [parserOpen, setParserOpen] = useState(false), [confirm, setConfirm] = useState(false), [leaving, setLeaving] = useState(false), [localError, setLocalError] = useState("");
  const destination = useRef<"back" | "ai" | "manual">("back"); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const uncertain = state.phase === "uncertain" || aiState.phase === "uncertain" && state.phase === "ai-preview";
  const busy = ["reading", "ai-requesting", "saving"].includes(state.phase) || leaving || aiState.phase === "saving";
  useEffect(() => {
    if (!active) return;
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      if (uncertain || leaving || state.phase === "saving" || aiState.phase === "saving") { event.preventDefault(); return; }
      if (parserOpen || state.phase === "ai-preview") return; // Existing editor owns dirty/Back behavior.
      event.preventDefault(); destination.current = "back"; setConfirm(true);
    };
    window.addEventListener("recipio:back", back); return () => window.removeEventListener("recipio:back", back);
  }, [active, parserOpen, state.phase, aiState.phase, uncertain, leaving]);
  async function read() { setLocalError(""); setParserOpen(false); try { await service.read(); if (alive.current) setParserOpen(service.selected()?.quality === "complete"); } catch { /* Safe service error stays visible; no automatic retry. */ } }
  async function leave() {
    if (leaving) return; setLeaving(true);
    try { await service.discard(); if (alive.current) { if (destination.current === "back") onCancel(); else onFallback(destination.current); } }
    catch { if (alive.current) { setLocalError("本轮操作尚未结束，请先核对保存结果。"); setLeaving(false); setConfirm(false); } }
  }
  function backToResults() { service.returnToResults(); setParserOpen(false); }
  async function recover() {
    setLocalError(""); try { const saved = await service.recoverSave(); if (saved) onSaved(saved); else setParserOpen(state.phase === "uncertain"); }
    catch { setLocalError("仍无法核对保存结果，请稍后重试；不会重新创建菜谱。"); }
  }
  if (uncertain) return <section className="v2-task v2-link-intake"><header className="v2-task-header"><h2 className="v2-page-title">先核对保存结果</h2></header><p className="v2-task-note">为避免重复，新建已暂停；核对只读取原编号，不重新创建。</p>{localError && <p className="v2-task-status" role="alert">{localError}</p>}<div className="v2-task-actions"><Button onClick={() => void recover()}>核对保存结果</Button></div></section>;
  if (state.phase === "ai-preview" && aiState.draft) return <AiPreview draft={aiState.draft} confirmed={aiState.confirmed} onConfirmedChange={value => ai.setConfirmed(value)} hasExactTitle={title => service.dependencies.store.hasExactTitle(title)} onSave={async input => { onSaved(await service.saveAi(input)); }} onCancel={backToResults} source="web" />;
  if (parserOpen && service.selected()) return <ParserPreview key={service.selected()!.id} service={service} onSaved={onSaved} onBack={backToResults} />;
  return <section className="v2-task v2-link-intake">
    <header className="v2-task-header"><h2 className="v2-page-title">从网页导入</h2><Button variant="outline" disabled={leaving} onClick={() => { destination.current = "back"; setConfirm(true); }}>返回</Button></header>
    <div className="v2-intake-field"><label className="v2-field-label"><span>网页链接</span><Input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://…" aria-describedby={`${descriptionId}${state.error || localError ? ` ${errorId}` : ""}`} aria-invalid={state.phase === "error" && !!state.error} value={state.url} disabled={busy} onChange={event => { setLocalError(""); setParserOpen(false); service.setUrl(event.target.value); }} /></label>
      <p className="v2-task-note" id={descriptionId}>优先读取网页自带的菜谱信息，不会自动调用 AI。</p></div>
    <div className="v2-task-actions">{state.phase === "reading" ? <><p className="v2-task-status" role="status">正在安全读取网页…</p><Button variant="outline" onClick={() => void service.cancelRead().catch(() => setLocalError("取消读取未完成，请稍后重试。"))}>取消读取</Button></> : <Button disabled={busy || !state.url.trim()} onClick={() => void read()}>{state.phase === "error" ? "重试读取网页" : "读取网页"}</Button>}</div>
    {(state.error || localError) && <p id={errorId} className="v2-task-status" role="alert">{state.error?.message ?? localError}</p>}
    {state.parsed && <section className="v2-task-results" aria-label="网页读取结果">
      <h3>{state.parsed.needsSelection ? "请选择要导入的菜谱" : service.selected()?.quality === "partial" ? "网页信息不完整" : "网页读取结果"}</h3>
      {state.parsed.warnings.map(warning => <p className="v2-task-note" key={warning}>{warning}</p>)}
      {state.visible?.wasTruncated && <p className="v2-task-status" role="status">网页正文过长，已保留部分完整段落；AI 可能缺少信息，请仔细检查。</p>}
      {state.parsed.needsSelection && state.parsed.candidates.map(candidate => <article className="v2-source-card" key={candidate.id}><h4>{candidate.recipe.title}</h4><p className="v2-task-note">{candidate.recipe.ingredients.length} 项食材 · {candidate.recipe.steps.length} 个步骤</p><div className="v2-task-actions"><Button variant="outline" disabled={busy} onClick={() => { service.select(candidate.id); setParserOpen(true); }}>选择 {candidate.recipe.title}</Button></div></article>)}
      {service.selected() && !state.parsed.needsSelection && <div className="v2-task-actions"><Button variant="outline" disabled={busy} onClick={() => setParserOpen(true)}>{service.selected()?.quality === "partial" ? "直接完善菜谱" : "查看网页菜谱"}</Button></div>}
      {!state.parsed.candidates.length && <p className="v2-task-note">没有完整的结构化菜谱；可以主动选择 AI 整理可读正文，或手动录入。</p>}
      {state.phase === "ai-requesting" ? <p className="v2-task-status" role="status">正在整理网页文字，仍可返回并放弃本轮…</p> : state.visible?.text && <div className="v2-task-actions"><p className="v2-task-note">只有点击下方按钮才会将清洗后的文字发送给当前千问服务，可能产生 API 费用；不会发送网页地址或图片。</p><Button disabled={busy} onClick={() => void service.useAi().catch(() => {})}>使用 AI 继续整理</Button></div>}
      {state.error?.message.includes("配置本机 AI 密钥") && <div className="v2-task-actions"><Button variant="outline" disabled={busy} onClick={onConfigureKey}>前往设置 AI 密钥</Button></div>}
    </section>}
    <p className="v2-task-note">仅读取公开普通网页。需要登录、验证码或视频的网站，请改用文字或截图。</p>
    <div className="v2-intake-alternatives"><p className="v2-task-note">换一种录入方式</p><div className="v2-task-actions"><Button variant="outline" disabled={busy} onClick={() => { destination.current = "ai"; setConfirm(true); }}>改用文字 / 截图</Button><Button variant="outline" disabled={busy} onClick={() => { destination.current = "manual"; setConfirm(true); }}>改为手动录入</Button></div></div>
    <Dialog open={confirm} onOpenChange={value => { if (!leaving) setConfirm(value); }}><DialogContent {...dialogAppearance} showCloseButton={!leaving}><DialogTitle>放弃本轮网页导入？</DialogTitle><DialogDescription>未保存的网页内容和预览会释放，已有本地菜谱不受影响。</DialogDescription><DialogFooter><Button variant="outline" disabled={leaving} onClick={() => setConfirm(false)}>继续导入</Button><Button disabled={leaving} onClick={() => void leave()}>放弃网页导入</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
