// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RecipeNameStore, schemaStatements } from "./recipe-store";

const databases = [];
const temporaryDirectories = [];
function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  for (const sql of schemaStatements) db.exec(sql);
  let now = Date.parse("2026-10-03T10:00:00Z");
  const driver = {
    query: async (sql, values = []) => db.prepare(sql).all(...values),
    run: async (sql, values = []) =>
      Number(db.prepare(sql).run(...values).changes),
  };
  return {
    db,
    store: new RecipeNameStore(driver, () => new Date(now)),
    advance: (ms) => {
      now += ms;
    },
  };
}
afterEach(() => {
  databases.splice(0).forEach((db) => db.close());
  temporaryDirectories
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true }));
});

describe("APK-0 SQLite recipe names", () => {
  it("persists on disk across close and reopen without replacing the database", async () => {
    const dir = mkdtempSync(join(tmpdir(), "recipio-sqlite-"));
    temporaryDirectories.push(dir);
    const path = join(dir, "recipes.db");
    let db = new DatabaseSync(path);
    schemaStatements.forEach((sql) => db.exec(sql));
    const driver = {
      query: async (sql, values = []) => db.prepare(sql).all(...values),
      run: async (sql, values = []) =>
        Number(db.prepare(sql).run(...values).changes),
    };
    const r = await new RecipeNameStore(driver).create("啤酒鸭");
    db.close();
    db = new DatabaseSync(path);
    databases.push(db);
    schemaStatements.forEach((sql) => db.exec(sql));
    expect((await new RecipeNameStore(driver).get(r.id)).title).toBe("啤酒鸭");
  });
  it("creates name-only recipes and renames without changing join order", async () => {
    const { store, advance } = setup();
    const duck = await store.create("  啤酒鸭  ");
    advance(1000);
    await store.create("西红柿炒蛋");
    await store.rename(duck.id, "啤酒鸭 · 家常版");
    expect((await store.list()).map((r) => r.title)).toEqual([
      "西红柿炒蛋",
      "啤酒鸭 · 家常版",
    ]);
    expect((await store.get(duck.id)).createdAt).toBe(duck.createdAt);
  });
  it("allows duplicate names but rejects empty or oversized names", async () => {
    const { store } = setup();
    await store.create("啤酒鸭");
    await store.create("啤酒鸭");
    expect(await store.list()).toHaveLength(2);
    await expect(store.create("   ")).rejects.toThrow();
    await expect(store.create("鸭".repeat(121))).rejects.toThrow();
  });
  it("searches literal wildcard and quote input without SQL injection", async () => {
    const { store } = setup();
    await store.create("100%_鸭");
    await store.create("其他菜");
    expect((await store.list("%_")).map((r) => r.title)).toEqual(["100%_鸭"]);
    expect(await store.list("' OR 1=1 --")).toEqual([]);
  });
  it("preserves a deleted recipe during undo then permanently removes it", async () => {
    const { db, store, advance } = setup();
    const r = await store.create("啤酒鸭");
    await store.remove(r.id);
    expect(await store.list()).toEqual([]);
    expect(db.prepare("SELECT title FROM recipes").get().title).toBe("啤酒鸭");
    advance(4999);
    expect(await store.undo(r.id)).toBe(true);
    await store.remove(r.id);
    advance(5000);
    expect(await store.undo(r.id)).toBe(false);
    await store.purgeExpired();
    expect(db.prepare("SELECT count(*) AS n FROM recipes").get().n).toBe(0);
  });
  it("does not recreate missing or deleted recipes when editing stale detail", async () => {
    const { store } = setup();
    const r = await store.create("啤酒鸭");
    await store.remove(r.id);
    await expect(store.rename(r.id, "新名称")).rejects.toThrow();
    expect(await store.get(r.id)).toBeNull();
  });
  it("reapplying version-one schema preserves existing records and enforces title constraints", async () => {
    const { db, store } = setup();
    await store.create("啤酒鸭");
    schemaStatements.forEach((sql) => db.exec(sql));
    expect(await store.list()).toHaveLength(1);
    expect(() =>
      db.exec(
        "INSERT INTO recipes(id,title,created_at,updated_at) VALUES('x','', 'a','a')",
      ),
    ).toThrow();
  });
});
