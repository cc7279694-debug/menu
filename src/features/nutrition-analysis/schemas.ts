import { z } from "zod";

const nullableMetric = (max: number) =>
  z.number().finite().min(0).max(max).nullable();

export const nutritionMetricsSchema = z
  .object({
    caloriesKcal: nullableMetric(100000),
    proteinGrams: nullableMetric(10000),
    fatGrams: nullableMetric(10000),
    carbsGrams: nullableMetric(10000),
  })
  .strict();

export const nutritionAnalysisInputSchema = z
  .object({
    ingredientText: z.string().trim().min(1).max(4000),
    servings: z.coerce.number().finite().positive().max(100),
  })
  .strict();

const ingredientContributionSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    normalizedAmount: z.string().trim().max(80).nullable(),
    caloriesKcal: nullableMetric(100000),
    proteinGrams: nullableMetric(10000),
  })
  .strict();

const nutritionAnalysisModelBaseSchema = z
  .object({
    total: nutritionMetricsSchema,
    ingredients: z.array(ingredientContributionSchema).max(100),
    assumptions: z.array(z.string().trim().min(1).max(200)).max(20),
    omittedItems: z.array(z.string().trim().min(1).max(200)).max(20),
    confidence: z.enum(["high", "medium", "low"]),
  })
  .strict();

export const nutritionAnalysisModelSchema = nutritionAnalysisModelBaseSchema;

export const nutritionAnalysisResultSchema = nutritionAnalysisModelBaseSchema
  .extend({ perServing: nutritionMetricsSchema })
  .superRefine((value, context) => {
    if (Object.values(value.total).every((metric) => metric === null)) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: "至少需要一项可计算的营养指标",
      });
    }
  });

export type NutritionMetrics = z.infer<typeof nutritionMetricsSchema>;
