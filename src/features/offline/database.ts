import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  OfflineProfile,
  OfflineRecipeSnapshot,
  OfflineShoppingSnapshot,
  OfflineShoppingToggle,
} from "./types";

interface OrdineOfflineSchema extends DBSchema {
  profiles: { key: string; value: OfflineProfile };
  recipes: {
    key: [string, string]; value: OfflineRecipeSnapshot;
    indexes: { "by-user-last-opened": [string, string] };
  };
  shoppingSnapshots: { key: string; value: OfflineShoppingSnapshot };
  shoppingToggleQueue: {
    key: [string, string, string]; value: OfflineShoppingToggle;
    indexes: { "by-user-queued-at": [string, string] };
  };
}

const DB_NAME = "ordine-offline";
const DB_VERSION = 1;
const STORAGE_ERROR = "OFFLINE_STORAGE_UNAVAILABLE";
let dbPromise: Promise<IDBPDatabase<OrdineOfflineSchema>> | undefined;

function db() {
  dbPromise ??= openDB<OrdineOfflineSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("profiles");
      const recipes = database.createObjectStore("recipes");
      recipes.createIndex("by-user-last-opened", ["userId", "lastOpenedAt"]);
      database.createObjectStore("shoppingSnapshots");
      const queue = database.createObjectStore("shoppingToggleQueue");
      queue.createIndex("by-user-queued-at", ["userId", "queuedAt"]);
    },
  });
  return dbPromise;
}

async function safe<T>(operation: (database: IDBPDatabase<OrdineOfflineSchema>) => Promise<T>) {
  try { return await operation(await db()); } catch (error) {
    if (error instanceof Error && (error.message === "SHOPPING_SNAPSHOT_NOT_FOUND" || error.message === "SHOPPING_ITEM_NOT_FOUND")) throw error;
    if (error instanceof Error && error.message === STORAGE_ERROR) throw error;
    throw new Error(STORAGE_ERROR);
  }
}

const compatibleRecipe = (value: { dataVersion?: number }): boolean => value.dataVersion === 2;
const compatibleShopping = (value: { dataVersion?: number }): boolean => value.dataVersion === 1;
const mutationId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function rememberOfflineProfile(userId: string, authenticatedAt: string): Promise<void> {
  return safe(async (database) => { await database.put("profiles", { userId, lastAuthenticatedAt: authenticatedAt }, userId); });
}

export function getLastOfflineProfile(): Promise<OfflineProfile | null> {
  return safe(async (database) => {
    const profiles = await database.getAll("profiles");
    return profiles.sort((a, b) => b.lastAuthenticatedAt.localeCompare(a.lastAuthenticatedAt))[0] ?? null;
  });
}

export function putRecipeSnapshot(snapshot: OfflineRecipeSnapshot): Promise<void> {
  return safe(async (database) => { await database.put("recipes", snapshot, [snapshot.userId, snapshot.recipeId]); });
}

export function listRecipeSnapshots(userId: string): Promise<OfflineRecipeSnapshot[]> {
  return safe(async (database) => {
    const tx = database.transaction("recipes", "readwrite");
    const all = await tx.store.index("by-user-last-opened").getAll(IDBKeyRange.bound([userId, ""], [userId, "\uffff"]));
    const result: OfflineRecipeSnapshot[] = [];
    for (const snapshot of all.reverse()) {
      if (compatibleRecipe(snapshot)) result.push(snapshot); else await tx.store.delete([snapshot.userId, snapshot.recipeId]);
    }
    for (const snapshot of result.slice(10)) await tx.store.delete([snapshot.userId, snapshot.recipeId]);
    await tx.done;
    return result.slice(0, 10);
  });
}

export function getRecipeSnapshot(userId: string, recipeId: string): Promise<OfflineRecipeSnapshot | null> {
  return safe(async (database) => {
    const tx = database.transaction("recipes", "readwrite");
    const snapshot = await tx.store.get([userId, recipeId]);
    if (snapshot && !compatibleRecipe(snapshot)) { await tx.store.delete([userId, recipeId]); await tx.done; return null; }
    await tx.done; return snapshot ?? null;
  });
}

