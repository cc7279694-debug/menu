import type { RecipeDetail, RecipeSummary } from "@/features/recipes/types";

import type { OfflineRecipeSnapshot } from "./types";

export function toOfflineRecipeSnapshot(
  userId: string,
  recipe: RecipeDetail,
  timestamp: string,
): OfflineRecipeSnapshot {
  return {
    userId,
    recipeId: recipe.id,
    cachedAt: timestamp,
    lastOpenedAt: timestamp,
    dataVersion: 3,
    recipe: {
      ...recipe,
      coverUrl: null,
      coverPath: null,
      ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
      tags: recipe.tags.map((tag) => ({ ...tag })),
      preparations: recipe.preparations.map((preparation) => ({ ...preparation })),
      steps: recipe.steps.map((step) => ({
        ...step,
        imageUrl: null,
        imagePath: null,
        ingredientLinks: step.ingredientLinks.map((link) => ({ ...link })),
      })),
    },
  };
}

export function toOfflineRecipeSummary(snapshot: OfflineRecipeSnapshot): RecipeSummary {
  const { recipe } = snapshot;
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    coverUrl: null,
    baseServings: recipe.baseServings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    isFavorite: recipe.isFavorite,
    category: recipe.category ? { ...recipe.category } : null,
    tags: recipe.tags.map((tag) => ({ ...tag })),
    preparationCount: recipe.preparationCount,
    maxLeadTimeMinutes: recipe.maxLeadTimeMinutes,
    nutrition: recipe.nutrition ? { ...recipe.nutrition } : null,
    updatedAt: recipe.updatedAt,
  };
}
