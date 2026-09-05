import { describe, expect, it, vi } from "vitest";

import type { OfflineShoppingSnapshot, OfflineShoppingToggle } from "./types";
import {
  type ShoppingSyncDependencies,
  syncShoppingToggleQueue,
} from "./shopping-sync";

const USER_ID = "user-a";
const LIST_ID = "list-a";

function record(overrides: Partial<OfflineShoppingToggle> = {}): OfflineShoppingToggle {
  return {
    userId: USER_ID,
    listId: LIST_ID,
    itemId: "item-a",
    targetChecked: true,
    clientMutationId: "mutation-a",
    queuedAt: "2026-08-27T08:00:00.000Z",
    attemptCount: 0,
    lastError: null,
    ...overrides,
  };
}

function snapshot(itemChecked = false): OfflineShoppingSnapshot {
  return {
    userId: USER_ID,
    listId: LIST_ID,
    cachedAt: "2026-08-27T08:00:00.000Z",
    serverUpdatedAt: "2026-08-27T08:00:00.000Z",
    dataVersion: 1,
    list: {
      id: LIST_ID,
      name: "本周采购",
      updatedAt: "2026-08-27T08:00:00.000Z",
      sources: [],
      items: [{
        id: "item-a", ingredientId: null, nameSnapshot: "鸡蛋", quantity: 1,
        quantityText: null, unit: "个", aisle: null, isChecked: itemChecked,
        isManual: false, sortOrder: 0, sources: [],
      }],
    },
  };
}

function createDependencies(queue: OfflineShoppingToggle[], options: {
  submitToggle?: ShoppingSyncDependencies["submitToggle"];
  fetchActiveList?: ShoppingSyncDependencies["fetchActiveList"];
} = {}) {
  const savedSnapshots: OfflineShoppingSnapshot[] = [];
  const markFailed = vi.fn(async (current: OfflineShoppingToggle, message: string) => {
    const index = queue.findIndex((candidate) => candidate.clientMutationId === current.clientMutationId);
    if (index >= 0) queue[index] = { ...queue[index], attemptCount: queue[index].attemptCount + 1, lastError: message, lastAttemptAt: new Date().toISOString() };
  });
  const deleteIfCurrent = vi.fn(async (current: OfflineShoppingToggle) => {
    const index = queue.findIndex((candidate) => (
      candidate.userId === current.userId
      && candidate.listId === current.listId
      && candidate.itemId === current.itemId
    ));
    if (index < 0 || queue[index].clientMutationId !== current.clientMutationId) return false;
    queue.splice(index, 1);
    return true;
  });
  const dependencies: ShoppingSyncDependencies = {
    listQueue: vi.fn(async () => [...queue].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))),
    submitToggle: options.submitToggle ?? vi.fn<ShoppingSyncDependencies["submitToggle"]>(async (input) => {
      const toggle = input as { itemId: string; isChecked: boolean };
      return {
        ok: true as const,
        data: { itemId: toggle.itemId, isChecked: toggle.isChecked, updatedAt: "2026-08-27T08:01:00.000Z" },
      };
    }),
    fetchActiveList: options.fetchActiveList ?? vi.fn<ShoppingSyncDependencies["fetchActiveList"]>(async () => ({
      ok: true as const,
      data: snapshot(false).list,
    })),
    saveSnapshot: vi.fn(async (next: OfflineShoppingSnapshot) => { savedSnapshots.push(next); }),
    markFailed,
    deleteIfCurrent,
  };

  return { dependencies, savedSnapshots, markFailed, deleteIfCurrent };
}

