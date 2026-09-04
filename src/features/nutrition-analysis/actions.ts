"use server";

import { createQianwenNutritionAnalyzer } from "@/features/nutrition-analysis/qianwen-analyzer";
import { nutritionAnalysisInputSchema } from "@/features/nutrition-analysis/schemas";
import type { NutritionAnalysisResult } from "@/features/nutrition-analysis/types";
import type { ActionResult } from "@/features/recipes/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function inputErrorMessage(input: unknown): string {
  if (typeof input !== "object" || input === null) return "请先输入食材和用量";
  const ingredientText = "ingredientText" in input ? input.ingredientText : null;
  if (typeof ingredientText !== "string" || !ingredientText.trim()) return "请先输入食材和用量";
  return "请检查份数和食材用量";
}

function safeNutritionAnalysisError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const known = [
    "AI 服务配置缺失",
    "AI 模型不可用",
    "AI 服务认证失败",
    "AI 服务请求过于频繁",
    "AI 服务暂时不可用",
    "营养分析信息不足",
    "营养分析失败",
  ];
  return known.includes(message) ? message : "营养分析失败";
}

export async function analyzeNutritionAction(input: unknown): Promise<ActionResult<NutritionAnalysisResult>> {
  const parsed = nutritionAnalysisInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: inputErrorMessage(input) };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, message: "请先登录后再分析" };

  try {
    const analyzer = createQianwenNutritionAnalyzer();
    return { ok: true, data: await analyzer.analyze(parsed.data) };
  } catch (error) {
    return { ok: false, message: safeNutritionAnalysisError(error) };
  }
}
