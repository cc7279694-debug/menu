import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { createDatabase } from "@/test/database/bootstrap";
import { loadCookingHistoryMigrations } from "@/test/database/load-migrations";

describe("cooking history migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadCookingHistoryMigrations(database);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("creates private history tables with forced RLS", async () => {
    const result = await database.query<{ relname: string; rowsecurity: boolean; force: boolean }>(`
      select c.relname, c.relrowsecurity as rowsecurity, c.relforcerowsecurity as force
      from pg_class c
      where c.oid in ('public.cooking_records'::regclass, 'public.cooking_record_photos'::regclass)
      order by c.relname
    `);

    expect(result.rows).toEqual([
      { relname: "cooking_record_photos", rowsecurity: true, force: true },
      { relname: "cooking_records", rowsecurity: true, force: true },
    ]);
  });

  it("defines ownership links, validation constraints, indexes, and authenticated-only grants", async () => {
    const constraints = await database.query<{ conname: string }>(`
      select conname
      from pg_constraint
      where connamespace = 'public'::regnamespace
        and conname in (
          'cooking_records_user_fk',
          'cooking_records_recipe_owner_fk',
          'cooking_records_meal_plan_owner_fk',
          'cooking_records_title_length',
          'cooking_records_servings_range',
          'cooking_records_rating_range',
          'cooking_records_notes_length',
          'cooking_records_time_order',
          'cooking_record_photos_record_owner_fk',
          'cooking_record_photos_sort_range',
          'cooking_record_photos_record_sort_unique'
        )
      order by conname
    `);

    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "cooking_record_photos_record_owner_fk",
      "cooking_record_photos_record_sort_unique",
      "cooking_record_photos_sort_range",
      "cooking_records_meal_plan_owner_fk",
      "cooking_records_notes_length",
      "cooking_records_rating_range",
      "cooking_records_recipe_owner_fk",
      "cooking_records_servings_range",
      "cooking_records_time_order",
      "cooking_records_title_length",
      "cooking_records_user_fk",
    ]);

    const indexes = await database.query<{ indexname: string }>(`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'cooking_records_user_recipe_completed_idx',
          'cooking_records_user_meal_plan_idx',
          'cooking_record_photos_user_record_idx'
        )
      order by indexname
    `);
    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "cooking_record_photos_user_record_idx",
      "cooking_records_user_meal_plan_idx",
      "cooking_records_user_recipe_completed_idx",
    ]);

    const privileges = await database.query<{ grantee: string; table_name: string; privilege_type: string }>(`
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('cooking_records', 'cooking_record_photos')
        and grantee in ('anon', 'authenticated')
      order by table_name, grantee, privilege_type
    `);
    expect(privileges.rows).toHaveLength(8);
    expect(privileges.rows.every((row) => row.grantee === "authenticated")).toBe(true);
  });

  it("exposes invoker RPCs without SECURITY DEFINER", async () => {
    const result = await database.query<{ proname: string; prosecdef: boolean }>(`
      select p.proname, p.prosecdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('complete_cooking_record', 'get_recipe_cooking_history_stats')
      order by p.proname
    `);
    expect(result.rows).toEqual([
      { proname: "complete_cooking_record", prosecdef: false },
      { proname: "get_recipe_cooking_history_stats", prosecdef: false },
    ]);
  });
});
