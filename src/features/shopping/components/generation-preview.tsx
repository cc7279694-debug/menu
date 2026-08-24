"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatIngredientAmount } from "@/features/ingredients/quantities";
import type { ShoppingDraftItem } from "@/features/shopping/types";

type GenerationPreviewProps = {
  items: ShoppingDraftItem[];
  excludedRecipeIngredientIds: ReadonlySet<string>;
  isGenerating: boolean;
  statusMessage: string | null;
  onBack: () => void;
  onGenerate: () => void;
  onToggleExcluded: (recipeIngredientId: string) => void;
};

export function GenerationPreview({
  items,
  excludedRecipeIngredientIds,
  isGenerating,
  statusMessage,
  onBack,
  onGenerate,
  onToggleExcluded,
}: GenerationPreviewProps) {
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      {statusMessage && (
        <p aria-live="polite" className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
          {statusMessage}
        </p>
      )}

      {!hasItems && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          请至少保留一项需要购买的食材。
        </p>
      )}

      <ul aria-label="购物清单预览" className="space-y-3">
        {items.map((item) => {
          const amount = formatIngredientAmount(item.quantity, item.quantityText, item.unit);
          return (
            <li
              aria-label={`${item.nameSnapshot} ${amount}`}
              className="rounded-lg border bg-background p-3"
              key={`${item.sortOrder}-${item.nameSnapshot}-${item.sources.map((source) => source.recipeIngredientId).join("-")}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{item.nameSnapshot}</h3>
                    {item.sources.length === 1 && <Badge variant="outline">单独计算</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {amount}
                  </p>
                </div>
                <Badge variant="secondary">{item.aisle ?? "未分类"}</Badge>
              </div>

              <div className="mt-3 space-y-2">
                {item.sources.map((source) => {
                  const sourceId = source.recipeIngredientId ?? `${source.recipeId}-${source.recipeIngredientOrder}`;
                  return (
                    <div className="flex min-w-0 items-start gap-3 rounded-md bg-muted/40 p-2" key={sourceId}>
                      <Checkbox
                        checked={source.recipeIngredientId ? excludedRecipeIngredientIds.has(source.recipeIngredientId) : false}
                        disabled={!source.recipeIngredientId || isGenerating}
                        id={`shopping-exclude-${sourceId}`}
                        onCheckedChange={() => {
                          if (source.recipeIngredientId) onToggleExcluded(source.recipeIngredientId);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Label className="leading-5" htmlFor={`shopping-exclude-${sourceId}`}>
                          家里已有，不购买
                        </Label>
                        <p className="mt-1 text-sm">{source.recipeTitleSnapshot}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatIngredientAmount(
                            source.quantityContribution,
                            source.quantityTextContribution,
                            source.unitSnapshot,
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button className="min-h-11" disabled={isGenerating} onClick={onBack} type="button" variant="outline">
          返回选择
        </Button>
        <Button className="min-h-11" disabled={!hasItems || isGenerating} onClick={onGenerate} type="button">
          {isGenerating ? "生成中..." : "生成清单"}
        </Button>
      </div>
    </div>
  );
}
