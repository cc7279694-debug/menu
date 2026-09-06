"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { InstallAppDialog } from "./install-app-dialog";
import {
  detectPwaInstallPlatform,
  isPwaStandalone,
  type PwaInstallPlatform,
} from "../install-capability";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaInstallPlatform>("other");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    setIsInstalled(
      isPwaStandalone({
        displayModeStandalone:
          typeof window.matchMedia === "function" &&
          window.matchMedia("(display-mode: standalone)").matches,
        navigatorStandalone: navigatorWithStandalone.standalone,
      }),
    );
    setPlatform(
      detectPwaInstallPlatform({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      }),
    );

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setStatus("应用已安装，可从桌面打开。");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (isInstalled) return;

    if (!installPrompt) {
      setStatus("请查看安装步骤。");
      setDialogOpen(true);
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
    } catch {
      setStatus("浏览器没有完成安装，请按下面步骤手动安装。");
      setDialogOpen(true);
      return;
    }

    let choice: Awaited<InstallPromptEvent["userChoice"]>;
    try {
      choice = await prompt.userChoice;
    } catch {
      setStatus("浏览器没有完成安装，请按下面步骤手动安装。");
      setDialogOpen(true);
      return;
    }

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    if (choice.outcome === "accepted") {
      setStatus("应用已准备安装");
    } else {
      setStatus("已取消安装，你仍可按下面步骤手动安装。");
      setDialogOpen(true);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <Button
          aria-describedby={status ? "install-app-status" : undefined}
          aria-label={isInstalled ? "应用已安装" : "下载应用"}
          disabled={isInstalled}
          onClick={() => {
            void handleInstall();
          }}
          type="button"
          variant="outline"
        >
          <Download aria-hidden="true" />
          {isInstalled ? "应用已安装" : "下载应用"}
        </Button>
        {status ? (
          <p id="install-app-status" role="status" className="max-w-56 text-xs text-muted-foreground">
            {status}
          </p>
        ) : null}
      </div>
      <InstallAppDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        platform={platform}
      />
    </>
  );
}
