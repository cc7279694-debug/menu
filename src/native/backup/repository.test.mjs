// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { SQLiteBackupRepository } from "./repository";
import { DataOperationCoordinator } from "./coordinator";
import { RecipeNameStore, migrationStatements, schemaVersion } from "../recipe-store";
import { goldenSource, time } from "./test-fixtures";
import { testDatabase } from "./sqlite-test-driver.mjs";
import { localImagePath, emptyDetails } from "../recipe-model";
const databases = [];
const commit = { operationId: "operation-fixed", generationId: "generation-fixed", dataSha256: "d".repeat(64), committedAt: time };
function setup() {
  const { db, driver } = testDatabase(); databases.push(db);
  const coordinator = new DataOperationCoordinator();
  return { db, driver, coordinator, repository: new SQLiteBackupRepository(driver, coordinator, () => new Date(time)), store: new RecipeNameStore(driver, () => new Date(time), coordinator) };
}
afterEach(() => databases.splice(0).forEach(d => d.close()));
it("migrates both old schemas to v3 without altering recipes and rolls failed migration back", () => {
  expect(schemaVersion).toBe(3);
  for (const start of [1, 2]) {
    const db = new DatabaseSync(":memory:"); databases.push(db);
    for (const m of migrationStatements.filter(m => m.toVersion <= start)) m.statements.forEach(s => db.exec(s));
    db.exec(`INSERT INTO recipes(id,title,created_at,updated_at) VALUES('old','啤酒鸭','${time}','${time}')`);
    for (const m of migrationStatements.filter(m => m.toVersion > start)) m.statements.forEach(s => db.exec(s));
    expect(db.prepare("SELECT id,created_at FROM recipes").get()).toMatchObject({ id: "old", created_at: time });
    expect(db.prepare("SELECT count(*) n FROM backup_restore_state").get().n).toBe(0);
  }
  const db = new DatabaseSync(":memory:"); databases.push(db);
  for (const m of migrationStatements.filter(m => m.toVersion <= 2)) m.statements.forEach(s => db.exec(s));
  db.exec("BEGIN");
  expect(() => { migrationStatements[2].statements.forEach(s => db.exec(s)); db.exec("invalid SQL"); }).toThrow();
  db.exec("ROLLBACK");
  expect(db.prepare("SELECT name FROM sqlite_master WHERE name='backup_restore_state'").get()).toBeUndefined();
});
it("round trips all six actual tables and exact history snapshots without generating new IDs", async () => {
  const { repository } = setup();
  await repository.replace(goldenSource(), commit);
  expect(await repository.snapshot()).toEqual(goldenSource());
  expect(await repository.readRestoreCommit()).toEqual(commit);
});
it("snapshots over 100 recipes without pagination truncation and rejects active undo window", async () => {
  const { repository, store } = setup();
  for (let i = 0; i < 105; i++) await store.create(`菜${i}`);
  expect((await repository.snapshot()).recipes).toHaveLength(105);
  const r = await store.create("临时"); await store.remove(r.id);
  await expect(repository.snapshot()).rejects.toThrow("撤销");
});
it("rolls back deleted rows, children and metadata after a real insert trigger fails", async () => {
  const { repository, db } = setup();
  await repository.replace(goldenSource(), commit);
  const before = await repository.snapshot();
  db.exec("CREATE TRIGGER fail_restore BEFORE INSERT ON recipe_steps WHEN NEW.instruction='坏步骤' BEGIN SELECT RAISE(ABORT,'injected IO'); END;");
  const next = goldenSource(); next.steps[1].instruction = "坏步骤";
  await expect(repository.replace(next, { ...commit, operationId: "failed" })).rejects.toThrow();
  expect(await repository.snapshot()).toEqual(before);
  expect(await repository.readRestoreCommit()).toEqual(commit);
});
it("rejects damaged relations before writing and checks actual counts before commit", async () => {
  const { repository, db } = setup(); await repository.replace(goldenSource(), commit);
  const before = await repository.snapshot();
  const next = goldenSource(); next.steps[1].position = 9;
  await expect(repository.replace(next, commit)).rejects.toThrow();
  db.exec("CREATE TRIGGER drop_step AFTER INSERT ON recipe_steps BEGIN DELETE FROM recipe_steps WHERE recipe_id=NEW.recipe_id AND position=NEW.position; END;");
  await expect(repository.replace(goldenSource(), { ...commit, operationId: "count-failure" })).rejects.toThrow("数量");
  expect(await repository.snapshot()).toEqual(before);
  expect(await repository.readRestoreCommit()).toEqual(commit);
});
it("replaces rather than merges and commits empty backups", async () => {
  const { repository, store } = setup(); await store.create("原来的A");
  await repository.replace(goldenSource(), commit);
  expect((await store.list()).map(r => r.title)).toEqual(["可乐鸡翅 🍗"]);
  const empty = { sourceSchemaVersion: 3, recipes: [], ingredients: [], steps: [], preparations: [], keyTips: [], changes: [], settings: {} };
  await repository.replace(empty, { ...commit, operationId: "empty" });
  expect(await repository.snapshot()).toEqual(empty);
  expect((await repository.readRestoreCommit()).operationId).toBe("empty");
});
it("keeps CRUD/undo/purge behind a compound safety-copy + restore operation", async () => {
  const { repository, store } = setup();
  let release; const wait = new Promise(r => { release = r; });
  const work = repository.exclusive(async locked => { await wait; await locked.replace(goldenSource(), commit); });
  const save = store.create("排队菜"); const purge = store.purgeExpired();
  await Promise.resolve(); release(); await Promise.all([work, save, purge]);
  expect((await repository.snapshot()).recipes).toHaveLength(2);
});
it("queues actual edit, undo and timer purge behind Replace", async () => {
  const { repository, store } = setup();
  await repository.replace(goldenSource(), commit); await store.remove("recipe-fixed");
  let release; const wait = new Promise(r => { release = r; });
  const restore = repository.exclusive(async locked => { await wait; await locked.replace(goldenSource(), commit); });
  const undo = store.undo("recipe-fixed");
  const edit = store.saveDetails("recipe-fixed", { ...emptyDetails("已恢复后修改"), notes: "测试" });
  const purge = store.purgeExpired();
  release(); await restore;
  expect(await undo).toBe(false); await Promise.all([edit, purge]);
  expect((await store.getDetails("recipe-fixed")).title).toBe("已恢复后修改");
});
it("accepts only precise internally generated media generation paths", () => {
  const valid = `images/generation-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/${"a".repeat(64)}.png`;
  expect(localImagePath.parse(valid)).toBe(valid);
  for (const bad of [valid.replace("generation-", "../"), valid + "/extra", valid.replace("a".repeat(64), "asset"), valid.replace("generation-aaaaaaaa", "generation-anything")]) expect(() => localImagePath.parse(bad)).toThrow();
});
