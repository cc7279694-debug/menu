import type { CookingRecipe, CookingStepIngredient } from "./types";
export {
  formatIngredientAmount,
  formatKitchenQuantity,
  MAX_SERVINGS,
  MIN_SERVINGS,
  isValidTargetServings,
  parseTargetServings,
  scaleQuantity,
} from "@/features/ingredients/quantities";
import {
  formatIngredientAmount,
  scaleQuantity,
} from "@/features/ingredients/quantities";

export function getStepIngredients(recipe: CookingRecipe, stepId: string, targetServings: number): CookingStepIngredient[] {
  const step = recipe.steps.find((candidate) => candidate.id === stepId);
  if (!step) return [];
  const links = new Map(step.ingredientLinks.map((link) => [link.recipeIngredientId, link]));
  return recipe.ingredients.flatMap((ingredient) => {
    const link = links.get(ingredient.id);
    if (!link) return [];
    const amount = link.quantityTextOverride !== null
      ? formatIngredientAmount(null, link.quantityTextOverride, ingredient.unit)
      : link.quantityOverride !== null
        ? formatIngredientAmount(
          scaleQuantity(link.quantityOverride, recipe.baseServings, targetServings),
          null,
          ingredient.unit,
        )
        : formatIngredientAmount(
          ingredient.quantity === null ? null : scaleQuantity(ingredient.quantity, recipe.baseServings, targetServings),
          ingredient.quantityText,
          ingredient.unit,
        );
    return [{ recipeIngredientId: ingredient.id, name: ingredient.name, amount, preparationNote: ingredient.preparationNote, linkNote: link.note }];
  });
}
