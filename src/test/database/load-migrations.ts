import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");

export async function loadRecipeMigrations(database: PGlite) {
  const entries = await (await import("node:fs/promises")).readdir(migrationDirectory);
  const migrationNames = entries
    .filter((entry) => entry.endsWith("_recipe_management.sql"))
    .sort();

  if (migrationNames.length !== 1) {
    throw new Error(
      `Expected one recipe migration, found ${migrationNames.length}: ${migrationNames.join(", ")}`,
    );
  }

  const migration = await readFile(join(migrationDirectory, migrationNames[0]), "utf8");
  await database.exec(migration);
}
