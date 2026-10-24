import type {RefObject} from "react";
import {requiresAiReview,type AiReviewDraft} from "./contract";
import { StateBadge } from "../ui-v2/components";
import { Button } from "@/components/ui/button";
export type AiReviewPanelProps={draft:AiReviewDraft;confirmed:boolean;onConfirmedChange:(value:boolean)=>void;alertRef:RefObject<HTMLDivElement|null>;showConfirmation?:boolean;onLocate?:(path:string)=>void};
export function AiReviewConfirmation({draft,confirmed,onConfirmedChange}:Pick<AiReviewPanelProps,"draft"|"confirmed"|"onConfirmedChange">){
  return requiresAiReview(draft)?<div className="v2-review-confirmation"><label><input type="checkbox" checked={confirmed} onChange={event=>onConfirmedChange(event.target.checked)}/><span>我已检查以上 AI 推断和缺失内容</span></label>{!confirmed&&<p>请先检查并确认推断和缺失内容，再保存菜谱。</p>}</div>:null;
}
export function AiReviewPanel({draft,confirmed,onConfirmedChange,alertRef,showConfirmation=true,onLocate}:AiReviewPanelProps){
  const groups=[{status:"explicit",label:"来源明确"},{status:"inferred",label:"AI 推断"},{status:"missing",label:"缺失待确认"}] as const;
  const count=(status:typeof groups[number]["status"])=>draft.review.fieldChecks.filter(field=>field.status===status).length;
  return <div ref={alertRef} role="region" aria-label="AI 整理审核" tabIndex={-1} className="v2-review-panel">
    <h3>保存前检查</h3><p aria-label="审核状态统计" className="v2-review-summary">来源明确 {count("explicit")} · AI 推断 {count("inferred")} · 缺失待确认 {count("missing")}</p>
    <p className="v2-task-note">AI 可能看错或补充内容。来源标签对应本次整理，手动修改不会自动变成“来源明确”。</p>
    {groups.map(group=>{const fields=draft.review.fieldChecks.filter(field=>field.status===group.status);return <details key={group.status} open={group.status!=="explicit"}><summary><StateBadge kind={group.status}>{group.label} {fields.length}</StateBadge></summary>{fields.length?<ul>{fields.map(field=><li key={field.path}><strong>{field.label}</strong>{field.message&&<p>{field.message}</p>}{onLocate&&<Button type="button" className="v2-review-locate" variant="ghost" aria-label={`定位${field.label}`} onClick={()=>onLocate(field.path)}>定位内容</Button>}</li>)}</ul>:<p className="v2-task-note">暂无此类内容。</p>}</details>;})}
    {draft.warnings.length>0&&<ul className="v2-review-warnings">{draft.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>}
    {showConfirmation&&<AiReviewConfirmation draft={draft} confirmed={confirmed} onConfirmedChange={onConfirmedChange}/>}
  </div>;
}
