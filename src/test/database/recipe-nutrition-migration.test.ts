import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { createDatabase } from "@/test/database/bootstrap";
import { loadRecipeNutritionMigrations } from "@/test/database/load-migrations";

describe("recipe nutrition migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadRecipeNutritionMigrations(database);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("creates a private recipe nutrition table with forced RLS", async () => {
    const result = await database.query<{ relname: string; rowsecurity: boolean; force: boolean }>(`
      select c.relname, c.relrowsecurity as rowsecurity, c.relforcerowsecurity as force
      from pg_class c
      where c.oid = 'public.recipe_nutrition'::regclass
    `);

    expect(result.rows).toEqual([
      { relname: "recipe_nutrition", rowsecurity: true, force: true },
    ]);
  });

  it("defines nutrition columns, ownership, value constraints and grants", async () => {
    const columns = await database.query<{ column_name: string; data_type: string }>(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = 'recipe_nutrition'
      order by ordinal_position
    `);

    expect(columns.rows).toEqual([
      { column_name: "user_id", data_type: "uuid" },
      { column_name: "recipe_id", data_type: "uuid" },
      { column_name: "calories_kcal", data_type: "numeric" },
      { column_name: "protein_grams", data_type: "numeric" },
      { column_name: "fat_grams", data_type: "numeric" },
      { column_name: "carbs_grams", data_type: "numeric" },
      { column_name: "is_estimated", data_type: "boolean" },
      { column_name: "created_at", data_type: "timestamp with time zone" },
      { column_name: "updated_at", data_type: "timestamp with time zone" },
    ]);

    const constraints = await database.query<{ conname: string }>(`
      select conname
      from pg_constraint
      where connamespace = 'public'::regnamespace
        and conname in (
          'recipe_nutrition_pkey',
          'recipe_nutrition_user_fk',
          'recipe_nutrition_recipe_owner_fk',
          'recipe_nutrition_has_value',
          'recipe_nutrition_calories_range',
          'recipe_nutrition_protein_range',
          'recipe_nutrition_fat_range',
          'recipe_nutrition_carbs_range'
        )
      order by conname
    `);

    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "recipe_nutrition_calories_range",
      "recipe_nutrition_carbs_range",
      "recipe_nutrition_fat_range",
      "recipe_nutrition_has_value",
      "recipe_nutrition_pkey",
      "recipe_nutrition_protein_range",
      "recipe_nutrition_recipe_owner_fk",
      "recipe_nutrition_user_fk",
    ]);

    const privileges = await database.query<{ grantee: string; privilege_type: string }>(`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'recipe_nutrition'
        and grantee <> 'postgres'
      order by grantee, privilege_type
    `);

    expect(privileges.rows).toEqual([
      { grantee: "authenticated", privilege_type: "DELETE" },
      { grantee: "authenticated", privilege_type: "INSERT" },
      { grantee: "authenticated", privilege_type: "SELECT" },
      { grantee: "authenticated", privilege_type: "UPDATE" },
    ]);
  });

  it("keeps save and search functions invoker-only with nutrition output", async () => {
    const functions = await database.query<{ proname: string; prosecdef: boolean; proargcount: number }>(`
      select p.proname, p.prosecdef, p.pronargs as proargcount
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('save_recipe', 'search_recipe_summaries')
      order by p.proname
    `);

    expect(functions.rows).toEqual([
      { proname: "save_recipe", prosecdef: false, proargcount: 1 },
      { proname: "search_recipe_summaries", prosecdef: false, proargcount: 7 },
    ]);

    const returnColumns = await database.query<{ parameter_name: string }>(`
      select parameter_name
      from information_schema.parameters
      where specific_schema = 'public'
        and specific_name like 'search_recipe_summaries%'
        and parameter_mode = 'OUT'
      order by ordinal_position
    `);

    expect(returnColumns.rows.some((row) => row.parameter_name === "nutrition")).toBe(true);
  });
});
