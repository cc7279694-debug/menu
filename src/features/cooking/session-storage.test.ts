import { describe, expect, it } from "vitest";

import {
  clearCookingSession,
  cookingSessionKey,
  createCookingSession,
  loadCookingSession,
  saveCookingSession,
} from "./session-storage";
import type { CookingRecipe } from "./types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const recipe: CookingRecipe = {
  id: "recipe-1",
  updatedAt: "2026-08-23T12:00:00.000Z",
  baseServings: 2,
  ingredients: [],
  steps: [
    { id: "step-2", sortOrder: 2, ingredientLinks: [] },
    { id: "step-1", sortOrder: 1, ingredientLinks: [] },
  ],
};

function storageWith(value: unknown): Storage {
  const storage = new MemoryStorage();
  storage.setItem(cookingSessionKey(recipe.id!), typeof value === "string" ? value : JSON.stringify(value));
  return storage;
}

describe("versioned cooking session storage", () => {
  it("creates a version 1 session at the first sorted step", () => {
    expect(createCookingSession(recipe, 4, 1_000)).toEqual({
      version: 1,
      recipeId: "recipe-1",
      recipeUpdatedAt: recipe.updatedAt,
      targetServings: 4,
      currentStepId: "step-1",
      timers: [],
      startedAt: 1_000,
      updatedAt: 1_000,
    });
  });

  it("uses the recipe base servings when requested servings are out of range", () => {
    expect(createCookingSession(recipe, 0, 1_000).targetServings).toBe(2);
    expect(createCookingSession(recipe, Infinity, 1_000).targetServings).toBe(2);
  });

  it("round-trips and clears a valid session", () => {
    const storage = new MemoryStorage();
    const session = createCookingSession(recipe, 4, 1_000);
    expect(saveCookingSession(storage, session)).toBe(true);
    expect(loadCookingSession(storage, recipe)).toEqual(session);
    clearCookingSession(storage, recipe.id!);
    expect(loadCookingSession(storage, recipe)).toBeNull();
  });

  it.each([
    ["not-json", "corrupt JSON"],
    [{ version: 2 }, "wrong version"],
  ] as const)("rejects %s (%s)", (...values: [string | { version: number }, string]) => {
    const value = values[0];
    expect(loadCookingSession(storageWith(value), recipe)).toBeNull();
  });

  it("rejects sessions for another recipe, an old recipe, or a missing step", () => {
    const session = createCookingSession(recipe, 2, 1_000);
    expect(loadCookingSession(storageWith({ ...session, recipeId: "other" }), recipe)).toBeNull();
    expect(loadCookingSession(storageWith({ ...session, recipeUpdatedAt: "old" }), recipe)).toBeNull();
    expect(loadCookingSession(storageWith({ ...session, currentStepId: "missing" }), recipe)).toBeNull();
  });

  it("rejects invalid servings and non-finite timer values", () => {
    const session = createCookingSession(recipe, 2, 1_000);
    expect(loadCookingSession(storageWith({ ...session, targetServings: 1001 }), recipe)).toBeNull();
    expect(loadCookingSession(storageWith({ ...session, timers: [{ stepId: "step-1", label: "煮沸", durationSeconds: Infinity, startedAt: 1_000, endsAt: 2_000, notifiedAt: null }] }), recipe)).toBeNull();
  });

  it("returns false when storage access fails", () => {
    const storage = { setItem() { throw new Error("blocked"); } } as unknown as Storage;
    expect(saveCookingSession(storage, createCookingSession(recipe, 2, 1_000))).toBe(false);
  });
});
