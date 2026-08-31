import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asUser, createDatabase } from "@/test/database/bootstrap";
import { loadCookingHistoryMigrations } from "@/test/database/load-migrations";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const recipeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recipeB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mealPlanA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab";
const recordA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac";

describe("cooking history security", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadCookingHistoryMigrations(database);
    await database.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      userA,
      "a@example.test",
      userB,
      "b@example.test",
    ]);
    await asUser(database, userA);
    await database.query(`
      insert into public.recipes (id, user_id, title, base_servings)
      values ($1, $2, '番茄炒蛋', 2), ($3, $2, '鱼香肉丝', 2)
    `, [recipeA, userA, recipeB]);
    await database.query(`
      insert into public.meal_plan_entries (id, user_id, recipe_id, meal_slot, planned_at, target_servings)
      values ($1, $2, $3, 'dinner', '2026-08-31T10:00:00Z', 2)
    `, [mealPlanA, userA, recipeA]);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("allows an owner to complete a record and marks the linked meal plan item complete", async () => {
    const result = await database.query<{ id: string }>(
      "select public.complete_cooking_record($1::jsonb) as id",
      [JSON.stringify({
        id: recordA,
        recipeId: recipeA,
        recipeTitleSnapshot: "番茄炒蛋",
        mealPlanEntryId: mealPlanA,
        startedAt: "2026-08-31T10:30:00Z",
        completedAt: "2026-08-31T11:00:00Z",
        actualServings: 2,
        rating: 5,
        improvementNotes: "下次少放一点盐",
        photos: [
          { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad", storagePath: `${userA}/cooking-records/${recordA}/photo.webp`, sortOrder: 0 },
        ],
      })],
    );

    expect(result.rows[0].id).toBe(recordA);
    expect((await database.query("select id, recipe_id, rating from public.cooking_records")).rows).toEqual([
      { id: recordA, recipe_id: recipeA, rating: 5 },
    ]);
    expect((await database.query("select status from public.meal_plan_entries where id = $1", [mealPlanA])).rows).toEqual([
      { status: "completed" },
    ]);
    expect((await database.query("select storage_path from public.cooking_record_photos where cooking_record_id = $1", [recordA])).rows).toEqual([
      { storage_path: `${userA}/cooking-records/${recordA}/photo.webp` },
    ]);
  });

  it("keeps records private and rejects cross-user reads, writes, and links", async () => {
    await database.query(`
      insert into public.cooking_records
        (id, user_id, recipe_id, recipe_title_snapshot, started_at, completed_at, actual_servings, rating)
      values ($1, $2, $3, '番茄炒蛋', '2026-08-31T10:00:00Z', '2026-08-31T10:01:00Z', 2, 4)
    `, [recordA, userA, recipeA]);

    await asUser(database, userB);
    expect((await database.query("select id from public.cooking_records")).rows).toEqual([]);
    expect((await database.query("update public.cooking_records set rating = 1 where id = $1", [recordA])).rowCount).toBe(0);
    await expect(database.query(`
      insert into public.cooking_records
        (id, user_id, recipe_id, recipe_title_snapshot, started_at, completed_at, actual_servings)
      values ($1, $2, $3, '越权', '2026-08-31T10:00:00Z', '2026-08-31T10:01:00Z', 1)
    `, ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc", userB, recipeA])).rejects.toThrow();
  });

  it("rejects foreign recipe or meal-plan links and rolls back the transaction", async () => {
    await expect(database.query(
      "select public.complete_cooking_record($1::jsonb)",
      [JSON.stringify({
        id: recordA,
        recipeId: recipeB,
        recipeTitleSnapshot: "鱼香肉丝",
        mealPlanEntryId: mealPlanA,
        startedAt: "2026-08-31T10:00:00Z",
        actualServings: 1,
      })],
    )).rejects.toThrow();
    expect((await database.query("select id from public.cooking_records")).rows).toEqual([]);
  });

  it("enforces rating, time, photo count, sort order, and snapshot constraints", async () => {
    await expect(database.query(`
      insert into public.cooking_records
        (id, user_id, recipe_id, recipe_title_snapshot, started_at, completed_at, actual_servings, rating)
      values ($1, $2, $3, '错误评分', '2026-08-31T10:00:00Z', '2026-08-31T11:00:00Z', 1, 6)
    `, [recordA, userA, recipeA])).rejects.toThrow();

    await database.query(`
      insert into public.cooking_records
        (id, user_id, recipe_id, recipe_title_snapshot, started_at, completed_at, actual_servings)
      values ($1, $2, $3, '合法记录', '2026-08-31T10:00:00Z', '2026-08-31T10:01:00Z', 1)
    `, [recordA, userA, recipeA]);
    await expect(database.query(`
      insert into public.cooking_record_photos (id, user_id, cooking_record_id, storage_path, sort_order)
      values
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad', $1, $2, 'a/c/0.webp', 0),
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae', $1, $2, 'a/c/1.webp', 0)
    `, [userA, recordA])).rejects.toThrow();
    await expect(database.query(`
      insert into public.cooking_record_photos (id, user_id, cooking_record_id, storage_path, sort_order)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf', $1, $2, 'a/c/3.webp', 3)
    `, [userA, recordA])).rejects.toThrow();
  });

  it("preserves snapshots while nulling deleted recipe and menu references", async () => {
    await database.query(`
      insert into public.cooking_records
        (id, user_id, recipe_id, recipe_title_snapshot, meal_plan_entry_id, started_at, completed_at, actual_servings)
      values ($1, $2, $3, '番茄炒蛋', $4, '2026-08-31T10:00:00Z', '2026-08-31T10:01:00Z', 2)
    `, [recordA, userA, recipeA, mealPlanA]);
    await database.query("delete from public.recipes where id = $1 and user_id = $2", [recipeA, userA]);
    const row = await database.query<{ recipe_id: string | null; meal_plan_entry_id: string | null; recipe_title_snapshot: string }>(
      "select recipe_id, meal_plan_entry_id, recipe_title_snapshot from public.cooking_records where id = $1",
      [recordA],
    );
    expect(row.rows).toEqual([{ recipe_id: null, meal_plan_entry_id: null, recipe_title_snapshot: "番茄炒蛋" }]);
  });

  it("cascades photo metadata when a record is deleted and denies anonymous access", async () => {
    await database.query(`
      insert into public.cooking_records
        (id, user_id, recipe_title_snapshot, started_at, actual_servings)
      values ($1, $2, '番茄炒蛋', now(), 1)
    `, [recordA, userA]);
    await database.query(`
      insert into public.cooking_record_photos (id, user_id, cooking_record_id, storage_path, sort_order)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad', $1, $2, 'a/c/0.webp', 0)
    `, [userA, recordA]);
    await database.query("delete from public.cooking_records where id = $1", [recordA]);
    expect((await database.query("select id from public.cooking_record_photos")).rows).toEqual([]);

    await database.exec("set role anon");
    await expect(database.query("select id from public.cooking_records")).rejects.toThrow();
  });
});
