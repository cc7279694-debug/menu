"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const errorMessages: Record<string, string> = {
  unsafe_url: "这个链接暂时不允许访问，请换用公开网页或直接粘贴文案。",
  source_unreadable: "没有读取到可整理的正文，请改用粘贴文案或上传截图。",
  source_too_large: "来源内容太大，请截取关键部分后再试。",
  ai_rate_limited: "AI 服务请求过于频繁，请等待一分钟后再重试。",
  ai_unauthorized: "AI 服务密钥无效，请检查配置后重试。",
  ai_unavailable: "AI 服务暂时不可用，请稍后重试或换一种输入方式。",
  invalid_ai_output: "AI 返回内容不完整，请重试或改用粘贴文案。",
  processing_failed: "导入处理失败，请重试或换一种输入方式。",
};

export function ImportProgress({ importId, initialStatus, initialErrorCode }: { importId: string; initialStatus: ImportStatus; initialErrorCode: string | null }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
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
    if (initialStatus === "queued") {
      void fetch(`/api/recipe-imports/${importId}/process`, { method: "POST" }).then(() => refreshStatus()).catch(() => undefined);
    } else if (!terminal(initialStatus)) {
      void refreshStatus();
    }
    const timer = terminal(initialStatus) ? undefined : window.setInterval(refreshStatus, 1500);
    return () => { stopped = true; if (timer) window.clearInterval(timer); };
  }, [importId, initialStatus, router]);

  const retry = async () => {
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      const response = await fetch(`/api/recipe-imports/${importId}/process`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        setRetryMessage(body?.message || "重试失败，请稍后再试。");
        return;
      }
      router.refresh();
    } catch {
      setRetryMessage("网络暂时不可用，请检查连接后再试。");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <section aria-live="polite" className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div><p className="text-sm text-muted-foreground">食序 ORDINE</p><h1 className="mt-1 text-2xl font-semibold">正在生成菜谱卡</h1></div>
      <p>{labels[initialStatus]}</p>
      {initialStatus === "failed" ? <div className="space-y-3"><p className="text-sm text-destructive">{(initialErrorCode && errorMessages[initialErrorCode]) || "导入处理失败，请稍后重试。"}</p>{retryMessage && <p className="text-sm text-destructive" role="alert">{retryMessage}</p>}<div className="flex flex-wrap gap-2"><button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60" disabled={isRetrying} onClick={retry} type="button">{isRetrying ? "重试中…" : "重新导入"}</button><Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes/import?mode=images">上传截图</Link><Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes/import?mode=text">粘贴文案</Link></div></div> : null}
    </section>
  );
}
