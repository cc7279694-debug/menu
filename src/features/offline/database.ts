import { type Table } from "dexie";

import {
  __resetLocalDatabaseForTests,
  getLocalDatabase,
  type RecipioLocalDatabase,
} from "./local-db";
import type {
  OfflineProfile,
  OfflineRecipeSnapshot,
  OfflineShoppingSnapshot,
  OfflineShoppingToggle,
} from "./types";

const STORAGE_ERROR = "OFFLINE_STORAGE_UNAVAILABLE";

async function safe<T>(operation: (database: RecipioLocalDatabase) => Promise<T>): Promise<T> {
  try {
    return await operation(await getLocalDatabase());
  } catch (error) {
    if (error instanceof Error && (
      error.message === "SHOPPING_SNAPSHOT_NOT_FOUND"
      || error.message === "SHOPPING_ITEM_NOT_FOUND"
      || error.message === STORAGE_ERROR
    )) {
      throw error;
    }
    throw new Error(STORAGE_ERROR);
  }
}

const compatibleRecipe = (value: { dataVersion?: number }): boolean => value.dataVersion === 3;
const compatibleShopping = (value: { dataVersion?: number }): boolean => value.dataVersion === 1;
const mutationId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

async function removeIncompatible<T extends { dataVersion?: number }>(
  table: Table<T>,
  values: T[],
  isCompatible: (value: T) => boolean,
  keyFor: (value: T) => string | [string, string],
): Promise<T[]> {
  const compatible: T[] = [];
  for (const value of values) {
    if (isCompatible(value)) compatible.push(value);
    else await table.delete(keyFor(value));
  }
  return compatible;
}

export function rememberOfflineProfile(userId: string, authenticatedAt: string): Promise<void> {
  return safe(async (database) => {
    await database.profiles.put({ userId, lastAuthenticatedAt: authenticatedAt });
  });
}

export function getLastOfflineProfile(): Promise<OfflineProfile | null> {
  return safe(async (database) => {
    const profiles = await database.profiles.toArray();
    return profiles.sort((a, b) => b.lastAuthenticatedAt.localeCompare(a.lastAuthenticatedAt))[0] ?? null;
  });
}

export function putRecipeSnapshot(snapshot: OfflineRecipeSnapshot): Promise<void> {
  return safe(async (database) => {
    await database.recipes.put(snapshot);
  });
}

export function deleteRecipeSnapshot(userId: string, recipeId: string): Promise<void> {
  return safe(async (database) => {
    await database.recipes.delete([userId, recipeId]);
  });
}

export function listRecipeSnapshots(userId: string): Promise<OfflineRecipeSnapshot[]> {
  return safe(async (database) => {
    const all = (await database.recipes.where("userId").equals(userId).sortBy("lastOpenedAt")).reverse();
    const result = await database.transaction("rw", database.recipes, async () => (
      removeIncompatible(
        database.recipes,
        all,
        compatibleRecipe,
        (snapshot) => [snapshot.userId, snapshot.recipeId],
      )
    ));
    for (const snapshot of result.slice(10)) await database.recipes.delete([snapshot.userId, snapshot.recipeId]);
    return result.slice(0, 10);
  });
}

export function getRecipeSnapshot(userId: string, recipeId: string): Promise<OfflineRecipeSnapshot | null> {
  return safe(async (database) => {
    const snapshot = await database.recipes.get([userId, recipeId]);
    if (!snapshot) return null;
    if (!compatibleRecipe(snapshot)) {
      await database.recipes.delete([userId, recipeId]);
      return null;
    }
    return snapshot;
  });
}

export function putShoppingSnapshot(snapshot: OfflineShoppingSnapshot): Promise<void> {
  return safe(async (database) => {
    await database.shoppingSnapshots.put(snapshot);
  });
}

export function getShoppingSnapshot(userId: string): Promise<OfflineShoppingSnapshot | null> {
  return safe(async (database) => {
    const snapshot = await database.shoppingSnapshots.get(userId);
    if (!snapshot) return null;
    if (!compatibleShopping(snapshot)) {
      await database.shoppingSnapshots.delete(userId);
      return null;
    }
    return snapshot;
  });
}

export function queueShoppingToggle(input: { userId: string; listId: string; itemId: string; targetChecked: boolean }): Promise<OfflineShoppingToggle> {
  return safe(async (database) => {
    let record: OfflineShoppingToggle;
    await database.transaction("rw", database.shoppingSnapshots, database.shoppingToggleQueue, async () => {
      const snapshot = await database.shoppingSnapshots.get(input.userId);
      if (!snapshot || !compatibleShopping(snapshot) || snapshot.list.id !== input.listId) throw new Error("SHOPPING_SNAPSHOT_NOT_FOUND");
      const item = snapshot.list.items.find((candidate) => candidate.id === input.itemId);
      if (!item) throw new Error("SHOPPING_ITEM_NOT_FOUND");
      item.isChecked = input.targetChecked;
      await database.shoppingSnapshots.put(snapshot);
      record = {
        ...input,
        clientMutationId: mutationId(),
        queuedAt: new Date().toISOString(),
        attemptCount: 0,
        lastError: null,
      };
      await database.shoppingToggleQueue.put(record);
    });
    return record!;
  });
}

export function listShoppingToggleQueue(userId: string): Promise<OfflineShoppingToggle[]> {
  return safe(async (database) => database.shoppingToggleQueue.where("userId").equals(userId).sortBy("queuedAt"));
}

export function markShoppingToggleAttemptFailed(record: OfflineShoppingToggle, message: string): Promise<void> {
  return safe(async (database) => {
    const key: [string, string, string] = [record.userId, record.listId, record.itemId];
    const current = await database.shoppingToggleQueue.get(key);
    if (current?.clientMutationId === record.clientMutationId) {
      await database.shoppingToggleQueue.put({
        ...current,
        attemptCount: current.attemptCount + 1,
        lastError: message,
      });
    }
  });
}

export function deleteShoppingToggleIfCurrent(record: OfflineShoppingToggle): Promise<boolean> {
  return safe(async (database) => {
    const key: [string, string, string] = [record.userId, record.listId, record.itemId];
    const current = await database.shoppingToggleQueue.get(key);
    if (current?.clientMutationId !== record.clientMutationId) return false;
    await database.shoppingToggleQueue.delete(key);
    return true;
  });
}

export function clearOfflineData(): Promise<void> {
  return safe(async (database) => {
    await database.transaction(
      "rw",
      [
        database.profiles,
        database.recipes,
        database.shoppingSnapshots,
        database.shoppingToggleQueue,
        database.recipeDrafts,
        database.cookingSessions,
        database.mutationQueue,
        database.syncMeta,
        database.media,
      ],
      async () => {
        await Promise.all([
          database.profiles.clear(),
          database.recipes.clear(),
          database.shoppingSnapshots.clear(),
          database.shoppingToggleQueue.clear(),
          database.recipeDrafts.clear(),
          database.cookingSessions.clear(),
          database.mutationQueue.clear(),
          database.syncMeta.clear(),
          database.media.clear(),
        ]);
      },
    );
  });
}

export function __resetOfflineDatabaseForTests(): Promise<void> {
  return __resetLocalDatabaseForTests();
}
