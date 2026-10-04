import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import {
  RecipeNameStore,
  migrationStatements,
  schemaVersion,
  type SqlDriver,
} from "./recipe-store";
import { SQLiteBackupRepository } from "./backup/repository";

const connection = new SQLiteConnection(CapacitorSQLite);
let opening: Promise<RecipeNameStore> | null = null;
let backupRepository: SQLiteBackupRepository | null = null;
export async function openBackupRepository() { await openRecipeStore(); if (!backupRepository) throw new Error("备份数据层未就绪"); return backupRepository; }

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
  await connection.addUpgradeStatement("recipio", migrationStatements);
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
  await db.execute("PRAGMA foreign_keys=ON", false);
  const inside: SqlDriver = {
    query: async (sql, values) => (await db.query(sql, values)).values ?? [],
    run: async (sql, values) =>
      (await db.run(sql, values, false)).changes?.changes ?? 0,
    batch: async (statements) => {
      await db.executeSet(statements, false);
    },
  };
  const driver: SqlDriver = { ...inside,
    run: async (sql, values) => (await db.run(sql, values, true)).changes?.changes ?? 0,
    batch: async statements => { await db.executeSet(statements, true); },
    transaction: async work => {
      await db.beginTransaction();
      try { const value = await work(inside); await db.commitTransaction(); return value; }
      catch (error) {
        if ((await db.isTransactionActive()).result) await db.rollbackTransaction();
        throw error;
      }
    },
  };
  const store = new RecipeNameStore(driver);
  backupRepository = new SQLiteBackupRepository(driver);
  await store.purgeExpired();
  return store;
}
