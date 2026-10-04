import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import {
  getLocalDatabase,
  __resetLocalDatabaseForTests,
} from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
import { emptyDetails } from "./recipe-model";
afterEach(__resetLocalDatabaseForTests);
it("uses the existing local table and persists full details across repository reopen", async () => {
  const store = new PreviewRecipeLibrary();
  const r = await store.create("啤酒鸭");
  await store.saveDetails(r.id, {
    ...emptyDetails(r.title),
    totalMinutes: 30,
    ingredients: [{ name: "鸭肉", amount: "500克" }],
    steps: [{ instruction: "焖煮", imagePath: null }],
    keyTips: [{ instruction: "小火", stepNumber: 1 }],
  });
  const reopened = new PreviewRecipeLibrary();
  expect((await reopened.getDetails(r.id))?.ingredients).toEqual([
    { name: "鸭肉", amount: "500克" },
  ]);
  expect(await reopened.list("鸭肉", 100, 0, "short")).toHaveLength(1);
  expect(await reopened.list("%")).toEqual([]);
  expect(await (await getLocalDatabase()).localRecipes.count()).toBe(1);
});
it("preserves related data through undo then clears only the recipe and its history", async () => {
  let now = 10000;
  const store = new PreviewRecipeLibrary(() => new Date(now));
  const r = await store.create("鸭");
  await store.saveDetails(r.id, { ...emptyDetails("鸭"), notes: "少盐" });
  await store.remove(r.id);
  now += 4000;
  expect(await store.undo(r.id)).toBe(true);
  expect((await store.getDetails(r.id))?.notes).toBe("少盐");
  await store.remove(r.id);
  now += 5000;
  await store.purgeExpired();
  expect(await store.getDetails(r.id)).toBeNull();
  expect(await (await getLocalDatabase()).recipeChanges.count()).toBe(0);
});
it("does not create a partial recipe when validation fails", async () => {
  const store = new PreviewRecipeLibrary();
  await expect(
    store.createDetails({ ...emptyDetails("鸭"), totalMinutes: -1 }),
  ).rejects.toThrow();
  expect(await store.list()).toEqual([]);
  const r = await store.createDetails({ ...emptyDetails("鸭"), notes: "少盐" });
  expect((await store.getDetails(r.id))?.notes).toBe("少盐");
});
it("normalizes identical edits without writing history or changing update time", async () => {
  let now = Date.parse("2026-10-04T01:00:00.000Z");
  const store = new PreviewRecipeLibrary(() => new Date(now++)),
    r = await store.createDetails(emptyDetails("鸭"));
  await store.saveDetails(r.id, emptyDetails("  鸭  "));
  expect((await store.getDetails(r.id))?.updatedAt).toBe(r.updatedAt);
  expect(await store.listRecipeChanges(r.id)).toEqual([]);
});
