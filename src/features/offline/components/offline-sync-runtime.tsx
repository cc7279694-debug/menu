"use client";

import { useEffect, useRef, useState } from "react";

import { syncShoppingToggleQueue } from "../shopping-sync";

type OfflineSyncRuntimeProps = { userId: string };

export function OfflineSyncRuntime({ userId }: OfflineSyncRuntimeProps) {
  const [message, setMessage] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const sync = () => {
      if (!navigator.onLine || inFlightRef.current) return;

      setMessage("正在同步");
      const inFlight = syncShoppingToggleQueue(userId)
        .then((result) => {
          if (result.status === "idle") {
            setMessage(null);
          } else if (result.status === "synced") {
            setMessage(result.syncedCount > 0 ? `${result.syncedCount} 项已同步` : null);
          } else if (result.status === "auth-required") {
            setMessage("请重新登录");
          } else {
            setMessage("同步失败，操作已保留");
          }
        })
        .catch(() => setMessage("同步失败，操作已保留"))
        .finally(() => { inFlightRef.current = null; });

      inFlightRef.current = inFlight;
    };

    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [userId]);

  if (!message) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border bg-background/95 px-3 py-2 text-sm text-foreground shadow-lg backdrop-blur-sm md:bottom-4"
      role="status"
    >
      {message}
    </div>
  );
}
