import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { createDatabase } from "@/test/database/bootstrap";
import { loadMealPlanMigrations } from "@/test/database/load-migrations";

describe("meal plan migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadMealPlanMigrations(database);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("creates the private meal plan table with forced RLS", async () => {
    const result = await database.query<{ rowsecurity: boolean; force: boolean }>(`
      select relrowsecurity as rowsecurity, relforcerowsecurity as force
      from pg_class
      where oid = 'public.meal_plan_entries'::regclass
    `);

    expect(result.rows).toEqual([{ rowsecurity: true, force: true }]);
  });

  it("defines normalized status, slot, servings, note, and UTC planning constraints", async () => {
    const constraints = await database.query<{ conname: string }>(`
      select conname
      from pg_constraint
      where connamespace = 'public'::regnamespace
        and conname in (
          'meal_plan_entries_status_check',
          'meal_plan_entries_meal_slot_check',
          'meal_plan_entries_target_servings_check',
          'meal_plan_entries_note_length'
        )
      order by conname
    `);

    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "meal_plan_entries_meal_slot_check",
      "meal_plan_entries_note_length",
      "meal_plan_entries_status_check",
      "meal_plan_entries_target_servings_check",
    ]);

    const plannedAt = await database.query<{ data_type: string }>(`
      select data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'meal_plan_entries'
        and column_name = 'planned_at'
    `);
    expect(plannedAt.rows).toEqual([{ data_type: "timestamp with time zone" }]);
  });

  it("creates ownership foreign keys, user-leading indexes, and authenticated-only CRUD grants", async () => {
    const constraints = await database.query<{ conname: string }>(`
      select conname
      from pg_constraint
      where connamespace = 'public'::regnamespace
        and conname in (
          'meal_plan_entries_user_fk',
          'meal_plan_entries_recipe_owner_fk'
        )
      order by conname
    `);
    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "meal_plan_entries_recipe_owner_fk",
      "meal_plan_entries_user_fk",
    ]);

    const indexes = await database.query<{ indexname: string }>(`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'meal_plan_entries_user_planned_idx',
          'meal_plan_entries_user_recipe_idx'
        )
      order by indexname
    `);
    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "meal_plan_entries_user_planned_idx",
      "meal_plan_entries_user_recipe_idx",
    ]);

    const privileges = await database.query<{ grantee: string; privilege_type: string }>(`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'meal_plan_entries'
        and grantee in ('anon', 'authenticated')
      order by grantee, privilege_type
    `);
    expect(privileges.rows).toHaveLength(4);
    expect(privileges.rows.every((row) => row.grantee === "authenticated")).toBe(true);
  });
});
