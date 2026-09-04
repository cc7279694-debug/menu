import { Badge } from "@/components/ui/badge";
import type { NutritionMetrics } from "@/features/nutrition-analysis/schemas";
import type { NutritionAnalysisResult } from "@/features/nutrition-analysis/types";

const metricLabels = [
  { key: "caloriesKcal", label: "热量", unit: "千卡" },
  { key: "proteinGrams", label: "蛋白质", unit: "克" },
  { key: "fatGrams", label: "脂肪", unit: "克" },
  { key: "carbsGrams", label: "碳水", unit: "克" },
] as const;

const confidenceLabels = { high: "较高", medium: "中等", low: "较低" } as const;

function formatMetric(value: number | null, unit: string) {
  return value === null ? null : `${value}${unit}`;
}

function MetricGrid({ metrics }: { metrics: NutritionMetrics }) {
  const values = metricLabels.flatMap(({ key, label, unit }) => {
    const value = formatMetric(metrics[key], unit);
    return value ? [{ key, label, value }] : [];
  });
  if (!values.length) return <p className="text-sm text-muted-foreground">暂无可计算指标</p>;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {values.map(({ key, label, value }) => (
        <div className="rounded-xl bg-muted/50 p-3" key={key}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-lg font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function NutritionAnalysisResultView({ result }: { result: NutritionAnalysisResult }) {
  return (
    <section aria-label="营养参考" className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">营养参考</h2>
        <Badge variant="secondary">AI 参考值</Badge>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">总计</h3>
        <MetricGrid metrics={result.total} />
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">每份</h3>
        <MetricGrid metrics={result.perServing} />
      </div>

      {result.ingredients.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">食材贡献</h3>
          <ul className="space-y-2 text-sm">
            {result.ingredients.map((ingredient, index) => (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" key={`${ingredient.name}-${index}`}>
                <span>{ingredient.name}{ingredient.normalizedAmount ? `（${ingredient.normalizedAmount}）` : ""}</span>
                <span className="text-muted-foreground">
                  {[formatMetric(ingredient.caloriesKcal, "千卡"), formatMetric(ingredient.proteinGrams, "克蛋白质")].filter(Boolean).join(" · ") || "未能拆分"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.assumptions.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">分析说明</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.assumptions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {result.omittedItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">未计入项目</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.omittedItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      <p className="text-sm text-muted-foreground">参考可信度：{confidenceLabels[result.confidence]}</p>
      <p className="border-t pt-4 text-xs text-muted-foreground">以上为 AI 参考值，仅作日常饮食记录参考，不构成医疗建议或专业营养建议。</p>
    </section>
  );
}
