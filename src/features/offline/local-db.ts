import Dexie, { type IndexableType, type Table } from "dexie";
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  OfflineProfile,
  OfflineRecipeSnapshot,
  OfflineShoppingSnapshot,
  OfflineShoppingToggle,
} from "./types";

export const RECIPIO_LOCAL_DB_NAME = "recipio-local-v2";
export const RECIPIO_LOCAL_DB_VERSION = 2;
export const LEGACY_OFFLINE_DB_NAME = "ordine-offline";
export const LEGACY_MIGRATION_META_ID = "legacy-idb-migration-v1";

export type LocalMetaRecord = {
  id: string;
  status: "complete";
  completedAt: string;
};

export type LocalRecipeDraftRecord = {
  userId: string;
  draftId: string;
  updatedAt: string;
  payload: unknown;
};

export type LocalRecipeMediaRecord = {
  userId: string;
  recipeId: string;
  mediaId: string;
  sourceKey: string;
  mimeType: string;
  byteSize: number;
  cachedAt: string;
  blob: Blob;
};

export type LocalCookingSessionRecord = {
  userId: string;
  recipeId: string;
  updatedAt: string;
  payload: unknown;
};

export type LocalMutationRecord = {
  id: string;
  userId: string;
  entity: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  queuedAt: string;
  attemptCount: number;
  lastError: string | null;
  payload: unknown;
};

export type LocalSyncMetaRecord = {
  userId: string;
  scope: string;
  cursor: string | null;
  updatedAt: string;
};

export class RecipioLocalDatabase extends Dexie {
  profiles!: Table<OfflineProfile, IndexableType>;
  recipes!: Table<OfflineRecipeSnapshot, IndexableType>;
  shoppingSnapshots!: Table<OfflineShoppingSnapshot, IndexableType>;
  shoppingToggleQueue!: Table<OfflineShoppingToggle, IndexableType>;
  meta!: Table<LocalMetaRecord, IndexableType>;
  recipeDrafts!: Table<LocalRecipeDraftRecord, IndexableType>;
  cookingSessions!: Table<LocalCookingSessionRecord, IndexableType>;
  mutationQueue!: Table<LocalMutationRecord, IndexableType>;
  syncMeta!: Table<LocalSyncMetaRecord, IndexableType>;
  media!: Table<LocalRecipeMediaRecord, IndexableType>;

  constructor() {
    super(RECIPIO_LOCAL_DB_NAME);

    const stores = {
      profiles: "userId",
      recipes: "[userId+recipeId], userId, recipeId, lastOpenedAt",
      shoppingSnapshots: "userId, listId",
      shoppingToggleQueue: "[userId+listId+itemId], userId, listId, itemId, queuedAt",
      meta: "id",
      recipeDrafts: "[userId+draftId], userId, updatedAt",
      cookingSessions: "[userId+recipeId], userId, updatedAt",
      mutationQueue: "id, userId, queuedAt",
      syncMeta: "[userId+scope], userId, scope, updatedAt",
      media: "[userId+recipeId+mediaId], userId, recipeId, mediaId, cachedAt",
    } as const;
    this.version(1).stores({
      profiles: stores.profiles,
      recipes: stores.recipes,
      shoppingSnapshots: stores.shoppingSnapshots,
      shoppingToggleQueue: stores.shoppingToggleQueue,
      meta: stores.meta,
      recipeDrafts: stores.recipeDrafts,
      cookingSessions: stores.cookingSessions,
      mutationQueue: stores.mutationQueue,
      syncMeta: stores.syncMeta,
    });
    this.version(RECIPIO_LOCAL_DB_VERSION).stores(stores);
  }
}

interface LegacyOfflineSchema extends DBSchema {
  profiles: { key: string; value: OfflineProfile };
  recipes: { key: [string, string]; value: OfflineRecipeSnapshot };
  shoppingSnapshots: { key: string; value: OfflineShoppingSnapshot };
  shoppingToggleQueue: { key: [string, string, string]; value: OfflineShoppingToggle };
}

let localDatabase: RecipioLocalDatabase | undefined;
let localDatabasePromise: Promise<RecipioLocalDatabase> | undefined;

function hasStore(database: IDBPDatabase<LegacyOfflineSchema>, name: string): boolean {
  return Array.from(database.objectStoreNames).some((storeName) => storeName === name);
}

async function openLegacyDatabase(): Promise<IDBPDatabase<LegacyOfflineSchema> | null> {
  try {
    const database = await openDB<LegacyOfflineSchema>(LEGACY_OFFLINE_DB_NAME);
    if (database.objectStoreNames.length === 0) {
      database.close();
      return null;
    }
    return database;
  } catch {
    return null;
  }
}

async function migrateLegacyDatabase(database: RecipioLocalDatabase): Promise<void> {
  if (await database.meta.get(LEGACY_MIGRATION_META_ID)) return;

  const legacy = await openLegacyDatabase();
  try {
    const profiles = legacy && hasStore(legacy, "profiles") ? await legacy.getAll("profiles") : [];
    const recipes = legacy && hasStore(legacy, "recipes") ? await legacy.getAll("recipes") : [];
    const shoppingSnapshots = legacy && hasStore(legacy, "shoppingSnapshots")
      ? await legacy.getAll("shoppingSnapshots")
      : [];
    const shoppingToggleQueue = legacy && hasStore(legacy, "shoppingToggleQueue")
      ? await legacy.getAll("shoppingToggleQueue")
      : [];

    await database.transaction(
      "rw",
      database.profiles,
      database.recipes,
      database.shoppingSnapshots,
      database.shoppingToggleQueue,
      database.meta,
      async () => {
        if (profiles.length > 0) await database.profiles.bulkPut(profiles);
        if (recipes.length > 0) await database.recipes.bulkPut(recipes);
        if (shoppingSnapshots.length > 0) await database.shoppingSnapshots.bulkPut(shoppingSnapshots);
        if (shoppingToggleQueue.length > 0) await database.shoppingToggleQueue.bulkPut(shoppingToggleQueue);
        await database.meta.put({
          id: LEGACY_MIGRATION_META_ID,
          status: "complete",
          completedAt: new Date().toISOString(),
        });
      },
    );
  } finally {
    legacy?.close();
  }
}

export function getLocalDatabase(): Promise<RecipioLocalDatabase> {
  localDatabasePromise ??= (async () => {
    if (typeof globalThis.indexedDB !== "undefined") {
      Dexie.dependencies.indexedDB = globalThis.indexedDB;
    }
    localDatabase ??= new RecipioLocalDatabase();
    await localDatabase.open();
    await migrateLegacyDatabase(localDatabase);
    return localDatabase;
  })().catch((error) => {
    localDatabasePromise = undefined;
    localDatabase?.close();
    localDatabase = undefined;
    throw error;
  });
  return localDatabasePromise;
}

export async function __resetLocalDatabaseForTests(): Promise<void> {
  const pending = localDatabasePromise;
  localDatabasePromise = undefined;
  localDatabase?.close();
  localDatabase = undefined;
  await pending?.catch(() => undefined);
  if (typeof globalThis.indexedDB !== "undefined") {
    Dexie.dependencies.indexedDB = globalThis.indexedDB;
  }
  await Dexie.delete(RECIPIO_LOCAL_DB_NAME);
  await deleteDB(LEGACY_OFFLINE_DB_NAME);
}
