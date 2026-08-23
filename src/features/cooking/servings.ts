import type { CookingRecipe, CookingStepIngredient } from "./types";

export const MIN_SERVINGS = 0.25;
export const MAX_SERVINGS = 1000;

export function parseTargetServings(value: string | number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value.trim());
  return Number.isFinite(parsed) && parsed >= MIN_SERVINGS && parsed <= MAX_SERVINGS ? parsed : fallback;
}

export function scaleQuantity(quantity: number, baseServings: number, targetServings: number): number {
  if (!Number.isFinite(quantity) || baseServings <= 0 || targetServings <= 0) return quantity;
  return quantity * (targetServings / baseServings);
}

const KITCHEN_FRACTIONS = [
  [1, 8, "1/8"], [1, 4, "1/4"], [1, 3, "1/3"], [3, 8, "3/8"],
  [1, 2, "1/2"], [5, 8, "5/8"], [2, 3, "2/3"], [3, 4, "3/4"], [7, 8, "7/8"],
] as const;

export function formatKitchenQuantity(quantity: number): string {
  if (!Number.isFinite(quantity)) return "";
  const rounded = Math.round(quantity * 100) / 100;
  const whole = Math.floor(quantity);
  const fraction = quantity - whole;
  const canonicalFraction = Number(fraction.toFixed(6));
  const match = KITCHEN_FRACTIONS.find(([numerator, denominator]) =>
    canonicalFraction === Number((numerator / denominator).toFixed(6)));
  if (match) return whole > 0 ? `${whole} ${match[2]}` : match[2];
  return String(Number(rounded.toFixed(2)));
}

export function formatIngredientAmount(quantity: number | null, quantityText: string | null, unit: string | null): string {
  const value = quantityText ?? (quantity !== null && Number.isFinite(quantity) ? formatKitchenQuantity(quantity) : "适量");
  return [value, unit].filter(Boolean).join(" ");
}

export function getStepIngredients(recipe: CookingRecipe, stepId: string, targetServings: number): CookingStepIngredient[] {
  const step = recipe.steps.find((candidate) => candidate.id === stepId);
  if (!step) return [];
  const links = new Map(step.ingredientLinks.map((link) => [link.recipeIngredientId, link]));
  return recipe.ingredients.flatMap((ingredient) => {
    const link = links.get(ingredient.id);
    if (!link) return [];
    const amount = link.quantityTextOverride !== null
      ? formatIngredientAmount(null, link.quantityTextOverride, ingredient.unit)
      : formatIngredientAmount(
        link.quantityOverride !== null
          ? scaleQuantity(link.quantityOverride, recipe.baseServings, targetServings)
          : ingredient.quantity === null ? null : scaleQuantity(ingredient.quantity, recipe.baseServings, targetServings),
        ingredient.quantityText,
        ingredient.unit,
      );
    return [{ recipeIngredientId: ingredient.id, name: ingredient.name, amount, preparationNote: ingredient.preparationNote, linkNote: link.note }];
  });
}
