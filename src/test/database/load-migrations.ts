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
  await loadSingleMigration(database, "_recipe_imports.sql", "recipe import");
  const entries = await (await import("node:fs/promises")).readdir(migrationDirectory);
  const followUpNames = entries.filter((entry) => entry.endsWith("_recipe_import_ai_provider.sql")).sort();
  for (const migrationName of followUpNames) {
    await database.exec(await readFile(join(migrationDirectory, migrationName), "utf8"));
  }
  await loadSingleMigration(database, "_recipe_preparations.sql", "recipe preparation");
}

export async function loadShoppingMigrations(database: PGlite) {
  await loadRecipeMigrations(database);
  await loadSingleMigration(database, "_shopping_lists.sql", "shopping");
}

export async function loadMealPlanMigrations(database: PGlite) {
  await loadShoppingMigrations(database);
  await loadSingleMigration(database, "_meal_plan_entries.sql", "meal plan");
}
