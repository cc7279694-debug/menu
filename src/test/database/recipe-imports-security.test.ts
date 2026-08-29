import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PGlite } from "@electric-sql/pglite";

import { asUser, createDatabase } from "@/test/database/bootstrap";
import { loadRecipeMigrations } from "@/test/database/load-migrations";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const jobId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("recipe import security", () => {
  let database: PGlite;

  beforeEach(async () => {
    database = await createDatabase();
    await loadRecipeMigrations(database);
    await database.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      userA,
      "a@example.test",
      userB,
      "b@example.test",
    ]);
    await asUser(database, userA);
    await database.query(
      "insert into public.recipe_import_jobs (id, user_id, source_type, source_text) values ($1, $2, 'text', $3)",
      [jobId, userA, "番茄炒蛋需要两个番茄和两个鸡蛋，先切块再炒熟。"],
    );
    await database.query(
      "insert into storage.objects (bucket_id, name, owner_id) values ('recipe-imports', $1, $2)",
      [`${userA}/${jobId}/one.webp`, userA],
    );
  });

  afterEach(async () => {
    await database.close();
  });

  it("hides another user's import job and image", async () => {
    await asUser(database, userB);
    expect((await database.query("select id from public.recipe_import_jobs")).rows).toEqual([]);
    expect((await database.query("select name from storage.objects")).rows).toEqual([]);
  });

  it("prevents another user from updating or deleting the job", async () => {
    await asUser(database, userB);
    expect(
      (await database.query("update public.recipe_import_jobs set status = 'failed' where id = $1", [jobId])).rowCount,
    ).toBe(0);
    expect(
      (await database.query("delete from public.recipe_import_jobs where id = $1", [jobId])).rowCount,
    ).toBe(0);
  });

  it("allows the owner to delete only the owner's import prefix", async () => {
    const deleted = await database.query(
      "delete from storage.objects where bucket_id = 'recipe-imports' and name = $1",
      [`${userA}/${jobId}/one.webp`],
    );
    expect(deleted.rowCount).toBe(1);
  });
});
