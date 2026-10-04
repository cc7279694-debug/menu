// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { testDatabase } from "./backup/sqlite-test-driver.mjs";
import { RecipeNameStore } from "./recipe-store";
const databases = [];
function setup() {
  const { db, driver } = testDatabase();
  databases.push(db);
  let now = new Date("2026-10-04T10:00:00.000Z");
  return {
    db,
    driver,
    store: new RecipeNameStore(driver, () => now),
    advance: (ms) => {
      now = new Date(now.getTime() + ms);
    },
  };
}
afterEach(() => databases.splice(0).forEach((db) => db.close()));
it("records only an explicit completion and retries the same ID without changing its time", async () => {
  const { store, db, advance } = setup();
  const recipe = await store.create("可乐鸡翅");
  const first = await store.recordCooking(recipe.id, "record-a");
  advance(1000);
  expect(await store.recordCooking(recipe.id, "record-a")).toEqual(first);
  expect(first).toEqual({
    id: "record-a",
    recipeId: recipe.id,
    cookedAt: "2026-10-04T10:00:00.000Z",
    finishedPhotoPath: null,
    evaluation: null,
    note: null,
  });
  expect(db.prepare("SELECT count(*) n FROM cooking_records").get().n).toBe(1);
  expect(db.prepare("SELECT count(*) n FROM recipe_changes").get().n).toBe(0);
  expect((await store.getDetails(recipe.id)).updatedAt).toBe(recipe.updatedAt);
});
it("rejects cross-recipe retry, missing recipes and deleted recipes", async () => {
  const { store } = setup();
  const a = await store.create("a"),
    b = await store.create("b");
  await store.recordCooking(a.id, "same");
  await expect(store.recordCooking(b.id, "same")).rejects.toThrow();
  await expect(store.recordCooking("missing", "missing")).rejects.toThrow();
  await store.remove(a.id);
  await expect(store.recordCooking(a.id, "new")).rejects.toThrow();
});
it("allows independent extras without changing cookedAt or recipe", async () => {
  const { store, advance } = setup();
  const recipe = await store.create("糖醋排骨");
  const record = await store.recordCooking(recipe.id, "a");
  advance(1000);
  expect(
    await store.updateCookingRecord("a", {
      finishedPhotoPath: null,
      evaluation: "tasty",
      note: "下次糖15g\n很好吃🍚",
    }),
  ).toEqual({ ...record, evaluation: "tasty", note: "下次糖15g\n很好吃🍚" });
  await expect(
    store.updateCookingRecord("a", {
      finishedPhotoPath: "../../secret",
      evaluation: null,
      note: null,
    }),
  ).rejects.toThrow();
  await expect(
    store.updateCookingRecord("a", {
      finishedPhotoPath: null,
      evaluation: "five-stars",
      note: null,
    }),
  ).rejects.toThrow();
  await expect(
    store.updateCookingRecord("a", {
      finishedPhotoPath: null,
      evaluation: null,
      note: "a".repeat(2001),
    }),
  ).rejects.toThrow();
  expect((await store.getDetails(recipe.id)).updatedAt).toBe(recipe.updatedAt);
});
it("paginates equal times without omissions and derives summary without reordering recipes", async () => {
  const { store, advance } = setup();
  const a = await store.create("a");
  advance(1000);
  const b = await store.create("b");
  for (const id of ["a", "b", "c"]) await store.recordCooking(a.id, id);
  const first = await store.listCookingRecords(a.id, 2);
  expect(first.map((r) => r.id)).toEqual(["c", "b"]);
  expect(
    (
      await store.listCookingRecords(a.id, 2, {
        cookedAt: first[1].cookedAt,
        id: first[1].id,
      })
    ).map((r) => r.id),
  ).toEqual(["a"]);
  expect(await store.getCookingSummary(a.id)).toEqual({
    count: 3,
    lastCookedAt: "2026-10-04T10:00:01.000Z",
  });
  expect((await store.list()).map((r) => r.id)).toEqual([b.id, a.id]);
  expect((await store.list()).find((r) => r.id === a.id).lastCookedAt).toBe(
    "2026-10-04T10:00:01.000Z",
  );
  await store.deleteCookingRecord("b");
  expect(await store.getDetails(a.id)).not.toBeNull();
  expect((await store.getCookingSummary(a.id)).count).toBe(2);
});
it("retains cooking records through recipe Undo and cascades only on expiry", async () => {
  const { store, db, advance } = setup();
  const recipe = await store.create("鸭");
  await store.recordCooking(recipe.id, "a");
  await store.remove(recipe.id);
  advance(4999);
  await store.purgeExpired();
  expect(db.prepare("SELECT count(*) n FROM cooking_records").get().n).toBe(1);
  expect(await store.undo(recipe.id)).toBe(true);
  await store.remove(recipe.id);
  advance(5000);
  await store.purgeExpired();
  expect(db.prepare("SELECT count(*) n FROM cooking_records").get().n).toBe(0);
});
it("rolls back a failed cooking insert without altering recipes", async () => {
  const { store, db } = setup();
  const recipe = await store.create("鸭");
  db.exec(
    "CREATE TRIGGER reject_record BEFORE INSERT ON cooking_records BEGIN SELECT RAISE(ABORT,'test failure'); END",
  );
  await expect(store.recordCooking(recipe.id, "a")).rejects.toThrow(
    "test failure",
  );
  expect(await store.getCookingSummary(recipe.id)).toEqual({
    count: 0,
    lastCookedAt: null,
  });
  expect(await store.getDetails(recipe.id)).toMatchObject(recipe);
});
