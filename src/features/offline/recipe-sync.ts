import {
  deleteRecipeMutationIfCurrent,
  listRecipeMutationQueue,
  markRecipeMutationAttemptFailed,
} from "./database";
import type { LocalMutationRecord } from "./local-db";
import { syncRecipeMutationAction } from "@/features/recipes/actions";

export type RecipeSyncResult =
  | { status: "idle"; syncedCount: 0; remainingCount: 0 }
  | { status: "synced"; syncedCount: number; remainingCount: number }
  | { status: "auth-required" | "failed"; syncedCount: number; remainingCount: number; message: string };

export type RecipeSyncDependencies = {
  listQueue: typeof listRecipeMutationQueue;
  submitMutation: typeof syncRecipeMutationAction;
  markFailed: typeof markRecipeMutationAttemptFailed;
  deleteIfCurrent: typeof deleteRecipeMutationIfCurrent;
};

const defaultDependencies: RecipeSyncDependencies = {
  listQueue: listRecipeMutationQueue,
  submitMutation: syncRecipeMutationAction,
  markFailed: markRecipeMutationAttemptFailed,
  deleteIfCurrent: deleteRecipeMutationIfCurrent,
};

const NETWORK_FAILURE_MESSAGE = "网络恢复后仍无法同步";
const INVALID_MUTATION_MESSAGE = "本地操作格式无效，请重新操作";
const syncPromises = new Map<string, Promise<RecipeSyncResult>>();

type RecipeMutationPayload =
  | { kind: "set-favorite"; favorite: boolean }
  | { kind: "move-to-trash" | "restore" | "permanently-delete" };

function parsePayload(record: LocalMutationRecord): RecipeMutationPayload | null {
  if (!record.payload || typeof record.payload !== "object") return null;
  const payload = record.payload as Record<string, unknown>;
  if (payload.kind === "set-favorite" && typeof payload.favorite === "boolean") {
    return { kind: payload.kind, favorite: payload.favorite };
  }
  if (payload.kind === "move-to-trash" || payload.kind === "restore" || payload.kind === "permanently-delete") {
    return { kind: payload.kind };
  }
  return null;
}

async function runRecipeMutationSync(userId: string, dependencies: RecipeSyncDependencies): Promise<RecipeSyncResult> {
  const records = await dependencies.listQueue(userId);
  if (records.length === 0) return { status: "idle", syncedCount: 0, remainingCount: 0 };

  let syncedCount = 0;
  for (const record of records) {
    const payload = parsePayload(record);
    if (!payload) {
      await dependencies.markFailed(record, INVALID_MUTATION_MESSAGE);
      return {
        status: "failed",
        syncedCount,
        remainingCount: (await dependencies.listQueue(userId)).length,
        message: INVALID_MUTATION_MESSAGE,
      };
    }

    try {
      const result = await dependencies.submitMutation({
        recipeId: record.entityId,
        ...payload,
      });
      if (result.ok) {
        syncedCount += 1;
        await dependencies.deleteIfCurrent(record);
        continue;
      }

      if (result.message.includes("登录")) {
        return {
          status: "auth-required",
          syncedCount,
          remainingCount: (await dependencies.listQueue(userId)).length,
          message: result.message,
        };
      }
      await dependencies.markFailed(record, result.message);
      return {
        status: "failed",
        syncedCount,
        remainingCount: (await dependencies.listQueue(userId)).length,
        message: result.message,
      };
    } catch {
      await dependencies.markFailed(record, NETWORK_FAILURE_MESSAGE);
      return {
        status: "failed",
        syncedCount,
        remainingCount: (await dependencies.listQueue(userId)).length,
        message: NETWORK_FAILURE_MESSAGE,
      };
    }
  }

  return { status: "synced", syncedCount, remainingCount: (await dependencies.listQueue(userId)).length };
}

export function syncRecipeMutationQueue(
  userId: string,
  dependencies: RecipeSyncDependencies = defaultDependencies,
): Promise<RecipeSyncResult> {
  const current = syncPromises.get(userId);
  if (current) return current;
  const promise = runRecipeMutationSync(userId, dependencies).finally(() => syncPromises.delete(userId));
  syncPromises.set(userId, promise);
  return promise;
}
