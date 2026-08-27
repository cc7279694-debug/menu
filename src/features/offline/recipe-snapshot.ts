import type { RecipeDetail } from "@/features/recipes/types";

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
    dataVersion: 1,
    recipe: {
      ...recipe,
      coverUrl: null,
      coverPath: null,
      ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
      tags: recipe.tags.map((tag) => ({ ...tag })),
      steps: recipe.steps.map((step) => ({ ...step, imageUrl: null, imagePath: null })),
    },
  };
}
