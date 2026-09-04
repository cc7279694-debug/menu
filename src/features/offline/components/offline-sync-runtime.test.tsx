import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const syncShoppingToggleQueue = vi.hoisted(() => vi.fn());
const syncRecipeMutationQueue = vi.hoisted(() => vi.fn());

vi.mock("../shopping-sync", () => ({ syncShoppingToggleQueue }));
vi.mock("../recipe-sync", () => ({ syncRecipeMutationQueue }));

import { OfflineSyncRuntime } from "./offline-sync-runtime";

const USER_ID = "user-a";

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve: resolve! };
}

describe("OfflineSyncRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncShoppingToggleQueue.mockResolvedValue({ status: "idle", syncedCount: 0, remainingCount: 0 });
    syncRecipeMutationQueue.mockResolvedValue({ status: "idle", syncedCount: 0, remainingCount: 0 });
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

  it("announces when the server session must be restored", async () => {
    syncShoppingToggleQueue.mockResolvedValueOnce({
      status: "auth-required", syncedCount: 0, remainingCount: 1, message: "请先登录后再获取购物清单",
    });
    render(<OfflineSyncRuntime userId={USER_ID} />);

    expect(await screen.findByRole("status")).toHaveTextContent("请重新登录");
  });
});
