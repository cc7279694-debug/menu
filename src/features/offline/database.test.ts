import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineRecipeSnapshot, OfflineShoppingSnapshot } from "./types";
import {
  clearOfflineData,
  __resetOfflineDatabaseForTests,
  deleteRecipeMutationIfCurrent,
  deleteShoppingToggleIfCurrent,
  deleteRecipeSnapshot,
  getLastOfflineProfile,
  getRecipeSnapshot,
  getShoppingSnapshot,
  listRecipeMutationQueue,
  listRecipeSummaryPage,
  listRecipeSnapshots,
  listShoppingToggleQueue,
  markShoppingToggleAttemptFailed,
  markRecipeMutationAttemptFailed,
  putRecipeSnapshot,
  putRecipeSummaryPage,
  queueRecipeMutation,
  putShoppingSnapshot,
  queueShoppingToggle,
  rememberOfflineProfile,
  updateRecipeSummaryCache,
} from "./database";

const baseRecipe = (id: string, lastOpenedAt: string): OfflineRecipeSnapshot => ({
  userId: "user-a", recipeId: id, cachedAt: lastOpenedAt, lastOpenedAt,
  dataVersion: 3,
  recipe: {
    id, title: id, description: null, coverUrl: null, coverPath: null,
    baseServings: 1, prepMinutes: null, cookMinutes: null, isFavorite: false,
    category: null, tags: [], updatedAt: lastOpenedAt, personalNotes: null,
    preparationCount: 0, maxLeadTimeMinutes: null, ingredients: [], steps: [], preparations: [],
  },
});

const shoppingSnapshot: OfflineShoppingSnapshot = {
  userId: "user-a", listId: "list-a", cachedAt: "2026-08-27T00:00:00.000Z",
  serverUpdatedAt: "2026-08-27T00:00:00.000Z", dataVersion: 1,
  list: {
    id: "list-a", name: "本周采购", updatedAt: "2026-08-27T00:00:00.000Z",
    sources: [], items: [{
      id: "item-a", ingredientId: null, nameSnapshot: "鸡蛋", quantity: 2,
      quantityText: null, unit: "个", aisle: null, isChecked: false,
      isManual: false, sortOrder: 0, sources: [],
    }],
  },
};

