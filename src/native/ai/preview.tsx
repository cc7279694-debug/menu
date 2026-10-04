import {requiresAiReview,type AiReviewDraft} from "./contract";
import type {RecipeDetailsInput} from "../recipe-model";
import {RecipeEditor} from "../recipe-editor";
import {useRef} from "react";
import {AiReviewPanel} from "./review-panel";
export type AiPreviewProps={draft:AiReviewDraft;confirmed:boolean;onConfirmedChange:(value:boolean)=>void;onSave:(input:RecipeDetailsInput)=>Promise<void>;onCancel:()=>void};
export function AiPreview({draft,confirmed,onConfirmedChange,onSave,onCancel}:AiPreviewProps){
  const alertRef=useRef<HTMLDivElement>(null);
  function canSave(){if(requiresAiReview(draft)&&!confirmed){alertRef.current?.focus();alertRef.current?.scrollIntoView?.({block:"center"});return false;}return true;}
  return <section className="space-y-4 [&_button]:min-h-11 [&_input]:min-h-11"><p className="text-sm text-muted-foreground">截图只是本轮识别来源，保存后不会成为封面或步骤图片。结果检查后才会新建普通本地菜谱。</p><p className="text-sm text-muted-foreground">{draft.recipe.caloriesPerServing===null?"来源不足以可靠计算热量，保持留空；你可以手动补充。":`热量为 AI 参考值，约 ${draft.recipe.caloriesPerServing} kcal/份；可修改或留空。`} 仅供日常参考，不是专业营养建议。</p><RecipeEditor heading="检查 AI 整理结果" submitLabel="确认保存菜谱" initial={draft.recipe} mediaEnabled={false} beforeFields={<AiReviewPanel draft={draft} confirmed={confirmed} onConfirmedChange={onConfirmedChange} alertRef={alertRef}/>} beforeSubmit={canSave} onSave={onSave} onCancel={onCancel}/></section>;
}
