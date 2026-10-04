import type {RefObject} from "react";
import {requiresAiReview,type AiReviewDraft} from "./contract";
export type AiReviewPanelProps={draft:AiReviewDraft;confirmed:boolean;onConfirmedChange:(value:boolean)=>void;alertRef:RefObject<HTMLDivElement|null>};
export function AiReviewPanel({draft,confirmed,onConfirmedChange,alertRef}:AiReviewPanelProps){
  const groups=[{status:"explicit",label:"来源明确"},{status:"inferred",label:"AI 推断"},{status:"missing",label:"待补充"}] as const;
  return <div ref={alertRef} role="region" aria-label="AI 整理审核" tabIndex={-1} className="space-y-4 rounded-2xl border bg-card p-4 focus:outline focus:outline-2 focus:outline-primary">
    <h3 className="text-lg font-semibold">保存前检查</h3><p className="text-sm text-muted-foreground">AI 可能看错或补充内容。来源标签对应本次整理，手动修改不会自动变成“来源明确”。</p>
    {groups.map(group=>{const fields=draft.review.fieldChecks.filter(field=>field.status===group.status);return <details key={group.status} open={group.status!=="explicit"} className="rounded-xl border p-3"><summary className="min-h-11 cursor-pointer py-3 font-medium">{group.label} {fields.length}</summary>{fields.length?<ul className="space-y-3 pt-2">{fields.map(field=><li key={field.path} className="break-words text-sm"><span className="font-medium">{field.label}</span>{field.message&&<p className="text-muted-foreground">{field.message}</p>}</li>)}</ul>:<p className="text-sm text-muted-foreground">暂无此类内容。</p>}</details>;})}
    {draft.warnings.length>0&&<ul className="space-y-2 text-sm">{draft.warnings.map((warning,index)=><li key={index} className="break-words">{warning}</li>)}</ul>}
    {requiresAiReview(draft)&&<label className="flex min-h-11 items-start gap-3 rounded-xl bg-muted p-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={confirmed} onChange={event=>onConfirmedChange(event.target.checked)}/><span>我已检查推断或缺失内容</span></label>}
  </div>;
}
