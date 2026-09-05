import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { __resetOfflineDatabaseForTests } from "@/features/offline/database";
import { getLocalDatabase } from "@/features/offline/local-db";
import {
  cookingSessionKey,
  createCookingSession,
} from "./session-storage";
import {
  deleteCookingSession,
  getCookingSession,
  migrateLegacyCookingSession,
  putCookingSession,
} from "./cooking-session-repository";
import type { CookingSessionRecipe } from "./types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const recipe: CookingSessionRecipe = {
  id: "recipe-1",
  updatedAt: "2026-08-23T12:00:00.000Z",
  baseServings: 2,
  ingredients: [],
  preparations: [{ id: "prep-1" }],
  steps: [
    { id: "step-1", sortOrder: 1, ingredientLinks: [] },
    { id: "step-2", sortOrder: 2, ingredientLinks: [] },
  ],
};

beforeEach(async () => {
  await __resetOfflineDatabaseForTests();
});

describe("cooking session repository", () => {
  it("stores sessions by user and recipe", async () => {
    const session = createCookingSession(recipe, 4, 1_000);

    await putCookingSession("user-a", session);

    await expect(getCookingSession("user-a", recipe)).resolves.toEqual(session);
    await expect(getCookingSession("user-b", recipe)).resolves.toBeNull();
  });

  it("drops a session when the cached recipe version is no longer compatible", async () => {
    await putCookingSession("user-a", createCookingSession(recipe, 2, 1_000));
    const changedRecipe = { ...recipe, updatedAt: "2026-08-24T12:00:00.000Z" };

    await expect(getCookingSession("user-a", changedRecipe)).resolves.toBeNull();
    await expect((await getLocalDatabase()).cookingSessions.get(["user-a", recipe.id])).resolves.toBeUndefined();
  });

  it("deletes a completed session without affecting another user", async () => {
    await putCookingSession("user-a", createCookingSession(recipe, 2, 1_000));
    await putCookingSession("user-b", createCookingSession(recipe, 3, 1_000));

    await deleteCookingSession("user-a", recipe.id);

    await expect(getCookingSession("user-a", recipe)).resolves.toBeNull();
    await expect(getCookingSession("user-b", recipe)).resolves.toMatchObject({ targetServings: 3 });
  });

  it("migrates a valid legacy localStorage session only after Dexie accepts it", async () => {
    const storage = new MemoryStorage();
    const session = createCookingSession(recipe, 5, 1_000);
    storage.setItem(cookingSessionKey(recipe.id), JSON.stringify(session));

    await expect(migrateLegacyCookingSession("user-a", recipe, storage)).resolves.toEqual(session);
    expect(storage.getItem(cookingSessionKey(recipe.id))).toBeNull();
    await expect(getCookingSession("user-a", recipe)).resolves.toEqual(session);
  });

  it("does not migrate malformed legacy data", async () => {
    const storage = new MemoryStorage();
    storage.setItem(cookingSessionKey(recipe.id), "not-json");

    await expect(migrateLegacyCookingSession("user-a", recipe, storage)).resolves.toBeNull();
    expect(storage.getItem(cookingSessionKey(recipe.id))).toBe("not-json");
  });
});
