// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { migrationStatements } from "./recipe-store";
import { goldenSource } from "./backup/test-fixtures";
it("Android migration fixture exactly matches the production v4 statements", () => {
  const native = JSON.parse(
    readFileSync(
      new URL(
        "../../android/app/src/androidTest/assets/cooking-migrations.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(native).toEqual(
    migrationStatements.find((m) => m.toVersion === 4).statements,
  );
});
it("migrates exact v3 rows and restore metadata to v4 without changing original data", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const m of migrationStatements.filter((m) => m.toVersion <= 3))
      for (const sql of m.statements) db.exec(sql);
    db.exec(
      "PRAGMA user_version=3; INSERT INTO recipes(id,title,created_at,updated_at) VALUES('old','啤酒鸭🍚','2026-10-01T00:00:00.000Z','2026-10-01T00:00:00.000Z'); INSERT INTO backup_restore_state VALUES(1,'operation','generation','hash','2026-10-01T00:00:00.000Z')",
    );
    const s = goldenSource(),
      r = s.recipes[0];
    db.prepare(
      "INSERT INTO recipes(id,title,created_at,updated_at,total_minutes,servings,calories_per_serving,cover_path,notes) VALUES(?,?,?,?,?,?,?,?,?)",
    ).run(
      r.id,
      r.title,
      r.createdAt,
      r.updatedAt,
      r.totalMinutes,
      r.servings,
      r.caloriesPerServing,
      r.coverPath,
      r.notes,
    );
    for (const i of s.ingredients)
      db.prepare("INSERT INTO recipe_ingredients VALUES(?,?,?,?)").run(
        i.recipeId,
        i.position,
        i.name,
        i.amount,
      );
    for (const i of s.steps)
      db.prepare("INSERT INTO recipe_steps VALUES(?,?,?,?)").run(
        i.recipeId,
        i.position,
        i.instruction,
        i.imagePath,
      );
    for (const i of s.preparations)
      db.prepare("INSERT INTO recipe_preparations VALUES(?,?,?,?,?)").run(
        i.recipeId,
        i.position,
        i.instruction,
        i.minutes,
        i.timingText,
      );
    for (const i of s.keyTips)
      db.prepare("INSERT INTO recipe_key_tips VALUES(?,?,?,?)").run(
        i.recipeId,
        i.position,
        i.instruction,
        i.stepNumber,
      );
    for (const i of s.changes)
      db.prepare("INSERT INTO recipe_changes VALUES(?,?,?,?,?)").run(
        i.id,
        i.recipeId,
        i.changedAt,
        JSON.stringify(i.before),
        JSON.stringify(i.after),
      );
    const tables = [
      "recipes",
      "recipe_ingredients",
      "recipe_steps",
      "recipe_preparations",
      "recipe_key_tips",
      "recipe_changes",
      "backup_restore_state",
    ];
    const snapshot = () =>
      tables.map((table) =>
        db.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all(),
      );
    const before = snapshot();
    const migration = migrationStatements.find((m) => m.toVersion === 4);
    expect(migration).toBeDefined();
    db.exec("BEGIN");
    for (const sql of migration.statements) db.exec(sql);
    db.exec("PRAGMA user_version=4; COMMIT");
    expect(snapshot()).toEqual(before);
    expect(db.prepare("SELECT * FROM cooking_records").all()).toEqual([]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});
it("failed incremental migration leaves old version and data intact", () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const m of migrationStatements.filter((m) => m.toVersion <= 3))
      for (const sql of m.statements) db.exec(sql);
    db.exec(
      "PRAGMA user_version=3; INSERT INTO recipes(id,title,created_at,updated_at) VALUES('old','鸭','2026-10-01T00:00:00.000Z','2026-10-01T00:00:00.000Z')",
    );
    const m = migrationStatements.find((m) => m.toVersion === 4);
    expect(m).toBeDefined();
    db.exec("BEGIN");
    try {
      for (const sql of m.statements) db.exec(sql);
      db.exec("INSERT INTO missing_table VALUES(1)");
    } catch {
      db.exec("ROLLBACK");
    }
    expect(db.prepare("PRAGMA user_version").get().user_version).toBe(3);
    expect(db.prepare("SELECT title FROM recipes").get().title).toBe("鸭");
    expect(
      db
        .prepare("SELECT name FROM sqlite_master WHERE name='cooking_records'")
        .all(),
    ).toEqual([]);
  } finally {
    db.close();
  }
});
