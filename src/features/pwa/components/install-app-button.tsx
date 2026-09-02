"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    navigatorWithStandalone.standalone === true
  );
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

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
      setStatus("请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。");
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    await prompt.prompt();

    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setStatus(
      choice.outcome === "accepted"
        ? "应用已准备安装"
        : "已取消安装，你仍可在浏览器菜单中稍后安装。",
    );
  }

  return (
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
  );
}
