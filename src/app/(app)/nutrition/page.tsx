import { NutritionAnalysisForm } from "@/features/nutrition-analysis/components/nutrition-analysis-form";

export default function NutritionPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI 营养分析</h1>
        <p className="mt-1 text-muted-foreground">输入食材和用量，获取日常饮食记录用的 AI 参考值。</p>
      </div>
      <NutritionAnalysisForm />
    </section>
  );
}
