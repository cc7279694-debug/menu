import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asUser, createDatabase } from "@/test/database/bootstrap";
import { loadRecipeMigrations } from "@/test/database/load-migrations";

const userId = "11111111-1111-4111-8111-111111111111";
const jobId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("recipe import migration", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadRecipeMigrations(database);
  });

  afterEach(async () => {
    await database?.close();
  });

  it("creates import tables with forced RLS and a private bucket", async () => {
    const tables = await database.query<{ tablename: string; rowsecurity: boolean; force: boolean }>(
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
      [["recipe_import_jobs", "recipe_sources"]],
    );

    expect(tables.rows).toEqual([
      { tablename: "recipe_import_jobs", rowsecurity: true, force: true },
      { tablename: "recipe_sources", rowsecurity: true, force: true },
    ]);

    const bucket = await database.query<{ id: string; public: boolean; file_size_limit: number }>(
      "select id, public, file_size_limit from storage.buckets where id = 'recipe-imports'",
    );
    expect(bucket.rows).toEqual([{ id: "recipe-imports", public: false, file_size_limit: 5242880 }]);
  });

  it("defaults the job to queued for one-day retention", async () => {
    await database.query("insert into auth.users (id, email) values ($1, $2)", [userId, "a@example.test"]);
    await asUser(database, userId);
    const result = await database.query<{ status: string; ai_provider: string; image_paths: unknown; expires_at: string }>(
      `insert into public.recipe_import_jobs (id, user_id, source_type)
       values ($1, $2, 'images')
       returning status, ai_provider, image_paths, expires_at`,
      [jobId, userId],
    );

    expect(result.rows[0]?.status).toBe("queued");
    expect(result.rows[0]?.ai_provider).toBe("auto");
    expect(result.rows[0]?.image_paths).toEqual([]);
    expect(Date.parse(result.rows[0]?.expires_at ?? "")).toBeGreaterThan(Date.now());
  });

  it("keeps ingredient groups and heat level constrained", async () => {
    const columns = await database.query<{ table_name: string; column_name: string }>(
      `
        select table_name, column_name
        from information_schema.columns
        where table_schema = 'public'
          and ((table_name = 'recipe_ingredients' and column_name = 'group_type')
            or (table_name = 'recipe_import_jobs' and column_name = 'ai_provider')
            or (table_name = 'recipe_steps' and column_name = 'heat_level'))
        order by table_name, column_name
      `,
    );
    expect(columns.rows).toEqual([
      { table_name: "recipe_import_jobs", column_name: "ai_provider" },
      { table_name: "recipe_ingredients", column_name: "group_type" },
      { table_name: "recipe_steps", column_name: "heat_level" },
    ]);
  });
});
