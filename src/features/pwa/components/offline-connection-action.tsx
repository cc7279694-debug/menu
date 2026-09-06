"use client";

import { useEffect, useState } from "react";

export type OfflineConnectionActionProps = {
  href: string;
};

export function OfflineConnectionAction({ href }: OfflineConnectionActionProps) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [hasRecovered, setHasRecovered] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setHasRecovered(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="space-y-2">
      {isOnline ? (
        <a
          className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm"
          href={href}
        >
          返回在线页面
        </a>
      ) : (
        <button
          className="inline-flex min-h-11 cursor-not-allowed items-center rounded-lg border px-3 text-sm text-muted-foreground opacity-70"
          disabled
          type="button"
        >
          等待网络恢复
        </button>
      )}
      {hasRecovered ? (
        <p className="text-sm text-muted-foreground" role="status">
          网络已恢复，可以返回在线页面。
        </p>
      ) : null}
    </div>
  );
}
