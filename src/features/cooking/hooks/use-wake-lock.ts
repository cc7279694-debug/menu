"use client";

import { useEffect, useRef, useState } from "react";

export type WakeLockStatus = "requesting" | "active" | "released" | "unsupported" | "error";

type WakeLockSentinelLike = {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
  removeEventListener(type: "release", listener: () => void): void;
};

type WakeLockLike = {
  request(type: "screen"): Promise<WakeLockSentinelLike>;
};

function getWakeLock(): WakeLockLike | null {
  const navigatorWithWakeLock = navigator as Navigator & { wakeLock?: WakeLockLike };
  return navigatorWithWakeLock.wakeLock ?? null;
}

export function useWakeLock(enabled: boolean): { status: WakeLockStatus; message: string | null } {
  const [status, setStatus] = useState<WakeLockStatus>(enabled ? "requesting" : "released");
  const [message, setMessage] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const requestingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    const releaseCurrent = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        sentinel.removeEventListener("release", handleRelease);
        void sentinel.release();
      }
    };

    const handleRelease = () => {
      sentinelRef.current = null;
      if (!disposed) {
        setStatus("released");
        setMessage("屏幕常亮已释放。");
      }
    };

    const request = async () => {
      if (!enabled || sentinelRef.current || requestingRef.current) return;
      const wakeLock = getWakeLock();
      if (!wakeLock) {
        setStatus("unsupported");
        setMessage("此浏览器不支持屏幕常亮。");
        return;
      }

      requestingRef.current = true;
      setStatus("requesting");
      setMessage(null);
      try {
        const sentinel = await wakeLock.request("screen");
        if (disposed || !enabled) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", handleRelease);
        setStatus("active");
      } catch {
        if (!disposed) {
          setStatus("error");
          setMessage("无法保持屏幕常亮，烹饪仍可继续。");
        }
      } finally {
        requestingRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void request();
    };

    if (enabled) {
      void request();
      document.addEventListener("visibilitychange", onVisibilityChange);
    } else {
      releaseCurrent();
      setStatus("released");
      setMessage(null);
    }

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseCurrent();
    };
  }, [enabled]);

  return { status, message };
}
