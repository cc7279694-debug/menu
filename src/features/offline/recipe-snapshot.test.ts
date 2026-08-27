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
  updatedAt: NOW,
  personalNotes: "少油",
  ingredients: [{
    id: "ingredient-a", name: "鸡蛋", quantity: 2, quantityText: null,
    unit: "个", preparationNote: null, sortOrder: 0,
  }],
  steps: [{
    id: "step-a", instruction: "翻炒", imageUrl: "https://example.invalid/step.jpg",
    imagePath: "recipes/step.jpg", timerSeconds: null, sortOrder: 0,
    ingredientLinks: [],
  }],
};

describe("toOfflineRecipeSnapshot", () => {
  it("removes all image references while preserving the recipe data", () => {
    const snapshot = toOfflineRecipeSnapshot(USER_ID, recipe, NOW);

    expect(snapshot.userId).toBe(USER_ID);
    expect(snapshot.recipe.coverUrl).toBeNull();
    expect(snapshot.recipe.coverPath).toBeNull();
    expect(snapshot.recipe.steps[0]).toMatchObject({ imageUrl: null, imagePath: null });
    expect(snapshot.dataVersion).toBe(1);
    expect(snapshot.cachedAt).toBe(NOW);
    expect(snapshot.lastOpenedAt).toBe(NOW);
    expect(snapshot.recipe).not.toBe(recipe);
    expect(snapshot.recipe.steps).not.toBe(recipe.steps);
    expect(recipe.coverUrl).toBe("https://example.invalid/cover.jpg");
  });
});
