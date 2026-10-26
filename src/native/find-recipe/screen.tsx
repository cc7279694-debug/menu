import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { AiPreview } from "../ai/preview";
import type { RecipeDetails } from "../recipe-model";
import { searchInputSchema, safeFinderError } from "./contract";
import type { FindRecipeService } from "./service";
import { useV2DialogAppearance } from "../ui-v2/appearance";

export function FindRecipeScreen({ service, active, onSaved, onCancel, onConfigureKey, onFallback }: { service: FindRecipeService; active: boolean; onSaved: (recipe: RecipeDetails) => void; onCancel: () => void; onConfigureKey: () => void; onFallback: (target: "ai" | "link" | "manual") => void }) {
  const state = useSyncExternalStore(service.subscribe, service.snapshot, service.snapshot), ai = service.dependencies.ai;
  const aiState = useSyncExternalStore(ai.subscribe, ai.snapshot, ai.snapshot);
  const dialogAppearance = useV2DialogAppearance("v2"), fieldId = useId();
  const [confirm, setConfirm] = useState(false), [leaving, setLeaving] = useState(false), [localError, setLocalError] = useState(""), [notice, setNotice] = useState("");
  const alive = useRef(true);
  const leaveInFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const busy = state.phase === "searching" || state.phase === "extracting" || state.cancelling || leaving;
  const saving = state.phase === "saving", uncertain = state.phase === "uncertain";
  useEffect(() => {
    if (!active) return;
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      if (saving || uncertain || leaving || state.cancelling) { event.preventDefault(); return; }
      if (state.phase === "preview") return; // Existing editor owns its dirty/Back guard.
      event.preventDefault();
      if (confirm) { setConfirm(false); return; }
      if (state.phase === "searching" || state.phase === "extracting") { setConfirm(true); return; }
      if (state.phase === "results") service.returnToInput();
      else void leave();
    };
    window.addEventListener("recipio:back", back); return () => window.removeEventListener("recipio:back", back);
  });
  async function leave(target?: "ai" | "link" | "manual") {
    if (leaveInFlight.current) return; leaveInFlight.current = true; setLeaving(true);
    try { await service.discard(); if (alive.current) { if (target) onFallback(target); else onCancel(); } }
    catch (error) { leaveInFlight.current = false; if (alive.current) { setLocalError(safeFinderError(error).message); setLeaving(false); } }
  }
  async function cancel() { setConfirm(false); setNotice(""); try { await service.cancelRequest(); if (alive.current) setNotice("已取消请求。"); } catch (error) { if (alive.current) setLocalError(safeFinderError(error).message); } }
  async function search() { setLocalError(""); setNotice(""); try { await service.search(); } catch { /* Safe service message, never automatic retry. */ } }
  async function extract(id: string) { setLocalError(""); setNotice(""); try { await service.extract(id); } catch { /* Selection remains visible; no other-source fallback. */ } }
  if (uncertain) return <section className="v2-task v2-finder space-y-4"><header className="v2-task-header"><h2 className="v2-page-title">先核对保存结果</h2></header><p className="v2-task-note">为避免重复，新建已暂停；只核对原编号，不重新创建。</p>{localError && <p className="v2-task-status" role="alert">{localError}</p>}<div className="v2-task-actions"><Button className="min-h-11" onClick={() => void service.recoverSave().then(recipe => { if (recipe && alive.current) onSaved(recipe); }).catch(error => setLocalError(safeFinderError(error).message))}>核对保存结果</Button></div></section>;
  if ((state.phase === "preview" || saving) && aiState.draft) return <AiPreview draft={aiState.draft} confirmed={aiState.confirmed} onConfirmedChange={value => ai.setConfirmed(value)} source="web" hasExactTitle={title => ai.dependencies.store.hasExactTitle(title)} onSave={async input => { const recipe = await service.save(input); if (alive.current) onSaved(recipe); }} onCancel={() => void service.returnToResults().catch(error => setLocalError(safeFinderError(error).message))}/>;
  const results = state.phase === "results" || state.phase === "extracting";
  const dishLength = Array.from(state.dish.trim()).length, preferenceLength = Array.from(state.preference.trim()).length;
  return <section className="v2-task v2-finder">
    <header className="v2-task-header"><h2 className="v2-page-title">帮我找做法</h2><Button variant="outline" disabled={leaving || state.cancelling} onClick={() => { if (busy) setConfirm(true); else if (results) service.returnToInput(); else void leave(); }}>返回</Button></header>
    <p className="v2-task-note">联网寻找公开做法，可能产生费用。选中后再整理，保存前由你确认。</p>
    <details className="v2-task-note"><summary>联网与费用说明</summary><p>点击“开始寻找”会将菜名和偏好发送给千问搜索，可能产生 API 费用；点击“按这个做法整理”后，再请求选定来源的 AI 整理，也可能产生费用。结果需人工检查，不会自动保存。</p></details>
    {!results && <>
      <div className="v2-intake-field"><label htmlFor={`${fieldId}-dish`}>想做什么菜</label><Input id={`${fieldId}-dish`} aria-describedby={`${fieldId}-dish-count`} aria-invalid={dishLength > 120 || undefined} className="min-h-12" value={state.dish} placeholder="例如：啤酒鸭" disabled={busy} onChange={event => service.updateInput(event.target.value, state.preference)}/><p id={`${fieldId}-dish-count`} className="v2-task-note">菜名 {dishLength}/120</p></div>
      <div className="v2-intake-field"><label htmlFor={`${fieldId}-preference`}>偏好（可选）</label><textarea id={`${fieldId}-preference`} aria-describedby={`${fieldId}-preference-count`} aria-invalid={preferenceLength > 500 || undefined} className="min-h-24 w-full rounded-xl border bg-background p-3" value={state.preference} placeholder="例如：少油、适合新手" disabled={busy} onChange={event => service.updateInput(state.dish, event.target.value)}/><p id={`${fieldId}-preference-count`} className="v2-task-note">偏好 {preferenceLength}/500</p></div>
      {state.phase === "searching" ? <p className="v2-task-status" role="status">{state.cancelling ? "正在取消请求…" : "正在寻找公开做法…"}</p> : <div className="v2-task-actions v2-intake-submit"><Button disabled={busy || !searchInputSchema.safeParse({ dish: state.dish, preference: state.preference }).success} onClick={() => void search()}>开始寻找</Button></div>}
    </>}
    {results && <section aria-label="找到的做法" className="v2-task-results">
      <h3 className="font-medium">{state.candidates.length ? `找到 ${state.candidates.length} 个做法，请选择` : "暂时没有找到适合整理的公开菜谱。"}</h3>
      {state.candidates.length > 0 && <p className="v2-task-note">以下是公开来源提供的做法。选定后将再次请求 AI 整理，可能产生 API 费用。</p>}
      {state.candidates.map((candidate, index) => {
        const selected = state.phase === "extracting" && state.selected?.id === candidate.id;
        return <article key={candidate.id} aria-labelledby={`${fieldId}-source-${index}`} aria-busy={selected || undefined} className="v2-source-card">
          <h4 id={`${fieldId}-source-${index}`} className="text-lg font-semibold break-words">{candidate.title}</h4>
          <div className="v2-source-context"><p className="v2-source-host break-all text-sm text-muted-foreground">来源：{candidate.sourceHost}</p>
            {candidate.totalMinutes !== null && <p className="v2-source-time">来源耗时：{candidate.totalMinutes} 分钟</p>}</div>
          {selected && <p className="v2-task-note">{state.cancelling ? "已选定 · 正在取消" : "已选定 · 正在整理"}</p>}
          {candidate.summary && <p className="break-words">{candidate.summary}</p>}
          {candidate.highlights.length > 0 && <ul className="list-disc space-y-1 pl-5">{candidate.highlights.map((highlight, highlightIndex) => <li key={highlightIndex}>{highlight}</li>)}</ul>}
          {candidate.preparationHint && <p className="v2-source-preparation">来源提前准备：{candidate.preparationHint}</p>}
          <div className="v2-task-actions v2-source-decision"><Button disabled={busy} onClick={() => void extract(candidate.id)}>按这个做法整理</Button></div>
        </article>;
      })}
      {state.phase === "extracting" && <p className="v2-task-status" role="status">{state.cancelling ? "正在取消请求…" : `正在整理：${state.selected?.title} · ${state.selected?.sourceHost}`}</p>}
      <div className="v2-task-actions"><Button variant="outline" disabled={busy} onClick={() => service.returnToInput()}>重新寻找</Button></div>
    </section>}
    {notice && !busy && <p className="v2-task-status" role="status">{notice}</p>}
    {(state.error || localError) && <p className="v2-task-status" role="alert">{state.error?.message ?? localError}</p>}
    {state.error && ["key_missing", "key_unavailable", "provider_access", "unauthorized", "forbidden"].includes(state.error.code) && <Button variant="outline" disabled={busy} onClick={onConfigureKey}>前往设置 AI 密钥</Button>}
    {busy && <Button variant="outline" disabled={state.cancelling || leaving} onClick={() => void cancel()}>取消请求</Button>}
    <div className="v2-intake-alternatives"><p className="v2-task-note">换一种录入方式</p><div className="v2-task-actions"><Button variant="outline" disabled={busy} onClick={() => void leave("ai")}>改用文字 / 截图</Button><Button variant="outline" disabled={busy} onClick={() => void leave("link")}>从网页链接导入</Button><Button variant="outline" disabled={busy} onClick={() => void leave("manual")}>手动录入</Button></div></div>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent {...dialogAppearance}><DialogTitle>取消当前请求？</DialogTitle><DialogDescription>取消后保留本轮输入或候选做法，不会自动重试。</DialogDescription><DialogFooter><Button variant="outline" onClick={() => setConfirm(false)}>继续等待</Button><Button disabled={state.cancelling} onClick={() => void cancel()}>取消请求</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
