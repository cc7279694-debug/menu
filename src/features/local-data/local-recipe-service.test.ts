import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

import { createDexieRecipeRepository } from "./dexie-recipe-repository";
import {
  LOCAL_DEVICE_OWNER_ID,
  localRecipeRecordToOfflineSnapshot,
  recipeSaveInputToLocalWriteInput,
} from "./local-recipe-mapper";
import { createLocalRecipeService } from "./local-recipe-service";
import type { LocalRecipeRecord } from "./types";

const RECIPE_ID = "11111111-1111-4111-8111-111111111111";
const INGREDIENT_ID = "22222222-2222-4222-8222-222222222222";
const STEP_ID = "33333333-3333-4333-8333-333333333333";
const PREPARATION_ID = "44444444-4444-4444-8444-444444444444";
const CATEGORY_ID = "55555555-5555-4555-8555-555555555555";
const TAG_ID = "66666666-6666-4666-8666-666666666666";
const NOW = "2026-09-08T08:00:00.000Z";

const saveInput: RecipeSaveInput = {
  recipeId: RECIPE_ID,
  title: "番茄炒蛋",
  description: "家常快手菜",
  categoryId: CATEGORY_ID,
  tagIds: [TAG_ID],
  coverPath: "local/cover.webp",
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 8,
  personalNotes: "少放盐",
  nutrition: { caloriesKcal: 180, proteinGrams: 12, fatGrams: 10, carbsGrams: 9, isEstimated: true },
  ingredients: [{ recipeIngredientId: INGREDIENT_ID, name: "鸡蛋", quantity: 2, quantityText: null, unit: "个", preparationNote: "打散", groupType: "main", sortOrder: 0 }],
  steps: [{ stepId: STEP_ID, instruction: "炒熟鸡蛋", imagePath: "local/step.webp", timerSeconds: 90, heatLevel: "中火", sortOrder: 0, ingredientLinks: [{ recipeIngredientId: INGREDIENT_ID, quantityOverride: 1, quantityTextOverride: null, note: "先用一半" }] }],
  preparations: [{ preparationId: PREPARATION_ID, recipeIngredientId: INGREDIENT_ID, instruction: "鸡蛋回温", leadTimeMinutes: 15, timingText: null, sortOrder: 0 }],
};

const taxonomy = {
  categories: [{ id: CATEGORY_ID, name: "家常菜" }],
  tags: [{ id: TAG_ID, name: "快手" }],
};

function localRecord(overrides: Partial<LocalRecipeRecord> = {}): LocalRecipeRecord {
  return {
    ...recipeSaveInputToLocalWriteInput(saveInput, taxonomy),
    id: RECIPE_ID,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    isFavorite: true,
    source: {
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      sourceTitle: "原始菜谱",
      sourceAuthor: "作者",
      sourcePlatform: "示例站",
    },
    ...overrides,
  };
}

describe("local recipe mapper", () => {
  it("maps a local record into the existing offline UI shape without remote media", () => {
    const snapshot = localRecipeRecordToOfflineSnapshot(localRecord());

    expect(snapshot).toMatchObject({
      userId: LOCAL_DEVICE_OWNER_ID,
      recipeId: RECIPE_ID,
      cachedAt: NOW,
      lastOpenedAt: NOW,
      recipe: {
        id: RECIPE_ID,
        title: "番茄炒蛋",
        isFavorite: true,
        category: { id: CATEGORY_ID, name: "家常菜" },
        tags: [{ id: TAG_ID, name: "快手" }],
        coverUrl: null,
        coverPath: null,
        source: { sourceUrl: "https://example.com/recipe" },
        ingredients: [{ id: INGREDIENT_ID, groupType: "main" }],
        steps: [{ id: STEP_ID, imagePath: null, imageUrl: null, heatLevel: "中火" }],
        preparations: [{ id: PREPARATION_ID, ingredientName: "鸡蛋" }],
      },
    });
  });

  it("maps editor input to repository input while preserving ids and taxonomy labels", () => {
    const mapped = recipeSaveInputToLocalWriteInput(saveInput, taxonomy);

    expect(mapped).toMatchObject({
      id: RECIPE_ID,
      title: "番茄炒蛋",
      categoryId: CATEGORY_ID,
      categoryName: "家常菜",
      tagIds: [TAG_ID],
      tags: [{ id: TAG_ID, name: "快手" }],
      isFavorite: false,
      ingredients: [{ id: INGREDIENT_ID }],
      steps: [{ id: STEP_ID, imageUrl: null }],
      preparations: [{ id: PREPARATION_ID, ingredientName: "鸡蛋" }],
    });
  });
});

describe("local recipe service", () => {
  beforeEach(async () => {
    await __resetLocalDatabaseForTests();
  });

  it("saves editor input as a timestamped local record", async () => {
    const service = createLocalRecipeService(createDexieRecipeRepository());

    const saved = await service.save(saveInput, taxonomy);

    expect(saved.id).toBe(RECIPE_ID);
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saved.ingredients[0]?.id).toBe(INGREDIENT_ID);
    expect(saved.steps[0]?.id).toBe(STEP_ID);
    expect(saved.preparations[0]?.id).toBe(PREPARATION_ID);
  });

  it("preserves favorite and source metadata when editing a local record", async () => {
    const repository = createDexieRecipeRepository();
    const existing = await repository.save(localRecord());
    const service = createLocalRecipeService(repository);

    const saved = await service.save({ ...saveInput, title: "番茄炒蛋（少油版）" }, taxonomy);

    expect(saved.createdAt).toBe(existing.createdAt);
    expect(saved.isFavorite).toBe(true);
    expect(saved.source).toEqual(existing.source);
  });

  it("filters local records by text, category, tag, and favorite state", async () => {
    const repository = createDexieRecipeRepository();
    const service = createLocalRecipeService(repository);
    await repository.save(localRecord());
    await repository.save(localRecord({
      id: "77777777-7777-4777-8777-777777777777",
      title: "清炒时蔬",
      description: null,
      categoryId: null,
      categoryName: null,
      tagIds: [],
      tags: [],
      isFavorite: false,
    }));

    await expect(service.list({ query: "快手" })).resolves.toHaveLength(1);
    await expect(service.list({ categoryId: CATEGORY_ID })).resolves.toHaveLength(1);
    await expect(service.list({ tagId: TAG_ID })).resolves.toHaveLength(1);
    await expect(service.list({ favoriteOnly: true })).resolves.toHaveLength(1);
  });
});
