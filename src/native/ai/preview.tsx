import { requiresAiReview, type AiReviewDraft } from "./contract";
import type { RecipeDetailsInput } from "../recipe-model";
import { RecipeEditor } from "../recipe-editor";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { AiReviewPanel, AiReviewConfirmation } from "./review-panel";
import { useV2DialogAppearance } from "../ui-v2/appearance";

export type AiPreviewProps = {
  draft: AiReviewDraft; confirmed: boolean; onConfirmedChange: (value: boolean) => void;
  onSave: (input: RecipeDetailsInput) => Promise<void>; onCancel: () => void;
  hasExactTitle?: (title: string) => Promise<boolean>; source?: "web";
};
export function AiPreview({ draft, confirmed, onConfirmedChange, onSave, onCancel, hasExactTitle, source }: AiPreviewProps) {
  const dialogAppearance = useV2DialogAppearance("v2"), alertRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [duplicate, setDuplicate] = useState(false);
  const decision = useRef<((yes: boolean) => void) | null>(null);
  useEffect(() => () => { decision.current?.(false); decision.current = null; }, []);
  function decide(yes: boolean) { setDuplicate(false); decision.current?.(yes); decision.current = null; }
  useEffect(() => {
    if (!duplicate) return;
    const back = (event: Event) => { event.preventDefault(); decide(false); };
    window.addEventListener("recipio:back", back);
    return () => window.removeEventListener("recipio:back", back);
  }, [duplicate]);
  async function save(input: RecipeDetailsInput) {
    if (hasExactTitle) {
      let same: boolean;
      try { same = await hasExactTitle(input.title.trim()); }
      catch { throw new Error("同名检查未完成，请重试；当前内容尚未保存。"); }
      if (same) {
        const yes = await new Promise<boolean>(resolve => { decision.current = resolve; setDuplicate(true); });
        if (!yes) return;
      }
    }
    await onSave(input);
  }
  function canSave() {
    if (requiresAiReview(draft) && !confirmed) {
      alertRef.current?.focus(); alertRef.current?.scrollIntoView?.({ block: "center" }); return false;
    }
    return true;
  }
  function locate(path: string) {
    const fixed: Record<string, string> = { title: "菜名", totalMinutes: "做菜耗时（分钟）", servings: "约几人份", caloriesPerServing: "每份参考热量（kcal）", notes: "个人备注" };
    let label = fixed[path];
    const row = /^(ingredients|steps|preparations|keyTips)\[(\d+)\]\.(name|amount|instruction|minutes|timingText|stepNumber)$/.exec(path);
    if (row) {
      const index = Number(row[2]) + 1;
      const labels: Record<string, Record<string, string>> = {
        ingredients: { name: `食材 ${index}`, amount: `用量 ${index}` }, steps: { instruction: `步骤 ${index}` },
        preparations: { instruction: `准备事项 ${index}`, minutes: `准备时长 ${index}（分钟）`, timingText: `文字时间 ${index}` },
        keyTips: { instruction: `关键事项 ${index}`, stepNumber: `关联步骤 ${index}（可选）` },
      };
      label = labels[row[1]]?.[row[3]];
    }
    const field = Array.from(rootRef.current?.querySelectorAll("form label") ?? []).find(element => element.querySelector("span")?.textContent === label);
    const add = path === "ingredients" ? "添加食材" : path === "steps" ? "添加步骤" : null;
    const target = field?.querySelector<HTMLElement>("input,textarea") ?? (add ? Array.from(rootRef.current?.querySelectorAll("form button") ?? []).find(button => button.textContent === add) as HTMLElement | undefined : undefined);
    if (!target) return;
    target.focus({ preventScroll: true }); target.scrollIntoView?.({ block: "center" });
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && target.animate) {
      const style = getComputedStyle(target);
      target.animate([{ backgroundColor: style.getPropertyValue("--v2-soft").trim() }, { backgroundColor: style.getPropertyValue("--v2-surface").trim() }], { duration: 800 });
    }
  }
  return <section ref={rootRef} className="v2-import-preview">
    <RecipeEditor appearance="v2" heading="检查整理结果" submitLabel="确认保存菜谱"
      initial={draft.recipe} mediaEnabled={false} submitDisabled={requiresAiReview(draft) && !confirmed}
      beforeFields={<>
        <div className="v2-preview-notes">
          <p>{source === "web" ? "网页只是本轮整理来源，不保存网址、正文或网页图片。" : "截图只是本轮识别来源，保存后不会成为封面或步骤图片。"}结果检查后才会新建普通本地菜谱。</p>
          <p>{draft.recipe.caloriesPerServing === null ? "来源不足以可靠计算热量，保持留空；你可以手动补充。" : `热量为 AI 参考值，约 ${draft.recipe.caloriesPerServing} kcal/份；可修改或留空。`} 仅供日常参考，不是专业营养建议。</p>
        </div>
        <AiReviewPanel draft={draft} confirmed={confirmed} onConfirmedChange={onConfirmedChange} alertRef={alertRef} showConfirmation={false} onLocate={locate} />
      </>}
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
