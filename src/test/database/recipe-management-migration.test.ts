import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { createDatabase } from "@/test/database/bootstrap";
import { loadRecipeMigrations } from "@/test/database/load-migrations";

const expectedTables = [
  "profiles",
  "categories",
  "tags",
  "recipes",
  "recipe_tags",
  "ingredients",
  "recipe_ingredients",
  "recipe_steps",
  "step_ingredients",
];

describe("recipe management migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadRecipeMigrations(database);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("creates every private recipe table with forced RLS", async () => {
    const result = await database.query<{ tablename: string; rowsecurity: boolean; force: boolean }>(
      `
        select c.relname as tablename,
               c.relrowsecurity as rowsecurity,
               c.relforcerowsecurity as force
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and c.relname = any($1::text[])
        order by c.relname
      `,
      [expectedTables],
    );

    expect(result.rows).toHaveLength(expectedTables.length);
    expect(result.rows.every((row) => row.rowsecurity && row.force)).toBe(true);
  });

  it("creates a private recipe-media bucket", async () => {
    const result = await database.query<{ id: string; public: boolean; file_size_limit: number }>(
      "select id, public, file_size_limit from storage.buckets where id = 'recipe-media'",
    );

    expect(result.rows).toEqual([
      { id: "recipe-media", public: false, file_size_limit: 5242880 },
    ]);
  });

  it("exposes atomic save and search functions only to authenticated users", async () => {
    const result = await database.query<{ routine_name: string; grantee: string }>(
      `
        select p.proname as routine_name, g.grantee
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        join information_schema.routine_privileges g
          on g.routine_schema = n.nspname
         and g.routine_name = p.proname
        where n.nspname = 'public'
          and p.proname in ('save_recipe', 'search_recipe_summaries')
          and g.grantee = 'authenticated'
      `,
    );

    expect(result.rows.map((row) => row.routine_name).sort()).toEqual([
      "save_recipe",
      "search_recipe_summaries",
    ]);
  });

  it("keeps ownership and search indexes on the migration boundary", async () => {
    const indexes = await database.query<{ indexname: string }>(
      `
        select indexname
        from pg_indexes
        where schemaname = 'public'
          and indexname in (
            'recipes_user_updated_active_idx',
            'recipes_user_favorite_idx',
            'recipes_user_deleted_idx',
            'recipes_title_search_idx',
            'ingredients_name_search_idx',
            'tags_name_search_idx'
          )
        order by indexname
      `,
    );

    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "ingredients_name_search_idx",
      "recipes_title_search_idx",
      "recipes_user_deleted_idx",
      "recipes_user_favorite_idx",
      "recipes_user_updated_active_idx",
      "tags_name_search_idx",
    ]);

    const storagePolicies = await database.query<{ policyname: string }>(
      `
        select policyname
        from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
      `,
    );
    expect(storagePolicies.rows.map((row) => row.policyname).sort()).toEqual([
      "recipe_media_delete",
      "recipe_media_insert",
      "recipe_media_select",
    ]);
  });
});
