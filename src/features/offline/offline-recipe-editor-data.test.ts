import { describe, expect, it } from "vitest";

import type { OfflineRecipeSnapshot } from "./types";
import { buildOfflineEditInput, buildOfflineTaxonomy } from "./offline-recipe-editor-data";

const snapshot: OfflineRecipeSnapshot = {
  userId: "user-a",
  recipeId: "recipe-a",
  cachedAt: "2026-09-05T00:00:00.000Z",
  lastOpenedAt: "2026-09-05T00:00:00.000Z",
  dataVersion: 3,
  recipe: {
    id: "recipe-a",
    title: "番茄炒蛋",
    description: null,
    coverUrl: null,
    coverPath: null,
    baseServings: 2,
    prepMinutes: 5,
    cookMinutes: 8,
    isFavorite: false,
    category: { id: "category-a", name: "家常菜" },
    tags: [{ id: "tag-a", name: "快手" }],
    preparationCount: 0,
    maxLeadTimeMinutes: null,
    updatedAt: "2026-09-05T00:00:00.000Z",
    personalNotes: null,
    ingredients: [{ id: "ingredient-a", name: "鸡蛋", quantity: 2, quantityText: null, unit: "个", preparationNote: null, sortOrder: 0, groupType: "main" }],
    steps: [{ id: "step-a", instruction: "炒熟", imageUrl: null, imagePath: null, timerSeconds: 60, heatLevel: "中火", sortOrder: 0, ingredientLinks: [] }],
    preparations: [],
    nutrition: null,
  },
};

describe("offline recipe editor data", () => {
  it("deduplicates cached categories and tags for offline selectors", () => {
    const second = structuredClone(snapshot);
    second.recipe.id = "recipe-b";
    second.recipe.tags = [{ id: "tag-a", name: "快手" }, { id: "tag-b", name: "早餐" }];

    expect(buildOfflineTaxonomy([snapshot, second])).toEqual({
      categories: [{ id: "category-a", name: "家常菜" }],
      tags: [{ id: "tag-a", name: "快手" }, { id: "tag-b", name: "早餐" }],
    });
  });

  it("restores storage paths from local media metadata without adding URLs", () => {
    const input = buildOfflineEditInput(snapshot, [
      { userId: "user-a", recipeId: "recipe-a", mediaId: "cover", sourceKey: "user-a/recipe-a/cover.webp", mimeType: "image/webp", byteSize: 1, cachedAt: "2026-09-05T00:00:00.000Z", blob: null },
      { userId: "user-a", recipeId: "recipe-a", mediaId: "step:step-a", sourceKey: "user-a/recipe-a/step.webp", mimeType: "image/webp", byteSize: 1, cachedAt: "2026-09-05T00:00:00.000Z", blob: null },
    ]);

    expect(input.coverPath).toBe("user-a/recipe-a/cover.webp");
    expect(input.steps[0]?.imagePath).toBe("user-a/recipe-a/step.webp");
    expect(input.steps[0]).not.toHaveProperty("imageUrl");
  });
});
