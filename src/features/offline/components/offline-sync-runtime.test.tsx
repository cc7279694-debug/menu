import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const syncShoppingToggleQueue = vi.hoisted(() => vi.fn());
const syncRecipeMutationQueue = vi.hoisted(() => vi.fn());
const getOfflineSyncSummary = vi.hoisted(() => vi.fn());

vi.mock("../shopping-sync", () => ({ syncShoppingToggleQueue }));
vi.mock("../recipe-sync", () => ({ syncRecipeMutationQueue }));
vi.mock("../database", () => ({ getOfflineSyncSummary }));

import { OfflineSyncRuntime } from "./offline-sync-runtime";

const USER_ID = "user-a";

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve: resolve! };
}

describe("OfflineSyncRuntime", () => {
  beforeEach(() => {
    syncShoppingToggleQueue.mockReset();
    syncRecipeMutationQueue.mockReset();
    getOfflineSyncSummary.mockReset();
    syncShoppingToggleQueue.mockResolvedValue({ status: "idle", syncedCount: 0, remainingCount: 0 });
    syncRecipeMutationQueue.mockResolvedValue({ status: "idle", syncedCount: 0, remainingCount: 0 });
    getOfflineSyncSummary.mockResolvedValue({ pendingCount: 0, failedCount: 0, lastError: null, lastAttemptAt: null });
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates mount and repeated online events while announcing synchronization progress", async () => {
    const pending = deferred<{ status: "synced"; syncedCount: number; remainingCount: number }>();
    syncShoppingToggleQueue.mockReturnValueOnce(pending.promise);
    render(<OfflineSyncRuntime userId={USER_ID} />);

    expect(await screen.findByRole("status")).toHaveTextContent("正在同步");
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("online"));
    expect(syncShoppingToggleQueue).toHaveBeenCalledTimes(1);

    pending.resolve({ status: "synced", syncedCount: 2, remainingCount: 0 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 项已同步"));
  });

  it("starts recipe synchronization after a local mutation requests a retry", async () => {
    syncShoppingToggleQueue.mockResolvedValueOnce({ status: "idle", syncedCount: 0, remainingCount: 0 });
    syncRecipeMutationQueue.mockResolvedValueOnce({ status: "synced", syncedCount: 1, remainingCount: 0 });
    render(<OfflineSyncRuntime userId={USER_ID} />);

    await waitFor(() => expect(syncRecipeMutationQueue).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event("recipio:sync-requested"));
    await waitFor(() => expect(syncRecipeMutationQueue).toHaveBeenCalledTimes(2));
  });

  it("announces retained operations when synchronization fails", async () => {
    syncShoppingToggleQueue.mockResolvedValueOnce({
      status: "failed", syncedCount: 0, remainingCount: 1, message: "网络恢复后仍无法同步",
    });
    render(<OfflineSyncRuntime userId={USER_ID} />);

    expect(await screen.findByRole("status")).toHaveTextContent("同步失败，操作已保留");
  });

  it("shows the pending count and allows a failed queue to be retried", async () => {
    getOfflineSyncSummary
      .mockResolvedValueOnce({ pendingCount: 1, failedCount: 1, lastError: "网络失败", lastAttemptAt: "2026-09-05T00:00:00.000Z" })
      .mockResolvedValueOnce({ pendingCount: 1, failedCount: 1, lastError: "网络失败", lastAttemptAt: "2026-09-05T00:00:00.000Z" })
      .mockResolvedValue({ pendingCount: 0, failedCount: 0, lastError: null, lastAttemptAt: null });
    syncShoppingToggleQueue
      .mockResolvedValueOnce({ status: "failed", syncedCount: 0, remainingCount: 1, message: "网络失败" })
      .mockResolvedValueOnce({ status: "synced", syncedCount: 1, remainingCount: 0 });
    syncRecipeMutationQueue
      .mockResolvedValueOnce({ status: "idle", syncedCount: 0, remainingCount: 0 })
      .mockResolvedValueOnce({ status: "idle", syncedCount: 0, remainingCount: 0 });

    render(<OfflineSyncRuntime userId={USER_ID} />);

    expect(await screen.findByRole("status")).toHaveTextContent("同步失败，操作已保留（1 项）");
    const retry = screen.getByRole("button", { name: "重试同步" });
    retry.click();
    await waitFor(() => expect(syncShoppingToggleQueue).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: "重试同步" })).not.toBeInTheDocument());
  });

  it("keeps the local-first surface usable while offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    render(<OfflineSyncRuntime userId={USER_ID} />);

    expect(await screen.findByRole("status")).toHaveTextContent("当前离线，操作会保存到本机");
    expect(syncShoppingToggleQueue).not.toHaveBeenCalled();
    expect(syncRecipeMutationQueue).not.toHaveBeenCalled();
  });

  it("announces when the server session must be restored", async () => {
    syncShoppingToggleQueue.mockResolvedValueOnce({
      status: "auth-required", syncedCount: 0, remainingCount: 1, message: "请先登录后再获取购物清单",
    });
    render(<OfflineSyncRuntime userId={USER_ID} />);

    expect(await screen.findByRole("status")).toHaveTextContent("请重新登录");
  });
});
