import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { AiPreview } from "../ai/preview";
import type { RecipeDetails } from "../recipe-model";
import { searchInputSchema, safeFinderError } from "./contract";
import type { FindRecipeService } from "./service";

export function FindRecipeScreen({ service, active, onSaved, onCancel, onConfigureKey, onFallback }: { service: FindRecipeService; active: boolean; onSaved: (recipe: RecipeDetails) => void; onCancel: () => void; onConfigureKey: () => void; onFallback: (target: "ai" | "link" | "manual") => void }) {
  const state = useSyncExternalStore(service.subscribe, service.snapshot, service.snapshot), ai = service.dependencies.ai;
  const aiState = useSyncExternalStore(ai.subscribe, ai.snapshot, ai.snapshot);
  const [confirm, setConfirm] = useState(false), [leaving, setLeaving] = useState(false), [localError, setLocalError] = useState("");
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
  async function cancel() { setConfirm(false); try { await service.cancelRequest(); } catch (error) { if (alive.current) setLocalError(safeFinderError(error).message); } }
  async function search() { setLocalError(""); try { await service.search(); } catch { /* Safe service message, never automatic retry. */ } }
  async function extract(id: string) { setLocalError(""); try { await service.extract(id); } catch { /* Selection remains visible; no other-source fallback. */ } }
  if (uncertain) return <section className="space-y-4"><h2 className="text-2xl font-semibold">先核对保存结果</h2><p>为避免重复，新建已暂停；只核对原编号，不重新创建。</p>{localError && <p role="alert">{localError}</p>}<Button className="min-h-11" onClick={() => void service.recoverSave().then(recipe => { if (recipe && alive.current) onSaved(recipe); }).catch(error => setLocalError(safeFinderError(error).message))}>核对保存结果</Button></section>;
  if ((state.phase === "preview" || saving) && aiState.draft) return <AiPreview draft={aiState.draft} confirmed={aiState.confirmed} onConfirmedChange={value => ai.setConfirmed(value)} source="web" hasExactTitle={title => ai.dependencies.store.hasExactTitle(title)} onSave={async input => { const recipe = await service.save(input); if (alive.current) onSaved(recipe); }} onCancel={() => void service.returnToResults().catch(error => setLocalError(safeFinderError(error).message))}/>;
  const results = state.phase === "results" || state.phase === "extracting";
  return <section className="space-y-5 [&_button]:min-h-11">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">帮我找做法</h2><Button variant="outline" disabled={leaving || state.cancelling} onClick={() => { if (busy) setConfirm(true); else if (results) service.returnToInput(); else void leave(); }}>返回</Button></div>
    <p className="text-sm text-muted-foreground">可选联网功能。点击“开始寻找”会将菜名和偏好发送给千问搜索，可能产生 API 费用；选中做法后再请求整理。结果需人工检查，不会自动保存。</p>
    {!results && <><label className="block space-y-2"><span>想做什么菜</span><Input className="min-h-12" value={state.dish} placeholder="例如：啤酒鸭" disabled={busy} onChange={event => service.updateInput(event.target.value, state.preference)}/></label><label className="block space-y-2"><span>偏好（可选）</span><textarea className="min-h-24 w-full rounded-xl border bg-background p-3" value={state.preference} placeholder="例如：少油、适合新手" disabled={busy} onChange={event => service.updateInput(state.dish, event.target.value)}/></label><p className="text-sm text-muted-foreground">菜名 {Array.from(state.dish.trim()).length}/120 · 偏好 {Array.from(state.preference.trim()).length}/500</p>{state.phase === "searching" ? <p role="status">正在寻找公开做法…</p> : <Button disabled={busy || !searchInputSchema.safeParse({ dish: state.dish, preference: state.preference }).success} onClick={() => void search()}>开始寻找</Button>}</>}
    {results && <section aria-label="找到的做法" className="space-y-4"><h3 className="font-medium">{state.candidates.length ? `找到 ${state.candidates.length} 个做法，请选择` : "暂时没有找到适合整理的公开菜谱。"}</h3><p className="text-sm text-muted-foreground">只显示搜索工具提供的公开来源；不是评分或权威排名。网页暂不可读时，可以换一个来源。</p>{state.candidates.map(candidate => <article key={candidate.id} className="space-y-3 rounded-2xl border p-4"><h4 className="text-lg font-semibold break-words">{candidate.title}</h4><p className="break-all text-sm text-muted-foreground">来源：{candidate.sourceHost}</p><p className="break-words">{candidate.summary}</p>{candidate.highlights.length > 0 && <ul className="list-disc space-y-1 pl-5">{candidate.highlights.map((highlight, index) => <li key={index}>{highlight}</li>)}</ul>}{candidate.totalMinutes !== null && <p>来源耗时：{candidate.totalMinutes} 分钟</p>}{candidate.preparationHint && <p>来源提前准备：{candidate.preparationHint}</p>}<Button disabled={busy} onClick={() => void extract(candidate.id)}>按这个做法整理</Button></article>)}{state.phase === "extracting" && <p role="status">正在读取选中的来源并整理…</p>}<Button variant="outline" disabled={busy} onClick={() => service.returnToInput()}>重新寻找</Button></section>}
    {(state.error || localError) && <p role="alert">{state.error?.message ?? localError}</p>}
    {state.error && ["key_missing", "key_unavailable", "provider_access", "unauthorized", "forbidden"].includes(state.error.code) && <Button variant="outline" disabled={busy} onClick={onConfigureKey}>前往设置 AI 密钥</Button>}
    {busy && <Button variant="outline" disabled={state.cancelling || leaving} onClick={() => void cancel()}>取消请求</Button>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => void leave("ai")}>改用文字 / 截图</Button><Button variant="outline" disabled={busy} onClick={() => void leave("link")}>从网页链接导入</Button><Button variant="outline" disabled={busy} onClick={() => void leave("manual")}>手动录入</Button></div>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogTitle>取消当前请求？</DialogTitle><DialogDescription>取消后保留本轮输入或候选做法，不会自动重试。</DialogDescription><DialogFooter><Button variant="outline" onClick={() => setConfirm(false)}>继续等待</Button><Button disabled={state.cancelling} onClick={() => void cancel()}>取消请求</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