export function putShoppingSnapshot(snapshot: OfflineShoppingSnapshot): Promise<void> {
  return safe(async (database) => { await database.put("shoppingSnapshots", snapshot, snapshot.userId); });
}

export function getShoppingSnapshot(userId: string): Promise<OfflineShoppingSnapshot | null> {
  return safe(async (database) => {
    const tx = database.transaction("shoppingSnapshots", "readwrite");
    const snapshot = await tx.store.get(userId);
    if (snapshot && !compatibleShopping(snapshot)) { await tx.store.delete(userId); await tx.done; return null; }
    await tx.done; return snapshot ?? null;
  });
}

export function queueShoppingToggle(input: { userId: string; listId: string; itemId: string; targetChecked: boolean }): Promise<OfflineShoppingToggle> {
  return safe(async (database) => {
    const tx = database.transaction(["shoppingSnapshots", "shoppingToggleQueue"], "readwrite");
    const snapshot = await tx.objectStore("shoppingSnapshots").get(input.userId);
    if (!snapshot || !compatibleShopping(snapshot) || snapshot.list.id !== input.listId) throw new Error("SHOPPING_SNAPSHOT_NOT_FOUND");
    const item = snapshot.list.items.find((candidate) => candidate.id === input.itemId);
    if (!item) throw new Error("SHOPPING_ITEM_NOT_FOUND");
    item.isChecked = input.targetChecked;
    await tx.objectStore("shoppingSnapshots").put(snapshot, input.userId);
    const key: [string, string, string] = [input.userId, input.listId, input.itemId];
    const record: OfflineShoppingToggle = { ...input, clientMutationId: mutationId(), queuedAt: new Date().toISOString(), attemptCount: 0, lastError: null };
    await tx.objectStore("shoppingToggleQueue").put(record, key);
    await tx.done;
    return record;
  });
}

export function listShoppingToggleQueue(userId: string): Promise<OfflineShoppingToggle[]> {
  return safe(async (database) => (await database.getAllFromIndex("shoppingToggleQueue", "by-user-queued-at", IDBKeyRange.bound([userId, ""], [userId, "\uffff"]))).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)));
}

export function markShoppingToggleAttemptFailed(record: OfflineShoppingToggle, message: string): Promise<void> {
  return safe(async (database) => {
    const tx = database.transaction("shoppingToggleQueue", "readwrite");
    const key: [string, string, string] = [record.userId, record.listId, record.itemId];
    const current = await tx.store.get(key);
    if (current?.clientMutationId === record.clientMutationId) await tx.store.put({ ...current, attemptCount: current.attemptCount + 1, lastError: message }, key);
    await tx.done;
  });
}

export function deleteShoppingToggleIfCurrent(record: OfflineShoppingToggle): Promise<boolean> {
  return safe(async (database) => {
    const tx = database.transaction("shoppingToggleQueue", "readwrite");
    const key: [string, string, string] = [record.userId, record.listId, record.itemId];
    const current = await tx.store.get(key);
    if (current?.clientMutationId !== record.clientMutationId) { await tx.done; return false; }
    await tx.store.delete(key); await tx.done; return true;
  });
}

export function clearOfflineData(): Promise<void> {
  return safe(async (database) => { const tx = database.transaction(["profiles", "recipes", "shoppingSnapshots", "shoppingToggleQueue"], "readwrite"); await Promise.all([tx.objectStore("profiles").clear(), tx.objectStore("recipes").clear(), tx.objectStore("shoppingSnapshots").clear(), tx.objectStore("shoppingToggleQueue").clear()]); await tx.done; });
}

export async function __resetOfflineDatabaseForTests(): Promise<void> {
  const current = dbPromise;
  dbPromise = undefined;
  (await current)?.close();
  await deleteDB(DB_NAME);
}
