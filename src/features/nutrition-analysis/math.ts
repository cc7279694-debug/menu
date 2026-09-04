import { nutritionAnalysisResultSchema } from "@/features/nutrition-analysis/schemas";
import type {
  NutritionAnalysisModel,
  NutritionAnalysisResult,
} from "@/features/nutrition-analysis/types";

export class NutritionAnalysisInsufficientError extends Error {
  constructor() {
    super("营养分析信息不足");
    this.name = "NutritionAnalysisInsufficientError";
  }
}

const roundMacro = (value: number) =>
  Math.round((value + Number.EPSILON) * 10) / 10;

function normalizeMetrics(
  metrics: NutritionAnalysisModel["total"],
): NutritionAnalysisModel["total"] {
  return {
    caloriesKcal:
      metrics.caloriesKcal === null ? null : Math.round(metrics.caloriesKcal),
    proteinGrams:
      metrics.proteinGrams === null ? null : roundMacro(metrics.proteinGrams),
    fatGrams: metrics.fatGrams === null ? null : roundMacro(metrics.fatGrams),
    carbsGrams:
      metrics.carbsGrams === null ? null : roundMacro(metrics.carbsGrams),
  };
}

function divideMetrics(
  metrics: NutritionAnalysisModel["total"],
  servings: number,
): NutritionAnalysisModel["total"] {
  return {
    caloriesKcal:
      metrics.caloriesKcal === null
        ? null
        : Math.round(metrics.caloriesKcal / servings),
    proteinGrams:
      metrics.proteinGrams === null
        ? null
        : roundMacro(metrics.proteinGrams / servings),
    fatGrams:
      metrics.fatGrams === null ? null : roundMacro(metrics.fatGrams / servings),
    carbsGrams:
      metrics.carbsGrams === null
        ? null
        : roundMacro(metrics.carbsGrams / servings),
  };
}

export function normalizeNutritionAnalysis(
  model: NutritionAnalysisModel,
  servings: number,
): NutritionAnalysisResult {
  if (!Number.isFinite(servings) || servings <= 0) {
    throw new RangeError("Servings must be a positive finite number");
  }

  if (Object.values(model.total).every((metric) => metric === null)) {
    throw new NutritionAnalysisInsufficientError();
  }

  const total = normalizeMetrics(model.total);

  return nutritionAnalysisResultSchema.parse({
    ...model,
    total,
    perServing: divideMetrics(total, servings),
  });
}
