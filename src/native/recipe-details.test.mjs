// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import {
  RecipeNameStore,
  schemaStatements,
  migrationStatements,
} from "./recipe-store";

const databases = [];
function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec("PRAGMA foreign_keys=ON");
  schemaStatements.forEach((sql) => db.exec(sql));
  const driver = {
    query: async (sql, values = []) => db.prepare(sql).all(...values),
    run: async (sql, values = []) =>
      Number(db.prepare(sql).run(...values).changes),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        statements.forEach((s) =>
          db.prepare(s.statement).run(...(s.values ?? [])),
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, driver, store: new RecipeNameStore(driver) };
}
afterEach(() => databases.splice(0).forEach((db) => db.close()));
const details = {
  title: "啤酒鸭",
  totalMinutes: 60,
  servings: 2,
  caloriesPerServing: null,
  coverPath: null,
  notes: "下次少放盐",
  ingredients: [
    { name: "鸭肉", amount: "500克" },
    { name: "啤酒", amount: "半瓶" },
  ],
  steps: [
    { instruction: "先焯水", imagePath: null },
    { instruction: "小火焖煮", imagePath: null },
  ],
  preparations: [
    { instruction: "鸭肉提前腌制", minutes: 30, timingText: null },
    { instruction: "提前一晚处理", minutes: null, timingText: "提前一晚" },
  ],
  keyTips: [{ instruction: "不要煮干", stepNumber: 2 }],
};
it("migrates v1 names without losing IDs or timestamps", () => {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  migrationStatements[0].statements.forEach((sql) => db.exec(sql));
  db.exec(
    "INSERT INTO recipes VALUES('old','啤酒鸭','2026-01-01','2026-01-01',NULL)",
  );
  migrationStatements[1].statements.forEach((sql) => db.exec(sql));
  expect(
    db.prepare("SELECT id,title,total_minutes,created_at FROM recipes").get(),
  ).toMatchObject({
    id: "old",
    title: "啤酒鸭",
    total_minutes: null,
    created_at: "2026-01-01",
  });
});
it("saves real quantities, ordered steps, textual preparation and key tips", async () => {
  const { store } = setup();
  const recipe = await store.create("鸭");
  await store.saveDetails(recipe.id, details);
  const saved = await store.getDetails(recipe.id);
  expect(saved).toMatchObject(details);
  expect(saved.createdAt).toBe(recipe.createdAt);
  expect(await store.list("鸭肉")).toHaveLength(1);
  expect(await store.list("% OR 1=1")).toEqual([]);
});
it("leaves name-only data unknown and filters exact non-overlapping time boundaries", async () => {
  const { store } = setup();
  for (const minutes of [null, 30, 31, 60, 61]) {
    const r = await store.create(`菜${minutes}`);
    await store.saveDetails(r.id, {
      ...details,
      title: r.title,
      totalMinutes: minutes,
    });
  }
  expect((await store.list("", 100, 0, "short")).map((r) => r.title)).toEqual([
    "菜30",
  ]);
  expect(
    (await store.list("", 100, 0, "medium")).map((r) => r.title).sort(),
  ).toEqual(["菜31", "菜60"]);
  expect((await store.list("", 100, 0, "long")).map((r) => r.title)).toEqual([
    "菜61",
  ]);
  expect(await store.list()).toHaveLength(5);
});
it("rejects negative time, empty steps, unsafe files and dangling step tips before writing", async () => {
  const { store } = setup();
  const r = await store.create("鸭");
  for (const invalid of [
    { totalMinutes: -1 },
    { steps: [{ instruction: "  ", imagePath: null }] },
    { coverPath: "../../secret" },
    { keyTips: [{ instruction: "注意", stepNumber: 9 }] },
  ]) {
    await expect(
      store.saveDetails(r.id, { ...details, ...invalid }),
    ).rejects.toThrow();
  }
  expect((await store.getDetails(r.id)).ingredients).toEqual([]);
});
it("rolls back all child edits and history if any statement fails", async () => {
  const { db, driver, store } = setup();
  const r = await store.create("鸭");
  await store.saveDetails(r.id, details);
  db.exec(
    "CREATE TRIGGER reject_bad BEFORE INSERT ON recipe_steps WHEN NEW.instruction='坏步骤' BEGIN SELECT RAISE(ABORT,'disk failure'); END;",
  );
  await expect(
    store.saveDetails(r.id, {
      ...details,
      title: "新菜名",
      steps: [{ instruction: "坏步骤", imagePath: null }],
    }),
  ).rejects.toThrow();
  expect((await store.getDetails(r.id)).title).toBe("啤酒鸭");
  expect(db.prepare("SELECT count(*) n FROM recipe_changes").get().n).toBe(1);
  // Reopen the repository, not just the component's cached result.
  expect(
    (await new RecipeNameStore(driver).getDetails(r.id)).steps,
  ).toHaveLength(2);
});
it("keeps child rows for undo and cascades them only when deletion expires", async () => {
  const { db, driver } = setup();
  let now = 0;
  const store = new RecipeNameStore(driver, () => new Date(now));
  const r = await store.create("鸭");
  await store.saveDetails(r.id, details);
  await store.remove(r.id);
  expect(db.prepare("SELECT count(*) n FROM recipe_steps").get().n).toBe(2);
  now = 4999;
  expect(await store.undo(r.id)).toBe(true);
  expect((await store.getDetails(r.id)).keyTips).toHaveLength(1);
  await store.remove(r.id);
  now += 5000;
  await store.purgeExpired();
  expect(db.prepare("SELECT count(*) n FROM recipe_steps").get().n).toBe(0);
  expect(db.prepare("SELECT count(*) n FROM recipe_changes").get().n).toBe(0);
});
it("creates a complete recipe atomically without leaving a name-only row on failure", async () => {
  const { db, store } = setup();
  db.exec(
    "CREATE TRIGGER reject_bad BEFORE INSERT ON recipe_steps WHEN NEW.instruction='坏步骤' BEGIN SELECT RAISE(ABORT,'disk failure'); END;",
  );
  await expect(
    store.createDetails({
      ...details,
      steps: [{ instruction: "坏步骤", imagePath: null }],
    }),
  ).rejects.toThrow();
  expect(await store.list()).toEqual([]);
  const r = await store.createDetails(details);
  expect((await store.getDetails(r.id)).ingredients).toHaveLength(2);
});
