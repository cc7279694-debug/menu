import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineRecipeSnapshot, OfflineShoppingSnapshot } from "./types";
import {
  clearOfflineData,
  __resetOfflineDatabaseForTests,
  deleteShoppingToggleIfCurrent,
  getLastOfflineProfile,
  getRecipeSnapshot,
  getShoppingSnapshot,
  listRecipeSnapshots,
  listShoppingToggleQueue,
  markShoppingToggleAttemptFailed,
  putRecipeSnapshot,
  putShoppingSnapshot,
  queueShoppingToggle,
  rememberOfflineProfile,
} from "./database";

const baseRecipe = (id: string, lastOpenedAt: string): OfflineRecipeSnapshot => ({
  userId: "user-a", recipeId: id, cachedAt: lastOpenedAt, lastOpenedAt,
  dataVersion: 1,
  recipe: {
    id, title: id, description: null, coverUrl: null, coverPath: null,
    baseServings: 1, prepMinutes: null, cookMinutes: null, isFavorite: false,
    category: null, tags: [], updatedAt: lastOpenedAt, personalNotes: null,
    ingredients: [], steps: [],
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
    await putRecipeSnapshot({ ...baseRecipe("bad", "2026-08-27T00:00:00.000Z"), dataVersion: 2 as 1 });
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
