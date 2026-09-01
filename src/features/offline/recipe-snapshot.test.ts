import { describe, expect, it } from "vitest";

import type { RecipeDetail } from "@/features/recipes/types";

import { toOfflineRecipeSnapshot } from "./recipe-snapshot";

const USER_ID = "user-a";
const NOW = "2026-08-27T00:00:00.000Z";

const recipe: RecipeDetail = {
  id: "recipe-a",
  title: "番茄炒蛋",
  description: "家常菜",
  coverUrl: "https://example.invalid/cover.jpg",
  coverPath: "recipes/cover.jpg",
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  isFavorite: true,
  category: { id: "cat-a", name: "快手菜" },
  tags: [{ id: "tag-a", name: "家常" }],
  preparationCount: 0,
  maxLeadTimeMinutes: null,
  nutrition: { caloriesKcal: 320, proteinGrams: 28, fatGrams: null, carbsGrams: null, isEstimated: true },
  updatedAt: NOW,
  personalNotes: "少油",
  ingredients: [{
    id: "ingredient-a", name: "鸡蛋", quantity: 2, quantityText: null,
    unit: "个", preparationNote: null, sortOrder: 0,
  }],
  steps: [{
    id: "step-a", instruction: "翻炒", imageUrl: "https://example.invalid/step.jpg",
    imagePath: "recipes/step.jpg", timerSeconds: null, sortOrder: 0,
    ingredientLinks: [{
      recipeIngredientId: "ingredient-a", quantityOverride: null,
      quantityTextOverride: null, note: "切碎",
    }],
  }],
  preparations: [{ id: "prep-a", recipeIngredientId: "ingredient-a", ingredientName: "鸡蛋", instruction: "提前腌制", leadTimeMinutes: 240, timingText: null, sortOrder: 0 }],
};

describe("toOfflineRecipeSnapshot", () => {
  it("removes all image references while preserving the recipe data", () => {
    const snapshot = toOfflineRecipeSnapshot(USER_ID, recipe, NOW);

    expect(snapshot.userId).toBe(USER_ID);
    expect(snapshot.recipe.coverUrl).toBeNull();
    expect(snapshot.recipe.coverPath).toBeNull();
    expect(snapshot.recipe.steps[0]).toMatchObject({ imageUrl: null, imagePath: null });
    snapshot.recipe.steps[0].ingredientLinks[0].note = "已修改";
    expect(recipe.steps[0].ingredientLinks[0].note).toBe("切碎");
    expect(snapshot.dataVersion).toBe(3);
    expect(snapshot.recipe.nutrition).toMatchObject({ caloriesKcal: 320, proteinGrams: 28 });
    expect(snapshot.recipe.preparations).toEqual(recipe.preparations);
    snapshot.recipe.preparations[0].instruction = "已修改";
    expect(recipe.preparations[0].instruction).toBe("提前腌制");
    expect(snapshot.cachedAt).toBe(NOW);
    expect(snapshot.lastOpenedAt).toBe(NOW);
    expect(snapshot.recipe).not.toBe(recipe);
    expect(snapshot.recipe.steps).not.toBe(recipe.steps);
    expect(recipe.coverUrl).toBe("https://example.invalid/cover.jpg");
  });
});
