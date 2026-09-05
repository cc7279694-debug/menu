"use client";

import { useEffect, useRef, useState } from "react";

import { syncShoppingToggleQueue } from "../shopping-sync";
import { syncRecipeMutationQueue } from "../recipe-sync";
import { getOfflineSyncSummary, type OfflineSyncSummary } from "../database";

type OfflineSyncRuntimeProps = { userId: string };

export function OfflineSyncRuntime({ userId }: OfflineSyncRuntimeProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [summary, setSummary] = useState<OfflineSyncSummary>({
    pendingCount: 0,
    failedCount: 0,
    lastError: null,
    lastAttemptAt: null,
  });
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refreshSummary = async (): Promise<OfflineSyncSummary | null> => {
      try {
        const nextSummary = await getOfflineSyncSummary(userId);
        if (!cancelled) setSummary(nextSummary);
        return nextSummary;
      } catch {
        return null;
      }
    };

    const sync = () => {
      if (!navigator.onLine || inFlightRef.current) return;

      setMessage("正在同步");
      const inFlight = Promise.all([
        syncShoppingToggleQueue(userId),
        syncRecipeMutationQueue(userId),
      ])
        .then(async ([shopping, recipes]) => {
          const results = [shopping, recipes];
          const nextSummary = await refreshSummary();
          const remainingCount = nextSummary?.pendingCount
            ?? results.reduce((total, result) => total + result.remainingCount, 0);
          if (results.some((result) => result.status === "auth-required")) {
            setMessage("请重新登录");
          } else if (results.some((result) => result.status === "failed")) {
            setMessage(`同步失败，操作已保留${remainingCount > 0 ? `（${remainingCount} 项）` : ""}`);
          } else {
            const syncedCount = results.reduce((total, result) => total + result.syncedCount, 0);
            setMessage(syncedCount > 0 ? `${syncedCount} 项已同步` : null);
          }
        })
        .catch(() => setMessage("同步失败，操作已保留"))
        .finally(() => { inFlightRef.current = null; });

      inFlightRef.current = inFlight;
    };

    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setMessage("当前离线，操作会保存到本机");
    };

    setIsOnline(navigator.onLine);
    void refreshSummary();
    sync();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("recipio:sync-requested", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("recipio:sync-requested", sync);
    };
  }, [userId]);

  const displayMessage = !isOnline
    ? "当前离线，操作会保存到本机"
    : message;
  const showRetry = isOnline && summary.pendingCount > 0 && (
    summary.failedCount > 0 || displayMessage?.startsWith("同步失败") === true
  );

  if (!displayMessage && !showRetry) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border bg-background/95 px-3 py-2 text-sm text-foreground shadow-lg backdrop-blur-sm md:bottom-4"
      role="status"
    >
      <span>{displayMessage ?? `有 ${summary.pendingCount} 项待同步`}</span>
      {showRetry ? (
        <button
          className="ml-3 rounded-full border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
          onClick={() => window.dispatchEvent(new Event("recipio:sync-requested"))}
          type="button"
        >
          重试同步
        </button>
      ) : null}
    </div>
  );
}
