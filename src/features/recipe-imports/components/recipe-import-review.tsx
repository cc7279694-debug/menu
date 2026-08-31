"use client";

import type { RefObject } from "react";

import type { RecipeImportReview } from "@/features/recipe-imports/schemas";

type RecipeImportReviewPanelProps = {
  review: RecipeImportReview;
  acknowledged: boolean;
  onAcknowledgedChange: (acknowledged: boolean) => void;
  checkboxRef?: RefObject<HTMLInputElement | null>;
};

const statusLabel = {
  explicit: "来源明确",
  inferred: "AI 推断",
  missing: "来源缺失",
} as const;

export function RecipeImportReviewPanel({
  review,
  acknowledged,
  onAcknowledgedChange,
  checkboxRef,
}: RecipeImportReviewPanelProps) {
  const uncertainFields = review.fieldChecks.filter((check) => check.status !== "explicit");
  const explicitFields = review.fieldChecks.filter((check) => check.status === "explicit");

  return (
    <section aria-labelledby="recipe-import-review-title" className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50/70 p-5 text-amber-950">
      <div>
        <h2 className="text-xl font-semibold" id="recipe-import-review-title">请确认 AI 整理结果</h2>
        <p className="mt-1 text-sm">保存前请检查来源依据和下面这些可能缺失或由 AI 推断的内容；不确定时可以直接留空。</p>
      </div>
      {uncertainFields.length ? <ul className="space-y-2 text-sm" aria-label="待确认字段">
        {uncertainFields.map((check) => (
          <li className="rounded-lg border border-amber-200 bg-background/70 p-3" key={check.path}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{check.label}</span>
              <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs">{statusLabel[check.status]}</span>
            </div>
            <p className="mt-1 text-xs text-amber-900/80">{check.message}</p>
          </li>
        ))}
      </ul> : <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">未发现需要特别确认的字段。</p>}
      {explicitFields.length ? <details className="rounded-lg border border-amber-200 bg-background/50 p-3 text-sm">
        <summary className="cursor-pointer font-medium">来源明确（{explicitFields.length} 项）</summary>
        <ul className="mt-2 space-y-1 text-xs text-amber-900/80">
          {explicitFields.map((check) => <li key={check.path}>{statusLabel[check.status]}：{check.label}</li>)}
        </ul>
      </details> : null}
      {uncertainFields.length ? <label className="flex items-start gap-3 text-sm font-medium">
        <input
          ref={checkboxRef}
          aria-label="我已检查以上 AI 推断和缺失内容"
          checked={acknowledged}
          className="mt-0.5 size-4 accent-amber-700"
          onChange={(event) => onAcknowledgedChange(event.target.checked)}
          type="checkbox"
        />
        <span>我已检查以上 AI 推断和缺失内容，确认继续保存</span>
      </label> : null}
    </section>
  );
}
