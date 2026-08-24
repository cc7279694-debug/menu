import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { createDatabase } from "@/test/database/bootstrap";
import { loadShoppingMigrations } from "@/test/database/load-migrations";

const shoppingTables = [
  "shopping_lists",
  "shopping_list_sources",
  "shopping_list_items",
  "shopping_list_item_sources",
] as const;

describe("shopping list migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadShoppingMigrations(database);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("creates every private shopping table with forced RLS", async () => {
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
      [shoppingTables],
    );

    expect(result.rows).toHaveLength(shoppingTables.length);
    expect(result.rows.every((row) => row.rowsecurity && row.force)).toBe(true);
  });

  it("creates the active-list index, leading user indexes, and ownership foreign keys", async () => {
    const indexes = await database.query<{ indexname: string }>(
      `
        select indexname
        from pg_indexes
        where schemaname = 'public'
          and indexname in (
            'shopping_lists_one_active_per_user_idx',
            'shopping_lists_user_updated_idx',
            'shopping_list_sources_user_list_idx',
            'shopping_list_items_user_list_idx',
            'shopping_list_item_sources_user_list_item_idx'
          )
        order by indexname
      `,
    );

    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "shopping_list_item_sources_user_list_item_idx",
      "shopping_list_items_user_list_idx",
      "shopping_list_sources_user_list_idx",
      "shopping_lists_one_active_per_user_idx",
      "shopping_lists_user_updated_idx",
    ]);

    const indexedColumns = await database.query<{ indexname: string; first_column: string }>(
      `
        select c2.relname as indexname, a.attname as first_column
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_index i on i.indrelid = c.oid
        join pg_class c2 on c2.oid = i.indexrelid
        join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
        where n.nspname = 'public'
          and c2.relname in (
            'shopping_lists_one_active_per_user_idx',
            'shopping_lists_user_updated_idx',
            'shopping_list_sources_user_list_idx',
            'shopping_list_items_user_list_idx',
            'shopping_list_item_sources_user_list_item_idx'
          )
        order by c2.relname
      `,
    );

    expect(indexedColumns.rows.every((row) => row.first_column === "user_id")).toBe(true);

    const constraints = await database.query<{ conname: string }>(
      `
        select conname
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conname in (
            'shopping_list_sources_list_owner_fk',
            'shopping_list_sources_recipe_owner_fk',
            'shopping_list_items_list_owner_fk',
            'shopping_list_items_ingredient_owner_fk',
            'shopping_list_item_sources_item_owner_fk',
            'shopping_list_item_sources_source_owner_fk',
            'shopping_list_item_sources_recipe_ingredient_owner_fk'
          )
        order by conname
      `,
    );

    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "shopping_list_item_sources_item_owner_fk",
      "shopping_list_item_sources_recipe_ingredient_owner_fk",
      "shopping_list_item_sources_source_owner_fk",
      "shopping_list_items_ingredient_owner_fk",
      "shopping_list_items_list_owner_fk",
      "shopping_list_sources_list_owner_fk",
      "shopping_list_sources_recipe_owner_fk",
    ]);
  });

  it("adds constraint coverage for names, amounts, and active-list shape", async () => {
    const constraints = await database.query<{ conname: string }>(
      `
        select conname
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conname in (
            'shopping_lists_name_length',
            'shopping_list_sources_servings_range',
            'shopping_list_items_name_length',
            'shopping_list_items_quantity_positive',
            'shopping_list_items_quantity_text_length',
            'shopping_list_items_amount_shape',
            'shopping_list_items_unit_length',
            'shopping_list_items_aisle_length',
            'shopping_list_items_sort_nonnegative',
            'shopping_list_item_sources_quantity_positive',
            'shopping_list_item_sources_text_length',
            'shopping_list_item_sources_amount_shape',
            'shopping_list_item_sources_unit_length'
          )
        order by conname
      `,
    );

    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "shopping_list_item_sources_amount_shape",
      "shopping_list_item_sources_quantity_positive",
      "shopping_list_item_sources_text_length",
      "shopping_list_item_sources_unit_length",
      "shopping_list_items_aisle_length",
      "shopping_list_items_amount_shape",
      "shopping_list_items_name_length",
      "shopping_list_items_quantity_positive",
      "shopping_list_items_quantity_text_length",
      "shopping_list_items_sort_nonnegative",
      "shopping_list_items_unit_length",
      "shopping_list_sources_servings_range",
      "shopping_lists_name_length",
    ]);
  });

  it("grants table access and function execution only to authenticated users", async () => {
    const tablePrivileges = await database.query<{ tablename: string; grantee: string; privilege_type: string }>(
      `
        select table_name as tablename, grantee, privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = any($1::text[])
          and grantee in ('anon', 'authenticated')
        order by table_name, grantee, privilege_type
      `,
      [shoppingTables],
    );

    expect(tablePrivileges.rows.every((row) => row.grantee === "authenticated")).toBe(true);
    expect(tablePrivileges.rows).toHaveLength(shoppingTables.length * 4);

    const functionPrivileges = await database.query<{ routine_name: string; grantee: string }>(
      `
        select routine_name, grantee
        from information_schema.routine_privileges
        where specific_schema = 'public'
          and routine_name in ('replace_active_shopping_list', 'reorder_shopping_items')
          and grantee in ('public', 'anon', 'authenticated')
        order by routine_name, grantee
      `,
    );

    expect(functionPrivileges.rows.map((row) => row.routine_name).sort()).toEqual([
      "reorder_shopping_items",
      "replace_active_shopping_list",
    ]);
    expect(functionPrivileges.rows.every((row) => row.grantee === "authenticated")).toBe(true);
  });
});
