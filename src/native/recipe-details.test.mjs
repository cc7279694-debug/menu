// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import {
  RecipeNameStore,
  schemaStatements,
  migrationStatements,
} from "./recipe-store";
import { DataOperationCoordinator } from "./backup/coordinator";

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
it("normalized no-op and cooking activity create no noisy recipe history or timestamp change", async () => {
  const { db, driver } = setup();
  let now = Date.parse("2026-10-04T01:00:00.000Z");
  const store = new RecipeNameStore(driver, () => new Date(now++));
  const r = await store.createDetails(details),
    before = await store.getDetails(r.id);
  await store.saveDetails(r.id, {
    ...details,
    title: "  啤酒鸭  ",
    notes: "  下次少放盐  ",
  });
  expect((await store.getDetails(r.id)).updatedAt).toBe(before.updatedAt);
  expect(db.prepare("SELECT count(*) n FROM recipe_changes").get().n).toBe(0);
  await store.recordCooking(r.id, "cooked");
  expect(db.prepare("SELECT count(*) n FROM recipe_changes").get().n).toBe(0);
});
it("shared cooking cover records one formal change and repeating it is a no-op", async () => {
  const { db, store } = setup(),
    r = await store.createDetails(details);
  await store.recordCooking(r.id, "cover-photo");
  await store.updateCookingRecord("cover-photo", {
    finishedPhotoPath: "images/aaaa.png",
    evaluation: null,
    note: null,
  });
  await store.setCookingPhotoAsCover("cover-photo");
  await store.setCookingPhotoAsCover("cover-photo");
  const changes = await store.listRecipeChanges(r.id);
  expect(changes).toHaveLength(1);
  expect(changes[0].after.coverPath).toBe("images/aaaa.png");
  expect(changes[0].before).not.toHaveProperty("preparationHint");
  expect(changes[0].before).not.toHaveProperty("lastCookedAt");
  expect(
    db.prepare("SELECT finished_photo_path p FROM cooking_records").get().p,
  ).toBe("images/aaaa.png");
});

it("creation UUID retries preserve original rows and times; conflicts and deleted IDs never overwrite", async () => {
  const {db,store}=setup(),id=crypto.randomUUID();
  const first=await store.createDetails(details,id);
  expect(first.id).toBe(id);
  const snapshot=db.prepare("SELECT * FROM recipes").all();
  expect(await store.createDetails({...details,title:"  啤酒鸭  "},id)).toEqual(first);
  expect(db.prepare("SELECT * FROM recipes").all()).toEqual(snapshot);
  expect(db.prepare("SELECT count(*) n FROM recipe_changes").get().n).toBe(0);
  await expect(store.createDetails({...details,notes:"不同"},id)).rejects.toThrow();
  await store.remove(id);
  await expect(store.createDetails(details,id)).rejects.toThrow();
  expect(await store.getDetails(id)).toBeNull();
  await expect(store.createDetails(details,"not-uuid")).rejects.toThrow();
});
it("exact title search covers beyond page 100, excludes trash and never interprets SQL",async()=>{
  const {store}=setup();await store.create("啤酒鸭");for(let i=0;i<101;i++)await store.create(`新菜${i}`);
  expect(await store.hasExactTitle("  啤酒鸭  ")).toBe(true);
  expect(await store.hasExactTitle("% OR 1=1")).toBe(false);
  const row=await store.create("已删除");await store.remove(row.id);expect(await store.hasExactTitle("已删除")).toBe(false);
});
it("failed optional-UUID insert rolls back every row, then retries the same ID after fixing input",async()=>{
  const {db,store}=setup(),id=crypto.randomUUID();db.exec("CREATE TRIGGER reject_creation BEFORE INSERT ON recipe_steps WHEN NEW.instruction='坏步骤' BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
  await expect(store.createDetails({...details,steps:[{instruction:"坏步骤",imagePath:null}]},id)).rejects.toThrow();
  for(const table of ["recipes","recipe_ingredients","recipe_steps","recipe_preparations","recipe_key_tips","recipe_changes"])expect(db.prepare(`SELECT count(*) n FROM ${table}`).get().n).toBe(0);
  expect((await store.createDetails(details,id)).id).toBe(id);
});
it("queued invalid AI precondition runs under FIFO before any SQL, while save-first commits once",async()=>{
  const {db,driver}=setup(),gate=new DataOperationCoordinator(),store=new RecipeNameStore(driver,undefined,gate);
  let release,entered;const started=new Promise(r=>{entered=r;});const block=new Promise(r=>{release=r;});
  const replace=gate.withExclusive(async()=>{entered();await block;});await started;
  let valid=true,queries=0,writes=0;const query=driver.query,batch=driver.batch;
  driver.query=(...args)=>{queries++;return query(...args);};driver.batch=(...args)=>{writes++;return batch(...args);};
  const pending=store.createDetails(details,crypto.randomUUID(),()=>{if(!valid)throw new Error("stale");});const rejected=expect(pending).rejects.toThrow("stale");valid=false;release();await replace;await rejected;
  expect(queries).toBe(0);expect(writes).toBe(0);expect(db.prepare("SELECT count(*) n FROM recipes").get().n).toBe(0);
  const id=crypto.randomUUID();const saved=store.createDetails(details,id,()=>{});const following=gate.withExclusive(async()=>expect(db.prepare("SELECT count(*) n FROM recipes").get().n).toBe(1));await saved;await following;
});
