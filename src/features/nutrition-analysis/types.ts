import type { z } from "zod";

import {
  nutritionAnalysisInputSchema,
  nutritionAnalysisModelSchema,
  nutritionAnalysisResultSchema,
} from "@/features/nutrition-analysis/schemas";

export type NutritionAnalysisInput = z.infer<typeof nutritionAnalysisInputSchema>;
export type NutritionAnalysisModel = z.infer<typeof nutritionAnalysisModelSchema>;
export type NutritionAnalysisResult = z.infer<typeof nutritionAnalysisResultSchema>;

export interface NutritionAnalyzer {
  analyze(input: NutritionAnalysisInput): Promise<NutritionAnalysisResult>;
}
