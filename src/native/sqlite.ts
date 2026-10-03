import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import {
  RecipeNameStore,
  schemaStatements,
  schemaVersion,
} from "./recipe-store";

const connection = new SQLiteConnection(CapacitorSQLite);
let opening: Promise<RecipeNameStore> | null = null;

export function openRecipeStore(): Promise<RecipeNameStore> {
  if (!opening)
    opening = open().catch((error) => {
      opening = null;
      throw error;
    });
  return opening;
}

async function open(): Promise<RecipeNameStore> {
  if (Capacitor.getPlatform() !== "android") {
    throw new Error(
      "此入口用于 Android APK，浏览器预览不能替代原生 SQLite 验收。",
    );
  }
  await connection.addUpgradeStatement("recipio", [
    { toVersion: schemaVersion, statements: schemaStatements },
  ]);
  const consistent = await connection.checkConnectionsConsistency();
  const exists = await connection.isConnection("recipio", false);
  const db =
    consistent.result && exists.result
      ? await connection.retrieveConnection("recipio", false)
      : await connection.createConnection(
          "recipio",
          false,
          "no-encryption",
          schemaVersion,
          false,
        );
  if (!(await db.isDBOpen()).result) await db.open();
  const store = new RecipeNameStore({
    query: async (sql, values) => (await db.query(sql, values)).values ?? [],
    run: async (sql, values) =>
      (await db.run(sql, values)).changes?.changes ?? 0,
  });
  await store.purgeExpired();
  return store;
}
