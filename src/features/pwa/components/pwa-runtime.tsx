"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const UPDATE_MESSAGE = "发现新版本，更新后可获得最新页面与样式。";
const OFFLINE_MESSAGE =
  "当前离线。公共离线页仍可使用，私人菜谱和购物变更需要恢复网络后继续。";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let registrationContainer: ServiceWorkerContainer | null = null;

function registerServiceWorker() {
  if (
    process.env.NODE_ENV !== "production" ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !navigator.serviceWorker
  ) {
    return Promise.resolve(null);
  }

  if (registrationContainer !== navigator.serviceWorker) {
    registrationContainer = navigator.serviceWorker;
    registrationPromise = null;
  }

  registrationPromise ??= navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch(() => null);

  return registrationPromise;
}

export function PwaRuntime(): React.ReactElement | null {
  const [isOffline, setIsOffline] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;
    let cleanupRegistration = () => undefined;
    const serviceWorkerContainer = navigator.serviceWorker;

    const handleControllerChange = () => {
      if (!cancelled && !hasReloadedRef.current) {
        hasReloadedRef.current = true;
        window.location.reload();
      }
    };

    const handleInstallingStateChange = () => {
      if (
        !cancelled &&
        installingWorker?.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        setWaitingWorker(registration?.waiting ?? installingWorker);
      }
    };

    void registerServiceWorker().then((nextRegistration) => {
      if (cancelled || !nextRegistration) return;

      registration = nextRegistration;
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      const handleUpdateFound = () => {
        installingWorker = registration?.installing ?? null;
        installingWorker?.addEventListener("statechange", handleInstallingStateChange);
      };

      registration.addEventListener("updatefound", handleUpdateFound);
        serviceWorkerContainer.addEventListener(
        "controllerchange",
        handleControllerChange,
      );

      cleanupRegistration = () => {
        registration?.removeEventListener("updatefound", handleUpdateFound);
        installingWorker?.removeEventListener(
          "statechange",
          handleInstallingStateChange,
        );
        serviceWorkerContainer.removeEventListener(
          "controllerchange",
          handleControllerChange,
        );
      };
    });

    return () => {
      cancelled = true;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      cleanupRegistration();
      installingWorker?.removeEventListener(
        "statechange",
        handleInstallingStateChange,
      );
    };
  }, []);

  if (!isOffline && !waitingWorker) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md space-y-2 md:bottom-4">
      {waitingWorker ? (
        <div
          aria-live="polite"
          className="rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
        >
          <p className="text-sm text-foreground">{UPDATE_MESSAGE}</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWaitingWorker(null)}
            >
              稍后
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
            >
              立即更新
            </Button>
          </div>
        </div>
      ) : null}
      {isOffline ? (
        <div
          aria-live="polite"
          className="rounded-2xl border border-border bg-background/95 px-3 py-2 text-sm text-foreground shadow-lg backdrop-blur-sm"
        >
          {OFFLINE_MESSAGE}
        </div>
      ) : null}
    </div>
  );
}
