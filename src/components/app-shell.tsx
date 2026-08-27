import type { ReactNode } from "react";

import { DesktopSidebar } from "@/components/desktop-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { OfflineSyncRuntime } from "@/features/offline/components/offline-sync-runtime";

export function AppShell({ children, userId }: { children: ReactNode; userId?: string }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <DesktopSidebar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-8 md:pb-8">
        {children}
      </main>
      <MobileBottomNav />
      {userId ? <OfflineSyncRuntime userId={userId} /> : null}
    </div>
  );
}
