import type { MealPlanStatus } from "@/features/meal-plans/types";
import type { ShoppingRecipeSelection } from "@/features/shopping/types";

export function aggregateMealPlanShoppingSelections(
  entries: Array<{ recipeId: string; targetServings: number; status: MealPlanStatus }>,
): ShoppingRecipeSelection[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status !== "planned") continue;
    totals.set(entry.recipeId, (totals.get(entry.recipeId) ?? 0) + entry.targetServings);
  }

  return [...totals].map(([recipeId, selectedServings]) => ({ recipeId, selectedServings }));
}
