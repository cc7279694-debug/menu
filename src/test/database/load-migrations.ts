import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");

async function loadSingleMigration(database: PGlite, suffix: string, label: string) {
  const entries = await (await import("node:fs/promises")).readdir(migrationDirectory);
  const migrationNames = entries.filter((entry) => entry.endsWith(suffix)).sort();

  if (migrationNames.length !== 1) {
    throw new Error(
      `Expected one ${label} migration, found ${migrationNames.length}: ${migrationNames.join(", ")}`,
    );
  }

  const migration = await readFile(join(migrationDirectory, migrationNames[0]), "utf8");
  await database.exec(migration);
}

export async function loadRecipeMigrations(database: PGlite) {
  await loadSingleMigration(database, "_recipe_management.sql", "recipe");
}

export async function loadShoppingMigrations(database: PGlite) {
  await loadRecipeMigrations(database);
  await loadSingleMigration(database, "_shopping_lists.sql", "shopping");
}
