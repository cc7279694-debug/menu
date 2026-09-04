import { type Table } from "dexie";

import {
  __resetLocalDatabaseForTests,
  getLocalDatabase,
  type RecipioLocalDatabase,
  type LocalRecipeSummaryRecord,
  type LocalMutationRecord,
  type LocalRecipeDraftRecord,
} from "./local-db";
import type {
  OfflineProfile,
  OfflineRecipeSnapshot,
  OfflineShoppingSnapshot,
  OfflineShoppingToggle,
} from "./types";
import type { RecipeSummary } from "@/features/recipes/types";

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

export function putRecipeDraft(record: LocalRecipeDraftRecord): Promise<void> {
  return safe(async (database) => {
    await database.recipeDrafts.put(record);
  });
}

export function getRecipeDraft(userId: string, draftId: string): Promise<LocalRecipeDraftRecord | null> {
  return safe(async (database) => (await database.recipeDrafts.get([userId, draftId])) ?? null);
}

export function getLatestRecipeDraft(userId: string): Promise<LocalRecipeDraftRecord | null> {
  return safe(async (database) => {
    const drafts = await database.recipeDrafts.where("userId").equals(userId).sortBy("updatedAt");
    return drafts.at(-1) ?? null;
  });
}

export function deleteRecipeDraft(userId: string, draftId: string): Promise<void> {
  return safe(async (database) => {
    await database.recipeDrafts.delete([userId, draftId]);
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

export function listRecipeSnapshots(userId: string, deleted = false): Promise<OfflineRecipeSnapshot[]> {
  return safe(async (database) => {
    const all = (await database.recipes
      .where("userId")
      .equals(userId)
      .filter((snapshot) => (snapshot.deleted ?? false) === deleted)
      .sortBy("lastOpenedAt")).reverse();
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

export function putRecipeSummaryPage(
  userId: string,
  summaries: RecipeSummary[],
  deleted: boolean,
): Promise<void> {
  return safe(async (database) => {
    const cachedAt = new Date().toISOString();
    const records: LocalRecipeSummaryRecord[] = summaries.map((summary) => ({
      userId,
      recipeId: summary.id,
      cachedAt,
      deleted,
      summary: {
        ...summary,
        coverUrl: null,
        category: summary.category ? { ...summary.category } : null,
        tags: summary.tags.map((tag) => ({ ...tag })),
        nutrition: summary.nutrition ? { ...summary.nutrition } : null,
      },
    }));
    if (records.length > 0) await database.recipeSummaries.bulkPut(records);
  });
}

export function listRecipeSummaryPage(userId: string, deleted: boolean): Promise<RecipeSummary[]> {
  return safe(async (database) => {
    const records = await database.recipeSummaries
      .where("userId")
      .equals(userId)
      .filter((record) => record.deleted === deleted)
      .sortBy("cachedAt");
    return records
      .reverse()
      .map((record) => ({
        ...record.summary,
        category: record.summary.category ? { ...record.summary.category } : null,
        tags: record.summary.tags.map((tag) => ({ ...tag })),
        nutrition: record.summary.nutrition ? { ...record.summary.nutrition } : null,
      }));
  });
}

export type RecipeMutationKind = "save" | "set-favorite" | "move-to-trash" | "restore" | "permanently-delete";

export function updateRecipeSummaryCache(
  userId: string,
  recipeId: string,
  patch: { deleted?: boolean; isFavorite?: boolean },
): Promise<void> {
  return safe(async (database) => {
    const record = await database.recipeSummaries.get([userId, recipeId]);
    if (!record) return;
    await database.recipeSummaries.put({
      ...record,
      cachedAt: new Date().toISOString(),
      deleted: patch.deleted ?? record.deleted,
      summary: {
        ...record.summary,
        isFavorite: patch.isFavorite ?? record.summary.isFavorite,
      },
    });
  });
}

export function deleteRecipeSummaryCache(userId: string, recipeId: string): Promise<void> {
  return safe(async (database) => {
    await database.recipeSummaries.delete([userId, recipeId]);
  });
}

export function queueRecipeMutation(input: {
  userId: string;
  recipeId: string;
  kind: RecipeMutationKind;
  favorite?: boolean;
  input?: unknown;
  draftId?: string;
}): Promise<LocalMutationRecord> {
  return safe(async (database) => {
    const previous = await database.mutationQueue
      .where("userId")
      .equals(input.userId)
      .filter((record) => record.entity === "recipe" && record.entityId === input.recipeId)
      .toArray();
    const isStatus = (kind: unknown) => kind === "set-favorite" || kind === "move-to-trash" || kind === "restore" || kind === "permanently-delete";
    const kindOf = (record: LocalMutationRecord): unknown => (
      record.payload && typeof record.payload === "object"
        ? (record.payload as { kind?: unknown }).kind
        : undefined
    );
    const record: LocalMutationRecord = {
      id: mutationId(),
      userId: input.userId,
      entity: "recipe",
      entityId: input.recipeId,
      operation: input.kind === "permanently-delete" ? "delete" : "update",
      queuedAt: new Date().toISOString(),
      attemptCount: 0,
      lastError: null,
      payload: {
        kind: input.kind,
        ...(input.kind === "set-favorite" ? { favorite: input.favorite === true } : {}),
        ...(input.kind === "save" ? { input: input.input, draftId: input.draftId ?? input.recipeId } : {}),
      },
    };
    await database.transaction("rw", database.mutationQueue, async () => {
      for (const old of previous) {
        const oldKind = kindOf(old);
        const shouldCoalesce = input.kind === "save"
          ? oldKind === "save"
          : isStatus(input.kind) && isStatus(oldKind);
        if (shouldCoalesce) await database.mutationQueue.delete(old.id);
      }
      await database.mutationQueue.put(record);
    });
    return record;
  });
}

export function listRecipeMutationQueue(userId: string): Promise<LocalMutationRecord[]> {
  return safe(async (database) => database.mutationQueue
    .where("userId")
    .equals(userId)
    .filter((record) => record.entity === "recipe")
    .sortBy("queuedAt"));
}

export function markRecipeMutationAttemptFailed(record: LocalMutationRecord, message: string): Promise<void> {
  return safe(async (database) => {
    const current = await database.mutationQueue.get(record.id);
    if (current) {
      await database.mutationQueue.put({ ...current, attemptCount: current.attemptCount + 1, lastError: message });
    }
  });
}

export function deleteRecipeMutationIfCurrent(record: LocalMutationRecord): Promise<boolean> {
  return safe(async (database) => {
    const current = await database.mutationQueue.get(record.id);
    if (!current) return false;
    await database.mutationQueue.delete(record.id);
    return true;
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
        database.recipeSummaries,
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
          database.recipeSummaries.clear(),
        ]);
      },
    );
  });
}

export function __resetOfflineDatabaseForTests(): Promise<void> {
  return __resetLocalDatabaseForTests();
}
