"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { clearOfflineData } from "@/features/offline/database";

type PendingAction = "clear" | "sign-out" | null;

export function OfflineSettingsControls() {
  const [pending, setPending] = useState<PendingAction>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleClear() {
    if (pending) return;
    setPending("clear");
    setStatus(null);
    try {
      await clearOfflineData();
      setStatus("离线数据已清除");
    } catch {
      setStatus("离线数据清除失败，请重试。");
    } finally {
      setPending(null);
    }
  }

  async function handleSignOut() {
    if (pending) return;
    setPending("sign-out");
    setStatus(null);
    try {
      await clearOfflineData();
    } catch {
      setStatus("离线数据清除失败，尚未退出登录，请重试。");
      setPending(null);
      return;
    }
    try {
      await signOut();
    } catch {
      setStatus("退出登录失败，请检查网络后重试。");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {status && <p aria-live="polite" className="text-sm text-muted-foreground" role="status">{status}</p>}
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" disabled={pending !== null} onClick={() => { void handleClear(); }} type="button" variant="outline">
          {pending === "clear" ? "清除中…" : "清除离线数据"}
        </Button>
        <Button className="min-h-11" disabled={pending !== null} onClick={() => { void handleSignOut(); }} type="button" variant="outline">
          {pending === "sign-out" ? "退出中…" : "退出登录"}
        </Button>
      </div>
    </div>
  );
}
