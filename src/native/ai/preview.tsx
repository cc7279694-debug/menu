import { requiresAiReview, type AiReviewDraft } from "./contract";
import type { RecipeDetailsInput } from "../recipe-model";
import { RecipeEditor } from "../recipe-editor";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { AiReviewPanel, AiReviewConfirmation } from "./review-panel";
import { useV2DialogAppearance } from "../ui-v2/appearance";
import { buildIntakeQualityReport } from "../intake-review/quality";
import { IntakeQualityPanel } from "../intake-review/review-panel";
import type { IntakeSourceContext } from "../intake-review/source-context";
import { useIntakeEditingSession, type IntakeEditingSession } from "../intake-review/editor-session";

export type AiPreviewProps = {
  draft: AiReviewDraft; confirmed: boolean; onConfirmedChange: (value: boolean) => void;
  onSave: (input: RecipeDetailsInput) => Promise<void>; onCancel: () => void;
  hasExactTitle?: (title: string) => Promise<boolean>; source?: "web";
  sourceContext?: IntakeSourceContext | null; isCurrent?: () => boolean;
  editingSession?: IntakeEditingSession | null;
};
export function AiPreview({ draft, confirmed, onConfirmedChange, onSave, onCancel, hasExactTitle, source, sourceContext, isCurrent, editingSession }: AiPreviewProps) {
  const ownSession = useIntakeEditingSession(editingSession ? null : draft.review, draft.recipe);
  const session = editingSession ?? ownSession!;
  const editorKey = useRef({ identity: session.identity, sequence: 0 });
  if (editorKey.current.identity !== session.identity) editorKey.current = { identity: session.identity, sequence: editorKey.current.sequence + 1 };
  const dialogAppearance = useV2DialogAppearance("v2"), alertRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true), current = useRef({ identity: session.identity, isCurrent });
  current.current = { identity: session.identity, isCurrent };
  const [duplicateIdentity, setDuplicateIdentity] = useState<object | null>(null);
  const decision = useRef<{ identity: object; resolve: (yes: boolean) => void } | null>(null);
  function valid() {
    try { return alive.current && current.current.identity === session.identity && (current.current.isCurrent?.() ?? true); }
    catch { return false; }
  }
  function decide(yes: boolean) {
    const pending = decision.current;
    decision.current = null;
    setDuplicateIdentity(null);
    pending?.resolve(yes && pending.identity === session.identity && valid());
  }
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; decision.current?.resolve(false); decision.current = null; };
  }, []);
  const duplicate = duplicateIdentity === session.identity && valid();
  useEffect(() => {
    if (duplicateIdentity && !duplicate) { decision.current?.resolve(false); decision.current = null; setDuplicateIdentity(null); }
  }, [duplicateIdentity, duplicate]);
  useEffect(() => {
    if (!duplicate) return;
    const back = (event: Event) => { if (event.defaultPrevented) return; event.preventDefault(); decide(false); };
    window.addEventListener("recipio:back", back, true);
    return () => window.removeEventListener("recipio:back", back, true);
  });
  async function save(input: RecipeDetailsInput) {
    if (!valid()) return;
    if (hasExactTitle) {
      let same: boolean;
      try { same = await hasExactTitle(input.title.trim()); }
      catch { if (!valid()) return; throw new Error("同名检查未完成，请重试；当前内容尚未保存。"); }
      if (!valid()) return;
      if (same) {
        const yes = await new Promise<boolean>(resolve => { decision.current = { identity: session.identity, resolve }; setDuplicateIdentity(session.identity); });
        if (!yes || !valid()) return;
      }
    }
    if (valid()) await onSave(input);
  }
  function canSave() {
    if (!valid()) return false;
    if (requiresAiReview(draft) && !confirmed) {
      alertRef.current?.focus(); alertRef.current?.scrollIntoView?.({ block: "center" }); return false;
    }
    return true;
  }
  return <section className="v2-import-preview">
    <RecipeEditor key={editorKey.current.sequence} appearance="v2" heading="检查整理结果" submitLabel="确认保存菜谱"
      initial={draft.recipe} editingSession={session} mediaEnabled={false} submitDisabled={requiresAiReview(draft) && !confirmed}
      onActualChange={() => { if (valid() && confirmed && requiresAiReview(draft)) onConfirmedChange(false); }}
      renderIntake={({ currentRecipe, fieldBindings, locate }) => {
        const report = buildIntakeQualityReport({ currentRecipe, originalRecipe: session.originalRecipe, originalFieldChecks: draft.review.fieldChecks, warnings: draft.warnings, fieldBindings, mode: "ai" });
        return <>
          <IntakeQualityPanel report={report} locate={locate} source={sourceContext} external showWarnings={false} />
          <div className="v2-preview-notes">
            <p>{source === "web" ? "网页只是本轮整理来源，不保存网址、正文或网页图片。" : "截图只是本轮识别来源，保存后不会成为封面或步骤图片。"}结果检查后才会新建普通本地菜谱。</p>
            <p>{currentRecipe.caloriesPerServing === null ? "来源不足以可靠计算热量，保持留空；你可以手动补充。" : `热量为 AI 参考值，约 ${currentRecipe.caloriesPerServing} kcal/份；可修改或留空。`} 仅供日常参考，不是专业营养建议。</p>
          </div>
          <AiReviewPanel draft={draft} confirmed={confirmed} onConfirmedChange={onConfirmedChange} alertRef={alertRef} showConfirmation={false} onLocate={locate} currentEvidence={report.originalChecks} compact />
        </>;
      }}
      beforeSave={<AiReviewConfirmation draft={draft} confirmed={confirmed} onConfirmedChange={onConfirmedChange} />}
      beforeSubmit={canSave} onSave={save} onCancel={onCancel} />
    <Dialog open={duplicate} onOpenChange={open => { if (!open) decide(false); }}>
      <DialogContent {...dialogAppearance}>
        <DialogTitle>已存在同名菜谱</DialogTitle>
        <DialogDescription>当前库已有同名菜谱。继续会新建另一条，不覆盖或合并原菜谱。</DialogDescription>
        <DialogFooter>
          <Button autoFocus variant="outline" onClick={() => decide(false)}>返回检查</Button>
          <Button onClick={() => decide(true)}>仍然新建菜谱</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
