"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ImportStatus = "queued" | "fetching" | "extracting" | "review" | "failed" | "saved";

const labels: Record<ImportStatus, string> = {
  queued: "已准备，等待开始",
  fetching: "正在读取公开来源…",
  extracting: "正在整理食材和步骤…",
  review: "整理完成，正在打开编辑器…",
  failed: "导入失败",
  saved: "菜谱已保存",
};

export function ImportProgress({ importId, initialStatus, initialErrorCode }: { importId: string; initialStatus: ImportStatus; initialErrorCode: string | null }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    const terminal = (status: ImportStatus) => status === "review" || status === "failed" || status === "saved";
    async function refreshStatus() {
      try {
        const response = await fetch(`/api/recipe-imports/${importId}/process`, { cache: "no-store" });
        if (!response.ok || stopped) return;
        const next = await response.json() as { status?: ImportStatus };
        if (next.status && terminal(next.status)) {
          stopped = true;
          router.refresh();
        }
      } catch {
        // Network interruptions leave the polling loop alive for the next tick.
      }
    }
    if (initialStatus === "queued" || initialStatus === "failed") {
      void fetch(`/api/recipe-imports/${importId}/process`, { method: "POST" }).then(() => refreshStatus()).catch(() => undefined);
    } else if (!terminal(initialStatus)) {
      void refreshStatus();
    }
    const timer = terminal(initialStatus) ? undefined : window.setInterval(refreshStatus, 1500);
    return () => { stopped = true; if (timer) window.clearInterval(timer); };
  }, [importId, initialStatus, router]);

  return (
    <section aria-live="polite" className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div><p className="text-sm text-muted-foreground">食序 ORDINE</p><h1 className="mt-1 text-2xl font-semibold">正在生成菜谱卡</h1></div>
      <p>{labels[initialStatus]}</p>
      {initialStatus === "failed" ? <><p className="text-sm text-destructive">{initialErrorCode ? "来源暂时无法整理，请换一种输入方式再试。" : "请稍后重试。"}</p><div className="flex flex-wrap gap-2"><Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes/import?mode=images">上传截图</Link><Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes/import?mode=text">粘贴文案</Link></div></> : null}
    </section>
  );
}
