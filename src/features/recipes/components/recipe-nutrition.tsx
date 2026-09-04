"use client";

import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecipeSaveInput } from "@/features/recipes/schemas";
import type { RecipeNutrition } from "@/features/recipes/types";
import type { NutritionAnalysisResult } from "@/features/nutrition-analysis/types";

const metricLabels = [
  { key: "caloriesKcal", label: "热量", unit: "千卡", max: 100000 },
  { key: "proteinGrams", label: "蛋白质", unit: "克", max: 10000 },
  { key: "fatGrams", label: "脂肪", unit: "克", max: 10000 },
  { key: "carbsGrams", label: "碳水", unit: "克", max: 10000 },
] as const;

function formatMetric(value: number | null, unit: string) {
  return value === null ? null : `${value}${unit}`;
}

export function RecipeNutritionCard({ nutrition }: { nutrition?: RecipeNutrition | null }) {
  if (!nutrition) return null;

  const values = metricLabels.flatMap(({ key, label, unit }) => {
    const value = formatMetric(nutrition[key], unit);
    return value ? [{ label, value }] : [];
  });
  if (!values.length) return null;

  return (
    <section aria-label="每份营养" className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">每份营养</h2>
        {nutrition.isEstimated && <Badge variant="secondary">AI 参考值</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">仅作饮食记录参考，可在编辑页修改。</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {values.map(({ label, value }) => (
          <div className="rounded-xl bg-muted/50 p-3" key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function asNullableNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RecipeNutritionEditor({
  control,
  errors,
  register,
  setValue,
  onAnalyze,
  isAnalyzing = false,
  analysisResult = null,
  analysisMessage = null,
}: {
  control: Control<RecipeSaveInput>;
  errors: FieldErrors<RecipeSaveInput>;
  register: UseFormRegister<RecipeSaveInput>;
  setValue: UseFormSetValue<RecipeSaveInput>;
  onAnalyze?: () => Promise<void>;
  isAnalyzing?: boolean;
  analysisResult?: NutritionAnalysisResult | null;
  analysisMessage?: string | null;
}) {
  const nutrition = useWatch({ control, name: "nutrition" });
  const hasMetric = Boolean(nutrition && metricLabels.some(({ key }) => nutrition[key] !== null && nutrition[key] !== undefined));

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5" aria-labelledby="recipe-nutrition-heading">
      <div>
        <h2 className="text-xl font-semibold" id="recipe-nutrition-heading">每份营养（可选）</h2>
        <p className="text-sm text-muted-foreground">填写包装信息或 AI 参考值；不确定的项目留空，不会自动编造。</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricLabels.map(({ key, label, unit, max }) => (
          <div className="space-y-1" key={key}>
            <Label htmlFor={`nutrition-${key}`}>{label}（{unit}）</Label>
            <Input
              id={`nutrition-${key}`}
              inputMode="decimal"
              min={0}
              max={max}
              placeholder="未填写"
              step="any"
              type="number"
              {...register(`nutrition.${key}`, { setValueAs: asNullableNumber })}
            />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          aria-label="这些数值是 AI 参考值"
          checked={nutrition?.isEstimated ?? false}
          onChange={(event) => setValue("nutrition.isEstimated", event.target.checked, { shouldDirty: true })}
          type="checkbox"
        />
        这些数值是 AI 参考值
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isAnalyzing} onClick={() => void onAnalyze?.()} type="button" variant="outline">
          {isAnalyzing ? "正在分析…" : "AI 营养分析"}
        </Button>
        {analysisResult && <p className="text-sm text-muted-foreground" role="status">已填入每份营养，请检查后保存</p>}
        {analysisMessage && <p className="text-sm text-destructive" role="alert">{analysisMessage}</p>}
      </div>
      {analysisResult && (analysisResult.assumptions.length > 0 || analysisResult.omittedItems.length > 0) && (
        <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
          <p>参考说明</p>
          {analysisResult.assumptions.map((item) => <p key={`assumption-${item}`}>• {item}</p>)}
          {analysisResult.omittedItems.map((item) => <p key={`omitted-${item}`}>• 未计入：{item}</p>)}
        </div>
      )}
      {!hasMetric && errors.nutrition && <p className="text-sm text-destructive">填写至少一项营养值，或保持全部为空。</p>}
    </section>
  );
}
