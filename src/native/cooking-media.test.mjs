// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { testDatabase } from "./backup/sqlite-test-driver.mjs";
import { RecipeNameStore } from "./recipe-store";
import { LocalMediaLifecycle } from "./media-lifecycle";
import { DataOperationCoordinator } from "./backup/coordinator";
import { emptyDetails } from "./recipe-model";
const path = "images/11111111-1111-4111-8111-111111111111.png",
  databases = [];
function setup() {
  const { db, driver } = testDatabase();
  databases.push(db);
  const removed = [];
  let now = new Date("2026-10-04T10:00:00.000Z");
  const media = new LocalMediaLifecycle(async (p) => {
    removed.push(...p);
  });
  return {
    db,
    media,
    removed,
    store: new RecipeNameStore(
      driver,
      () => now,
      new DataOperationCoordinator(),
      media,
    ),
    advance: (ms) => {
      now = new Date(now.getTime() + ms);
    },
  };
}
afterEach(() => databases.splice(0).forEach((db) => db.close()));
it("retains shared cover, step and historic photos after record deletion", async () => {
  const { store, removed } = setup();
  const recipe = await store.createDetails({
    ...emptyDetails("鸡翅"),
    coverPath: path,
    steps: [{ instruction: "烧", imagePath: path }],
  });
  await store.recordCooking(recipe.id, "a");
  await store.updateCookingRecord("a", {
    finishedPhotoPath: path,
    evaluation: null,
    note: null,
  });
  await store.deleteCookingRecord("a");
  expect(removed).toEqual([]);
  await store.saveDetails(recipe.id, {
    ...recipe,
    coverPath: null,
    steps: [{ instruction: "烧", imagePath: null }],
  });
  expect(removed).toEqual([]);
});
it("unlinks a finished photo only after its last record reference is removed", async () => {
  const { store, removed } = setup();
  const recipe = await store.create("鸡翅");
  for (const id of ["a", "b"]) {
    await store.recordCooking(recipe.id, id);
    await store.updateCookingRecord(id, {
      finishedPhotoPath: path,
      evaluation: null,
      note: null,
    });
  }
  await store.deleteCookingRecord("a");
  expect(removed).toEqual([]);
  await store.deleteCookingRecord("b");
  expect(removed).toEqual([path]);
  expect(await store.getDetails(recipe.id)).not.toBeNull();
});
it("does not reclaim undoable recipe photos and reclaims expired candidates only", async () => {
  const { store, removed, advance } = setup();
  const recipe = await store.createDetails({
    ...emptyDetails("鸭"),
    coverPath: path,
  });
  await store.recordCooking(recipe.id, "a");
  await store.updateCookingRecord("a", {
    finishedPhotoPath: path,
    evaluation: null,
    note: null,
  });
  await store.remove(recipe.id);
  advance(4999);
  await store.purgeExpired();
  expect(removed).toEqual([]);
  expect(await store.undo(recipe.id)).toBe(true);
  await store.remove(recipe.id);
  advance(5000);
  await store.purgeExpired();
  expect(removed).toEqual([path]);
});
