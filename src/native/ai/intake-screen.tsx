import type { AiIntakeService } from "./service";
import { useEffect,useRef,useState,useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogDescription,DialogFooter,DialogTitle } from "@/components/ui/dialog";
import { AI_LIMITS } from "./contract";
import { safeAiError } from "./native-bridge";
export function AiIntakeScreen({service,onPreview,onCancel,onConfigureKey,onManual}:{service:AiIntakeService;onPreview:()=>void;onCancel:()=>void;onConfigureKey:()=>void;onManual?:()=>void}){
  const state=useSyncExternalStore(service.subscribe,service.snapshot,service.snapshot);
  const [configured,setConfigured]=useState<boolean|null>(null),[localError,setLocalError]=useState(""),[confirm,setConfirm]=useState(false),[discarding,setDiscarding]=useState(false);
  const alive=useRef(true);
  const destination=useRef<"back"|"manual">("back");
  useEffect(()=>{alive.current=true;let current=true;void service.startSession().then(()=>service.refreshKey()).then(value=>{if(current)setConfigured(value);}).catch(e=>{if(current){const safe=safeAiError(e);setLocalError(safe.message);if(safe.code==="key_unavailable")setConfigured(false);}});return()=>{current=false;alive.current=false;};},[service]);
  useEffect(()=>{const back=(event:Event)=>{event.preventDefault();setConfirm(true);};window.addEventListener("recipio:back",back);return()=>window.removeEventListener("recipio:back",back);},[]);
  async function send(){try{await service.organize(state.input);if(alive.current)onPreview();}catch{/* Safe service error remains visible; no automatic retry. */}}
  async function discard(){if(discarding)return;setDiscarding(true);try{await service.discard();if(alive.current){if(destination.current==="manual"&&onManual)onManual();else onCancel();}}catch(e){if(alive.current){setLocalError(safeAiError(e).message);setDiscarding(false);setConfirm(false);}}}
  const busy=state.phase==="requesting"||discarding;
  const count=Array.from(state.input.text.trim()).length;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">AI 整理菜谱</h2><Button variant="outline" className="min-h-11" disabled={discarding} onClick={()=>{destination.current="back";setConfirm(true);}}>返回</Button></div>
    <p className="text-sm text-muted-foreground">可选联网功能。仅在点击整理后，将本轮文字与选中的截图发送给阿里云百炼，可能产生 API 费用。AI 结果需要人工检查，不会自动保存。</p>
    <label className="block space-y-2"><span>菜谱文字</span><textarea className="min-h-48 w-full rounded-xl border bg-background p-3" value={state.input.text} disabled={busy} onChange={e=>service.updateInput({...state.input,text:e.target.value})}/></label>
    <p className="text-sm text-muted-foreground">{count} / {AI_LIMITS.textCodePoints} 字符；支持口语、换行和 Emoji。</p>
    {configured===false&&<Button className="min-h-11" variant="outline" disabled={busy} onClick={onConfigureKey}>前往设置 AI 密钥</Button>}
    {(state.error||localError)&&<p role="alert">{state.error?.message??localError}</p>}
    {(state.error||localError)&&onManual&&<Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>{destination.current="manual";setConfirm(true);}}>改为手动录入</Button>}
    {state.phase==="requesting"?<div className="space-y-3"><p role="status">正在整理，仍可取消或返回…</p><Button className="min-h-11" variant="outline" onClick={()=>void service.cancelRequest().catch(e=>setLocalError(safeAiError(e).message))}>取消请求</Button></div>:<Button className="min-h-11" disabled={!state.operationId||configured!==true||!state.input.text.trim()&&!state.input.imageIds.length||count>AI_LIMITS.textCodePoints} onClick={()=>void send()}>{state.phase==="error"?"重试 AI 整理":"开始 AI 整理"}</Button>}
    <Dialog open={confirm} onOpenChange={value=>{if(!discarding)setConfirm(value);}}><DialogContent showCloseButton={!discarding}><DialogTitle>放弃本轮整理？</DialogTitle><DialogDescription>将取消在途请求并清理本轮临时截图，已有本地菜谱不受影响。</DialogDescription><DialogFooter><Button className="min-h-11" variant="outline" disabled={discarding} onClick={()=>setConfirm(false)}>继续整理</Button><Button className="min-h-11" disabled={discarding} onClick={()=>void discard()}>放弃本轮整理</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