describe("offline database", () => {
  beforeEach(async () => {
    await clearOfflineData();
  });

  it("remembers the most recently authenticated profile and caps recipes at ten", async () => {
    await rememberOfflineProfile("user-a", "2026-08-27T00:00:00.000Z");
    expect(await getLastOfflineProfile()).toMatchObject({ userId: "user-a" });

    for (let i = 0; i < 11; i += 1) {
      await putRecipeSnapshot(baseRecipe(`recipe-${i}`, `2026-08-27T00:${String(i).padStart(2, "0")}:00.000Z`));
    }
    const recipes = await listRecipeSnapshots("user-a");
    expect(recipes).toHaveLength(10);
    expect(recipes[0].lastOpenedAt).toBe("2026-08-27T00:10:00.000Z");
  });

  it("does not expose another user's shopping snapshot", async () => {
    await putShoppingSnapshot(shoppingSnapshot);
    expect(await getShoppingSnapshot("user-b")).toBeNull();
  });

  it("removes a deleted recipe from the offline cache for the current user", async () => {
    await putRecipeSnapshot(baseRecipe("recipe-to-delete", "2026-08-27T00:00:00.000Z"));
    await deleteRecipeSnapshot("user-a", "recipe-to-delete");
    expect(await getRecipeSnapshot("user-a", "recipe-to-delete")).toBeNull();
  });

  it("keeps local trash state separate from active cached recipes", async () => {
    await putRecipeSnapshot(baseRecipe("recipe-trash", "2026-08-27T00:00:00.000Z"));
    await putRecipeSnapshot({ ...baseRecipe("recipe-trash-offline", "2026-08-27T00:01:00.000Z"), deleted: true });

    expect(await listRecipeSnapshots("user-a")).toHaveLength(1);
    expect((await listRecipeSnapshots("user-a"))[0]?.recipeId).toBe("recipe-trash");
    expect(await listRecipeSnapshots("user-a", true)).toMatchObject([{ recipeId: "recipe-trash-offline" }]);
  });

  it("stores recipe list summaries per user and deletion scope", async () => {
    await putRecipeSummaryPage("user-a", [{
      id: "recipe-summary",
      title: "摘要菜谱",
      description: null,
      coverUrl: "https://example.invalid/cover.jpg",
      baseServings: 2,
      prepMinutes: null,
      cookMinutes: null,
      isFavorite: false,
      category: null,
      tags: [],
      preparationCount: 0,
      maxLeadTimeMinutes: null,
      nutrition: null,
      updatedAt: "2026-08-27T00:00:00.000Z",
    }], false);

    expect(await listRecipeSummaryPage("user-a", false)).toMatchObject([{ id: "recipe-summary", title: "摘要菜谱", coverUrl: null }]);
    expect(await listRecipeSummaryPage("user-a", true)).toEqual([]);
    expect(await listRecipeSummaryPage("user-b", false)).toEqual([]);
  });

  it("updates a cached summary and coalesces queued recipe mutations", async () => {
    await putRecipeSummaryPage("user-a", [{
      id: "recipe-mutation",
      title: "待同步菜谱",
      description: null,
      coverUrl: null,
      baseServings: 2,
      prepMinutes: null,
      cookMinutes: null,
      isFavorite: false,
      category: null,
      tags: [],
      preparationCount: 0,
      maxLeadTimeMinutes: null,
      nutrition: null,
      updatedAt: "2026-08-27T00:00:00.000Z",
    }], false);
    await updateRecipeSummaryCache("user-a", "recipe-mutation", { deleted: true, isFavorite: true });
    expect(await listRecipeSummaryPage("user-a", true)).toMatchObject([{ id: "recipe-mutation", isFavorite: true }]);
    expect(await listRecipeSummaryPage("user-a", false)).toEqual([]);

    const first = await queueRecipeMutation({ userId: "user-a", recipeId: "recipe-mutation", kind: "move-to-trash" });
    const second = await queueRecipeMutation({ userId: "user-a", recipeId: "recipe-mutation", kind: "restore" });
    expect(second.id).not.toBe(first.id);
    expect(await listRecipeMutationQueue("user-a")).toMatchObject([{ entityId: "recipe-mutation", payload: { kind: "restore" } }]);
    await markRecipeMutationAttemptFailed(second, "网络暂不可用");
    expect(await listRecipeMutationQueue("user-a")).toMatchObject([{ attemptCount: 1, lastError: "网络暂不可用" }]);
    expect(await deleteRecipeMutationIfCurrent({ ...second, id: "stale" })).toBe(false);
    expect(await deleteRecipeMutationIfCurrent(second)).toBe(true);
  });

  it("updates the shopping item and coalesces the toggle queue in one operation", async () => {
    await putShoppingSnapshot(shoppingSnapshot);
    const first = await queueShoppingToggle({ userId: "user-a", listId: "list-a", itemId: "item-a", targetChecked: true });
    const second = await queueShoppingToggle({ userId: "user-a", listId: "list-a", itemId: "item-a", targetChecked: false });
    expect(second.clientMutationId).not.toBe(first.clientMutationId);
    expect((await listShoppingToggleQueue("user-a"))).toHaveLength(1);
    expect((await listShoppingToggleQueue("user-a"))[0].targetChecked).toBe(false);
    expect((await getShoppingSnapshot("user-a"))?.list.items[0].isChecked).toBe(false);
  });

  it("tracks failed attempts and only deletes the current mutation", async () => {
    await putShoppingSnapshot(shoppingSnapshot);
    const record = await queueShoppingToggle({ userId: "user-a", listId: "list-a", itemId: "item-a", targetChecked: true });
    await markShoppingToggleAttemptFailed(record, "网络暂不可用");
    const failed = (await listShoppingToggleQueue("user-a"))[0];
    expect(failed.attemptCount).toBe(1);
    expect(failed.lastError).toBe("网络暂不可用");
    expect(await deleteShoppingToggleIfCurrent({ ...record, clientMutationId: "stale" })).toBe(false);
    expect(await deleteShoppingToggleIfCurrent(failed)).toBe(true);
  });

  it("removes incompatible records instead of returning them", async () => {
    await putRecipeSnapshot({ ...baseRecipe("bad", "2026-08-27T00:00:00.000Z"), dataVersion: 1 as 3 });
    expect(await getRecipeSnapshot("user-a", "bad")).toBeNull();
    await putShoppingSnapshot({ ...shoppingSnapshot, dataVersion: 2 as 1 });
    expect(await getShoppingSnapshot("user-a")).toBeNull();
  });

  it("returns a stable storage error when IndexedDB cannot open", async () => {
    await __resetOfflineDatabaseForTests();
    const indexedDb = globalThis.indexedDB;
    vi.stubGlobal("indexedDB", { ...indexedDb, open: () => { throw new Error("simulated open failure"); } });
    try {
      await expect(getShoppingSnapshot("user-a")).rejects.toThrow("OFFLINE_STORAGE_UNAVAILABLE");
      await expect(getShoppingSnapshot("secret-user")).rejects.not.toThrow("secret-user");
    } finally {
      vi.unstubAllGlobals();
      await __resetOfflineDatabaseForTests();
    }
  });

  it("preserves distinguishable business errors", async () => {
    await expect(queueShoppingToggle({ userId: "user-a", listId: "missing", itemId: "missing", targetChecked: true }))
      .rejects.toThrow("SHOPPING_SNAPSHOT_NOT_FOUND");
  });
});
