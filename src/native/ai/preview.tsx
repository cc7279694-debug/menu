import {requiresAiReview,type AiReviewDraft} from "./contract";
import type {RecipeDetailsInput} from "../recipe-model";
import {RecipeEditor} from "../recipe-editor";
import {useEffect,useRef,useState} from "react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogTitle} from "@/components/ui/dialog";
import {AiReviewPanel} from "./review-panel";
export type AiPreviewProps={draft:AiReviewDraft;confirmed:boolean;onConfirmedChange:(value:boolean)=>void;onSave:(input:RecipeDetailsInput)=>Promise<void>;onCancel:()=>void;hasExactTitle?:(title:string)=>Promise<boolean>;source?:"web"};
export function AiPreview({draft,confirmed,onConfirmedChange,onSave,onCancel,hasExactTitle,source}:AiPreviewProps){
  const alertRef=useRef<HTMLDivElement>(null);
  const [duplicate,setDuplicate]=useState(false);
  const decision=useRef<((yes:boolean)=>void)|null>(null);
  useEffect(()=>()=>{decision.current?.(false);decision.current=null;},[]);
  function decide(yes:boolean){setDuplicate(false);decision.current?.(yes);decision.current=null;}
  useEffect(()=>{if(!duplicate)return;const back=(event:Event)=>{event.preventDefault();decide(false);};window.addEventListener("recipio:back",back);return()=>window.removeEventListener("recipio:back",back);},[duplicate]);
  async function save(input:RecipeDetailsInput){
    if(hasExactTitle){let same:boolean;try{same=await hasExactTitle(input.title.trim());}catch{throw new Error("同名检查未完成，请重试；当前内容尚未保存。");}
      if(same){const yes=await new Promise<boolean>(resolve=>{decision.current=resolve;setDuplicate(true);});if(!yes)return;}}
    await onSave(input);
  }
  function canSave(){if(requiresAiReview(draft)&&!confirmed){alertRef.current?.focus();alertRef.current?.scrollIntoView?.({block:"center"});return false;}return true;}
  return <section className="space-y-4 [&_button]:min-h-11 [&_input]:min-h-11"><p className="text-sm text-muted-foreground">{source==="web"?"网页只是本轮整理来源，不保存网址、正文或网页图片。":"截图只是本轮识别来源，保存后不会成为封面或步骤图片。"}结果检查后才会新建普通本地菜谱。</p><p className="text-sm text-muted-foreground">{draft.recipe.caloriesPerServing===null?"来源不足以可靠计算热量，保持留空；你可以手动补充。":`热量为 AI 参考值，约 ${draft.recipe.caloriesPerServing} kcal/份；可修改或留空。`} 仅供日常参考，不是专业营养建议。</p><RecipeEditor heading="检查 AI 整理结果" submitLabel="确认保存菜谱" initial={draft.recipe} mediaEnabled={false} beforeFields={<AiReviewPanel draft={draft} confirmed={confirmed} onConfirmedChange={onConfirmedChange} alertRef={alertRef}/>} beforeSubmit={canSave} onSave={save} onCancel={onCancel}/><Dialog open={duplicate} onOpenChange={open=>{if(!open)decide(false);}}><DialogContent><DialogTitle>已存在同名菜谱</DialogTitle><DialogDescription>当前库已有同名菜谱。继续会新建另一条，不覆盖或合并原菜谱。</DialogDescription><DialogFooter><Button className="min-h-11" variant="outline" onClick={()=>decide(false)}>返回检查</Button><Button className="min-h-11" onClick={()=>decide(true)}>仍然新建菜谱</Button></DialogFooter></DialogContent></Dialog></section>;
}
