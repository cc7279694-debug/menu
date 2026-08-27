import {
  deleteShoppingToggleIfCurrent,
  listShoppingToggleQueue,
  markShoppingToggleAttemptFailed,
  putShoppingSnapshot,
} from "./database";
import type { OfflineShoppingSnapshot, OfflineShoppingToggle } from "./types";
import {
  getActiveShoppingListForSyncAction,
  setShoppingItemCheckedAction,
} from "@/features/shopping/actions";

export type ShoppingSyncResult =
  | { status: "idle"; syncedCount: 0; remainingCount: 0 }
  | { status: "synced"; syncedCount: number; remainingCount: number }
  | { status: "auth-required" | "failed"; syncedCount: number; remainingCount: number; message: string };

export type ShoppingSyncDependencies = {
  listQueue: typeof listShoppingToggleQueue;
  submitToggle: typeof setShoppingItemCheckedAction;
  fetchActiveList: typeof getActiveShoppingListForSyncAction;
  saveSnapshot: typeof putShoppingSnapshot;
  markFailed: typeof markShoppingToggleAttemptFailed;
  deleteIfCurrent: typeof deleteShoppingToggleIfCurrent;
};

const defaultDependencies: ShoppingSyncDependencies = {
  listQueue: listShoppingToggleQueue,
  submitToggle: setShoppingItemCheckedAction,
  fetchActiveList: getActiveShoppingListForSyncAction,
  saveSnapshot: putShoppingSnapshot,
  markFailed: markShoppingToggleAttemptFailed,
  deleteIfCurrent: deleteShoppingToggleIfCurrent,
};

const NETWORK_FAILURE_MESSAGE = "网络恢复后仍无法同步";
const syncPromises = new Map<string, Promise<ShoppingSyncResult>>();

function hasCurrentTarget(record: OfflineShoppingToggle, list: OfflineShoppingSnapshot["list"] | null) {
  return list?.id === record.listId && list.items.some((item) => item.id === record.itemId);
}

function snapshotWithQueueOverlay(
  userId: string,
  list: OfflineShoppingSnapshot["list"],
  queued: OfflineShoppingToggle[],
): OfflineShoppingSnapshot {
  const targets = new Map(
    queued
      .filter((record) => record.listId === list.id)
      .map((record) => [record.itemId, record.targetChecked]),
  );

  return {
    userId,
    listId: list.id,
    cachedAt: new Date().toISOString(),
    serverUpdatedAt: list.updatedAt,
    dataVersion: 1,
    list: {
      ...list,
      sources: list.sources.map((source) => ({ ...source })),
      items: list.items.map((item) => ({
        ...item,
        isChecked: targets.get(item.id) ?? item.isChecked,
        sources: item.sources.map((source) => ({ ...source })),
      })),
    },
  };
}

async function refreshSnapshotAndDiscardConfirmedStale(
  userId: string,
  dependencies: ShoppingSyncDependencies,
): Promise<
  | { kind: "ok"; remaining: OfflineShoppingToggle[] }
  | { kind: "auth"; message: string }
  | { kind: "failed"; message: string }
> {
  const refreshed = await dependencies.fetchActiveList();
  if (!refreshed.ok) {
    return refreshed.code === "AUTH_REQUIRED"
      ? { kind: "auth", message: refreshed.message }
      : { kind: "failed", message: refreshed.message };
  }

  let remaining = await dependencies.listQueue(userId);
  for (const record of remaining) {
    if (!hasCurrentTarget(record, refreshed.data)) {
      await dependencies.deleteIfCurrent(record);
    }
  }
  remaining = await dependencies.listQueue(userId);

  if (refreshed.data) {
    await dependencies.saveSnapshot(snapshotWithQueueOverlay(userId, refreshed.data, remaining));
  }

  return { kind: "ok", remaining };
}

async function runShoppingToggleSync(
  userId: string,
  dependencies: ShoppingSyncDependencies,
): Promise<ShoppingSyncResult> {
  const records = await dependencies.listQueue(userId);
  if (records.length === 0) {
    return { status: "idle", syncedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;
  let pendingFailure: { record: OfflineShoppingToggle; message: string } | null = null;

  for (const record of records) {
    try {
      const result = await dependencies.submitToggle({
        shoppingListId: record.listId,
        itemId: record.itemId,
        isChecked: record.targetChecked,
      });

      if (result.ok) {
        syncedCount += 1;
        await dependencies.deleteIfCurrent(record);
        continue;
      }

      if (result.code === "AUTH_REQUIRED") {
        return {
          status: "auth-required",
          syncedCount,
          remainingCount: (await dependencies.listQueue(userId)).length,
          message: result.message,
        };
      }

      pendingFailure = { record, message: result.message };
      break;
    } catch {
      await dependencies.markFailed(record, NETWORK_FAILURE_MESSAGE);
      const remaining = await dependencies.listQueue(userId);
      return {
        status: "failed",
        syncedCount,
        remainingCount: remaining.length,
        message: NETWORK_FAILURE_MESSAGE,
      };
    }
  }

  const refreshed = await refreshSnapshotAndDiscardConfirmedStale(userId, dependencies);
  if (refreshed.kind === "auth") {
    return {
      status: "auth-required",
      syncedCount,
      remainingCount: (await dependencies.listQueue(userId)).length,
      message: refreshed.message,
    };
  }
  if (refreshed.kind === "failed") {
    return {
      status: "failed",
      syncedCount,
      remainingCount: (await dependencies.listQueue(userId)).length,
      message: refreshed.message,
    };
  }

  if (pendingFailure) {
    const stillQueued = refreshed.remaining.some(
      (record) => record.clientMutationId === pendingFailure?.record.clientMutationId,
    );
    if (!stillQueued) {
      return { status: "synced", syncedCount, remainingCount: refreshed.remaining.length };
    }
    await dependencies.markFailed(pendingFailure.record, pendingFailure.message);
    return {
      status: "failed",
      syncedCount,
      remainingCount: refreshed.remaining.length,
      message: pendingFailure.message,
    };
  }

  return { status: "synced", syncedCount, remainingCount: refreshed.remaining.length };
}

export function syncShoppingToggleQueue(
  userId: string,
  dependencies: ShoppingSyncDependencies = defaultDependencies,
): Promise<ShoppingSyncResult> {
  const current = syncPromises.get(userId);
  if (current) return current;

  const promise = runShoppingToggleSync(userId, dependencies).finally(() => {
    syncPromises.delete(userId);
  });
  syncPromises.set(userId, promise);
  return promise;
}
