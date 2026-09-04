import { describe, expect, it, vi } from "vitest";

import type { LocalMutationRecord } from "./local-db";
import type { RecipeSyncDependencies } from "./recipe-sync";
import { syncRecipeMutationQueue } from "./recipe-sync";

const USER_ID = "user-a";

function record(overrides: Partial<LocalMutationRecord> = {}): LocalMutationRecord {
  return {
    id: "mutation-a",
    userId: USER_ID,
    entity: "recipe",
    entityId: "recipe-a",
    operation: "update",
    queuedAt: "2026-08-28T08:00:00.000Z",
    attemptCount: 0,
    lastError: null,
    payload: { kind: "move-to-trash" },
    ...overrides,
  };
}

function createDependencies(queue: LocalMutationRecord[], submitMutation: RecipeSyncDependencies["submitMutation"]) {
  const deleteIfCurrent = vi.fn(async (current: LocalMutationRecord) => {
    const index = queue.findIndex((candidate) => candidate.id === current.id);
    if (index < 0 || queue[index]?.id !== current.id) return false;
    queue.splice(index, 1);
    return true;
  });
  const markFailed = vi.fn(async (current: LocalMutationRecord, message: string) => {
    const index = queue.findIndex((candidate) => candidate.id === current.id);
    if (index >= 0) queue[index] = { ...queue[index], attemptCount: queue[index].attemptCount + 1, lastError: message };
  });
  const dependencies: RecipeSyncDependencies = {
    listQueue: vi.fn(async () => [...queue]),
    submitMutation,
    markFailed,
    deleteIfCurrent,
  };
  return { dependencies, deleteIfCurrent, markFailed };
}

describe("syncRecipeMutationQueue", () => {
  it("submits queued recipe status changes and removes confirmed records", async () => {
    const queue = [record()];
    const submitMutation = vi.fn<RecipeSyncDependencies["submitMutation"]>(async () => ({
      ok: true as const,
      data: null,
    }));
    const { dependencies, deleteIfCurrent } = createDependencies(queue, submitMutation);

    await expect(syncRecipeMutationQueue(USER_ID, dependencies)).resolves.toEqual({
      status: "synced", syncedCount: 1, remainingCount: 0,
    });
    expect(submitMutation).toHaveBeenCalledWith({ recipeId: "recipe-a", kind: "move-to-trash" });
    expect(deleteIfCurrent).toHaveBeenCalledWith(record());
  });

  it("retains a failed operation and records the reason", async () => {
    const queue = [record()];
    const submitMutation = vi.fn<RecipeSyncDependencies["submitMutation"]>(async () => ({
      ok: false as const,
      message: "菜谱状态更新失败，请稍后重试",
    }));
    const { dependencies, markFailed } = createDependencies(queue, submitMutation);

    await expect(syncRecipeMutationQueue(USER_ID, dependencies)).resolves.toMatchObject({
      status: "failed", remainingCount: 1,
    });
    expect(markFailed).toHaveBeenCalledWith(record(), "菜谱状态更新失败，请稍后重试");
    expect(queue[0]).toMatchObject({ attemptCount: 1, lastError: "菜谱状态更新失败，请稍后重试" });
  });

  it("stops and preserves the queue when login is required", async () => {
    const queue = [record()];
    const submitMutation = vi.fn<RecipeSyncDependencies["submitMutation"]>(async () => ({
      ok: false as const,
      message: "请先登录后再操作",
    }));
    const { dependencies, markFailed } = createDependencies(queue, submitMutation);

    await expect(syncRecipeMutationQueue(USER_ID, dependencies)).resolves.toEqual({
      status: "auth-required", syncedCount: 0, remainingCount: 1, message: "请先登录后再操作",
    });
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("persists the desired favorite state from the queued payload", async () => {
    const queue = [record({ payload: { kind: "set-favorite", favorite: true } })];
    const submitMutation = vi.fn<RecipeSyncDependencies["submitMutation"]>(async () => ({ ok: true as const, data: null }));
    const { dependencies } = createDependencies(queue, submitMutation);

    await syncRecipeMutationQueue(USER_ID, dependencies);
    expect(submitMutation).toHaveBeenCalledWith({ recipeId: "recipe-a", kind: "set-favorite", favorite: true });
  });
});
