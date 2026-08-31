"use client";

import { Button } from "@/components/ui/button";
import type { RecipeDetail } from "@/features/recipes/types";
import { formatPreparationLeadTime, sortRecipePreparations } from "@/features/recipes/preparation-time";

type PreparationChecklistProps = {
  preparations: RecipeDetail["preparations"];
  completedIds: string[];
  allCompleted: boolean;
  onToggle(preparationId: string): void;
  onConfirm(): void;
  onSkip(): void;
};

export function PreparationChecklist({ preparations, completedIds, allCompleted, onToggle, onConfirm, onSkip }: PreparationChecklistProps) {
  const completed = new Set(completedIds);
  return (
    <section aria-labelledby="preparation-checklist-heading" className="space-y-5 rounded-2xl border bg-card p-5">
      <div>
        <h1 className="text-2xl font-semibold" id="preparation-checklist-heading">开始前请确认</h1>
        <p className="mt-2 text-sm text-muted-foreground">先完成或确认这些提前准备事项，再进入烹饪步骤。</p>
      </div>
      <ul className="space-y-3">
        {sortRecipePreparations(preparations).map((preparation) => (
          <li className="flex items-start gap-3 rounded-xl border p-4" key={preparation.id}>
            <input aria-label={`完成：${preparation.instruction}`} checked={completed.has(preparation.id)} className="mt-1 size-5 accent-primary" onChange={() => onToggle(preparation.id)} type="checkbox" />
            <div className="min-w-0">
              <p className="leading-7">{preparation.ingredientName ? `${preparation.ingredientName} · ` : ""}{preparation.instruction}</p>
              {preparation.leadTimeMinutes !== null && <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">{formatPreparationLeadTime(preparation.leadTimeMinutes, null)}</p>}
              {preparation.timingText && <p className="mt-1 text-sm text-muted-foreground">{preparation.timingText}</p>}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" disabled={!allCompleted} onClick={onConfirm} type="button">准备完成，开始烹饪</Button>
        <Button className="min-h-11" onClick={onSkip} type="button" variant="outline">仍然开始烹饪</Button>
      </div>
    </section>
  );
}