describe("syncShoppingToggleQueue", () => {
  it("submits queued target states in order and removes confirmed records", async () => {
    const queue = [
      record({ itemId: "item-a", queuedAt: "2026-08-27T08:00:00.000Z" }),
      record({ itemId: "item-b", clientMutationId: "mutation-b", queuedAt: "2026-08-27T08:01:00.000Z", targetChecked: false }),
    ];
    const { dependencies } = createDependencies(queue);

    await expect(syncShoppingToggleQueue(USER_ID, dependencies)).resolves.toEqual({
      status: "synced", syncedCount: 2, remainingCount: 0,
    });
    expect(dependencies.submitToggle).toHaveBeenNthCalledWith(1, {
      shoppingListId: LIST_ID, itemId: "item-a", isChecked: true,
    });
    expect(dependencies.submitToggle).toHaveBeenNthCalledWith(2, {
      shoppingListId: LIST_ID, itemId: "item-b", isChecked: false,
    });
  });

  it("increments attempts and retains a queue record when the network request throws", async () => {
    const queue = [record()];
    const { dependencies, markFailed } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => { throw new Error("network unavailable"); }),
    });

    const result = await syncShoppingToggleQueue(USER_ID, dependencies);

    expect(result).toMatchObject({ status: "failed", syncedCount: 0, remainingCount: 1 });
    expect(queue[0]).toMatchObject({ attemptCount: 1, lastError: "网络恢复后仍无法同步", lastAttemptAt: expect.any(String) });
    expect(markFailed).toHaveBeenCalledWith(record(), "网络恢复后仍无法同步");
  });

  it("retries a retained network failure and removes it after success", async () => {
    const queue = [record()];
    const submitToggle = vi.fn<ShoppingSyncDependencies["submitToggle"]>()
      .mockResolvedValueOnce({ ok: false as const, code: "REQUEST_FAILED", message: "暂时失败" })
      .mockResolvedValueOnce({
        ok: true as const,
        data: { itemId: "item-a", isChecked: true, updatedAt: "2026-08-27T08:01:00.000Z" },
      });
    const { dependencies } = createDependencies(queue, { submitToggle });

    await expect(syncShoppingToggleQueue(USER_ID, dependencies)).resolves.toMatchObject({ status: "failed", remainingCount: 1 });
    await expect(syncShoppingToggleQueue(USER_ID, dependencies)).resolves.toEqual({ status: "synced", syncedCount: 1, remainingCount: 0 });
    expect(queue).toEqual([]);
    expect(submitToggle).toHaveBeenCalledTimes(2);
  });

  it("retains a business-error record until the refreshed list confirms that its target is stale", async () => {
    const queue = [record()];
    const { dependencies, markFailed } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => ({
        ok: false as const, code: "REQUEST_FAILED", message: "temporary failure",
      })),
    });

    const result = await syncShoppingToggleQueue(USER_ID, dependencies);

    expect(result).toMatchObject({ status: "failed", remainingCount: 1 });
    expect(markFailed).toHaveBeenCalledWith(record(), "temporary failure");
  });

  it("stops on an authentication error and preserves the queued operation", async () => {
    const queue = [record()];
    const { dependencies } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => ({
        ok: false as const, code: "AUTH_REQUIRED", message: "请先登录后再操作购物清单",
      })),
    });

    await expect(syncShoppingToggleQueue(USER_ID, dependencies)).resolves.toEqual({
      status: "auth-required",
      syncedCount: 0,
      remainingCount: 1,
      message: "请先登录后再操作购物清单",
    });
    expect(dependencies.fetchActiveList).not.toHaveBeenCalled();
    expect(queue).toEqual([record()]);
  });

  it("drops a stale record only after the refreshed active list confirms that it no longer has a target", async () => {
    const queue = [record()];
    const { dependencies, deleteIfCurrent } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => ({
        ok: false as const, code: "STALE_TARGET", message: "购物清单已失效，请刷新后重试",
      })),
      fetchActiveList: vi.fn<ShoppingSyncDependencies["fetchActiveList"]>(async () => ({ ok: true as const, data: null })),
    });

    await expect(syncShoppingToggleQueue(USER_ID, dependencies)).resolves.toEqual({
      status: "synced", syncedCount: 0, remainingCount: 0,
    });
    expect(deleteIfCurrent).toHaveBeenCalledWith(record());
  });

  it("does not delete a newer same-key mutation after an older submission succeeds", async () => {
    const queue = [record({ targetChecked: false })];
    const newer = record({ targetChecked: true, clientMutationId: "mutation-b", queuedAt: "2026-08-27T08:01:00.000Z" });
    const { dependencies, savedSnapshots } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => {
        queue[0] = newer;
        return { ok: true as const, data: { itemId: "item-a", isChecked: false, updatedAt: "2026-08-27T08:01:00.000Z" } };
      }),
    });

    const result = await syncShoppingToggleQueue(USER_ID, dependencies);

    expect(result).toEqual({ status: "synced", syncedCount: 1, remainingCount: 1 });
    expect(queue).toEqual([newer]);
    expect(savedSnapshots.at(-1)?.list.items[0].isChecked).toBe(true);
  });

  it("overlays unsynced target states onto the refreshed server snapshot", async () => {
    const queue = [record({ targetChecked: true, clientMutationId: "mutation-b" })];
    const { dependencies, savedSnapshots } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => ({
        ok: false as const, code: "REQUEST_FAILED", message: "temporary failure",
      })),
    });

    await syncShoppingToggleQueue(USER_ID, dependencies);

    expect(savedSnapshots.at(-1)?.list.items[0].isChecked).toBe(true);
  });

  it("shares one in-flight promise so repeated callers submit the queue once", async () => {
    const queue = [record()];
    let resolveSubmission: (() => void) | undefined;
    const submission = new Promise<void>((resolve) => { resolveSubmission = resolve; });
    const { dependencies } = createDependencies(queue, {
      submitToggle: vi.fn<ShoppingSyncDependencies["submitToggle"]>(async () => {
        await submission;
        return { ok: true as const, data: { itemId: "item-a", isChecked: true, updatedAt: "2026-08-27T08:01:00.000Z" } };
      }),
    });

    const first = syncShoppingToggleQueue(USER_ID, dependencies);
    const second = syncShoppingToggleQueue(USER_ID, dependencies);
    expect(second).toBe(first);
    resolveSubmission?.();
    await expect(first).resolves.toMatchObject({ status: "synced", syncedCount: 1 });
    expect(dependencies.submitToggle).toHaveBeenCalledTimes(1);
  });
});
