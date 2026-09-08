import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";

import { createDexieRecipeRepository } from "./dexie-recipe-repository";

function recipeInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "番茄炒蛋",
    description: "家常做法",
    categoryId: null,
    tagIds: [],
    coverPath: null,
    baseServings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    personalNotes: null,
    nutrition: null,
    ingredients: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "番茄",
        quantity: 2,
        quantityText: null,
        unit: "个",
        preparationNote: null,
        groupType: "main" as const,
        sortOrder: 0,
      },
    ],
    steps: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        instruction: "番茄切块。",
        imagePath: null,
        imageUrl: null,
        timerSeconds: null,
        sortOrder: 0,
        ingredientLinks: [],
      },
    ],
    preparations: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        recipeIngredientId: "11111111-1111-4111-8111-111111111111",
        ingredientName: "番茄",
        instruction: "清洗并切块",
        leadTimeMinutes: 30,
        timingText: null,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

describe("Dexie recipe repository", () => {
  beforeEach(async () => {
    await __resetLocalDatabaseForTests();
  });

  it("persists a saved record across repository instances", async () => {
    const repository = createDexieRecipeRepository();
    const saved = await repository.save(recipeInput({ id: "44444444-4444-4444-8444-444444444444" }));

    const reopened = await createDexieRecipeRepository().get(saved.id);

    expect(reopened).toEqual(saved);
  });

  it("excludes soft-deleted records unless deleted records are requested", async () => {
    const repository = createDexieRecipeRepository();
    const saved = await repository.save(recipeInput({ id: "55555555-5555-4555-8555-555555555555" }));

    await repository.moveToTrash(saved.id);

    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.list({ includeDeleted: true })).resolves.toEqual([
      expect.objectContaining({
        id: saved.id,
        deletedAt: expect.any(String),
      }),
    ]);
  });

  it("generates an id and timestamps when saving without an id", async () => {
    const repository = createDexieRecipeRepository();
    const saved = await repository.save(recipeInput());

    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(saved.deletedAt).toBeNull();
  });

  it("restores a trashed record back into the active list", async () => {
    const repository = createDexieRecipeRepository();
    const saved = await repository.save(recipeInput({ id: "66666666-6666-4666-8666-666666666666" }));

    await repository.moveToTrash(saved.id);
    await repository.restore(saved.id);

    await expect(repository.list()).resolves.toHaveLength(1);
    await expect(repository.get(saved.id)).resolves.toEqual(
      expect.objectContaining({
        id: saved.id,
        deletedAt: null,
      }),
    );
  });

  it("permanently deletes a record", async () => {
    const repository = createDexieRecipeRepository();
    const saved = await repository.save(recipeInput({ id: "77777777-7777-4777-8777-777777777777" }));

    await repository.permanentlyDelete(saved.id);

    await expect(repository.get(saved.id)).resolves.toBeNull();
    await expect(repository.list({ includeDeleted: true })).resolves.toEqual([]);
  });
});
