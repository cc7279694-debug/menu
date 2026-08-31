import type { RecipeSaveInput } from "@/features/recipes/schemas";
import type { RecipeDetail } from "@/features/recipes/types";

export function recipeDetailToSaveInput(detail: RecipeDetail): RecipeSaveInput {
  return {
    recipeId: detail.id,
    title: detail.title,
    description: detail.description,
    categoryId: detail.category?.id ?? null,
    tagIds: detail.tags.map((tag) => tag.id),
    coverPath: detail.coverPath,
    baseServings: detail.baseServings,
    prepMinutes: detail.prepMinutes,
    cookMinutes: detail.cookMinutes,
    personalNotes: detail.personalNotes,
    ingredients: detail.ingredients.map((ingredient) => ({
      recipeIngredientId: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      quantityText: ingredient.quantityText,
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
      groupType: ingredient.groupType,
      sortOrder: ingredient.sortOrder,
    })),
    steps: detail.steps.map((step) => ({
      stepId: step.id,
      instruction: step.instruction,
      imagePath: step.imagePath,
      timerSeconds: step.timerSeconds,
      heatLevel: step.heatLevel,
      sortOrder: step.sortOrder,
      ingredientLinks: step.ingredientLinks,
    })),
    preparations: detail.preparations.map((preparation) => ({
      preparationId: preparation.id,
      recipeIngredientId: preparation.recipeIngredientId,
      instruction: preparation.instruction,
      leadTimeMinutes: preparation.leadTimeMinutes,
      timingText: preparation.timingText,
      sortOrder: preparation.sortOrder,
    })),
  };
}
