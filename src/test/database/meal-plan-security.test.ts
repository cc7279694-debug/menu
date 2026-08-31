import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asUser, createDatabase } from "@/test/database/bootstrap";
import { loadMealPlanMigrations } from "@/test/database/load-migrations";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const recipeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("meal plan security", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadMealPlanMigrations(database);
    await database.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      userA,
      "a@example.test",
      userB,
      "b@example.test",
    ]);
    await asUser(database, userA);
    await database.query(`
      insert into public.recipes (id, user_id, title, base_servings)
      values ($1, $2, '番茄炒蛋', 2)
    `, [recipeA, userA]);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("allows an owner to create and update multiple dishes in one meal slot", async () => {
    await database.query(`
      insert into public.meal_plan_entries
        (user_id, recipe_id, meal_slot, planned_at, target_servings)
      values
        ($1, $2, 'dinner', '2026-08-31T10:00:00Z', 2),
        ($1, $2, 'dinner', '2026-08-31T10:00:00Z', 4)
    `, [userA, recipeA]);

    const update = await database.query(`
      update public.meal_plan_entries
      set status = 'completed'
      where user_id = $1
    `, [userA]);
    expect(update.rowCount).toBe(2);
  });

  it("moves one entry to another date and meal slot without changing the other dish", async () => {
    const inserted = await database.query<{ id: string }>(`
      insert into public.meal_plan_entries
        (user_id, recipe_id, meal_slot, planned_at, target_servings)
      values
        ($1, $2, 'dinner', '2026-08-31T10:00:00Z', 2),
        ($1, $2, 'dinner', '2026-08-31T10:00:00Z', 4)
      returning id
    `, [userA, recipeA]);

    await database.query(`
      update public.meal_plan_entries
      set meal_slot = 'lunch', planned_at = '2026-09-01T04:00:00Z'
      where id = $1
    `, [inserted.rows[0].id]);

    const rows = await database.query<{ meal_slot: string; planned_at: Date }>(`
      select meal_slot, planned_at
      from public.meal_plan_entries
      order by planned_at, id
    `);
    expect(rows.rows.map((row) => row.meal_slot).sort()).toEqual(["dinner", "lunch"]);
  });

  it("prevents another user from reading or mutating entries and rejects foreign recipes", async () => {
    const created = await database.query<{ id: string }>(`
      insert into public.meal_plan_entries
        (user_id, recipe_id, meal_slot, planned_at, target_servings)
      values ($1, $2, 'lunch', '2026-08-31T04:00:00Z', 2)
      returning id
    `, [userA, recipeA]);

    await asUser(database, userB);
    expect((await database.query("select id from public.meal_plan_entries")).rows).toEqual([]);
    expect((await database.query(
      "update public.meal_plan_entries set note = '越权' where id = $1",
      [created.rows[0].id],
    )).rowCount).toBe(0);
    await expect(database.query(`
      insert into public.meal_plan_entries
        (user_id, recipe_id, meal_slot, planned_at, target_servings)
      values ($1, $2, 'lunch', '2026-08-31T04:00:00Z', 2)
    `, [userB, recipeA])).rejects.toThrow();
  });

  it("denies anonymous access", async () => {
    await database.exec("set role anon");
    await expect(database.query("select id from public.meal_plan_entries")).rejects.toThrow();
  });

  it("cascades planned entries when their recipe is physically deleted", async () => {
    await database.query(`
      insert into public.meal_plan_entries
        (user_id, recipe_id, meal_slot, planned_at, target_servings)
      values ($1, $2, 'breakfast', '2026-09-01T00:00:00Z', 2)
    `, [userA, recipeA]);
    await database.query("delete from public.recipes where id = $1 and user_id = $2", [recipeA, userA]);
    expect((await database.query("select id from public.meal_plan_entries")).rows).toEqual([]);
  });

  it("rolls back a meal plan write without leaving partial data", async () => {
    await database.exec("begin");
    await database.query(`
      insert into public.meal_plan_entries
        (user_id, recipe_id, meal_slot, planned_at, target_servings)
      values ($1, $2, 'breakfast', '2026-09-01T00:00:00Z', 2)
    `, [userA, recipeA]);
    await database.exec("rollback");
    expect((await database.query("select id from public.meal_plan_entries")).rows).toEqual([]);
  });
});
