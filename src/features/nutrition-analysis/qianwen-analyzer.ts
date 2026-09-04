import "server-only";

import { ZodError } from "zod";

import { getRecipeAiEnv, type RecipeAiEnv } from "@/lib/server-env";
import { readOpenAiOutputText } from "@/features/recipe-imports/recipe-ai-shared";
import { normalizeNutritionAnalysis, NutritionAnalysisInsufficientError } from "@/features/nutrition-analysis/math";
import { nutritionAnalysisModelSchema } from "@/features/nutrition-analysis/schemas";
import { buildNutritionAnalysisUserPrompt, NUTRITION_ANALYSIS_RULES } from "@/features/nutrition-analysis/prompt";
import type { NutritionAnalyzer } from "@/features/nutrition-analysis/types";

const CHAT_COMPLETIONS_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export type QianwenNutritionAnalyzerOptions = {
  fetchImpl?: typeof fetch;
  env?: RecipeAiEnv;
};

function isUnavailableModel(details: { code?: string; message?: string } | undefined): boolean {
  const code = details?.code?.toLowerCase() ?? "";
  const message = details?.message?.toLowerCase() ?? "";
  return code.includes("modelnotfound")
    || code.includes("model_not_found")
    || code.includes("model-not-found")
    || /model[^\n]*(does not exist|not found|unavailable|not available)/i.test(message);
}

function providerError(status: number, details?: { code?: string; message?: string }): Error {
  if (status === 400 && isUnavailableModel(details)) return new Error("AI 模型不可用");
  if (status === 401 || status === 403) return new Error("AI 服务认证失败");
  if (status === 429) return new Error("AI 服务请求过于频繁");
  if (status >= 500) return new Error("AI 服务暂时不可用");
  return new Error("营养分析失败");
}

async function readProviderError(response: Response): Promise<{ code?: string; message?: string }> {
  try {
    const payload = (await response.clone().json()) as {
      code?: unknown;
      message?: unknown;
      error?: { code?: unknown; message?: unknown };
    };
    return {
      code: typeof payload.code === "string" ? payload.code : typeof payload.error?.code === "string" ? payload.error.code : undefined,
      message: typeof payload.message === "string" ? payload.message : typeof payload.error?.message === "string" ? payload.error.message : undefined,
    };
  } catch {
    return {};
  }
}

export function createQianwenNutritionAnalyzer(options: QianwenNutritionAnalyzerOptions = {}): NutritionAnalyzer {
  const fetchImpl = options.fetchImpl ?? fetch;
  const env = options.env ?? getRecipeAiEnv();

  return {
    async analyze(input) {
      let response: Response;
      try {
        response = await fetchImpl(CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.RECIPE_AI_MODEL,
            messages: [
              { role: "system", content: NUTRITION_ANALYSIS_RULES },
              { role: "user", content: buildNutritionAnalysisUserPrompt(input) },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            stream: false,
            enable_thinking: false,
          }),
        });
      } catch {
        throw new Error("AI 服务暂时不可用");
      }

      if (!response.ok) {
        throw providerError(response.status, await readProviderError(response));
      }

      try {
        const payload = (await response.json()) as unknown;
        const outputText = readOpenAiOutputText(payload);
        if (!outputText) throw new Error("missing output");
        const parsed = nutritionAnalysisModelSchema.parse(JSON.parse(outputText));
        return normalizeNutritionAnalysis(parsed, input.servings);
      } catch (error) {
        if (error instanceof NutritionAnalysisInsufficientError) throw error;
        if (error instanceof ZodError || error instanceof SyntaxError) throw new Error("营养分析失败");
        throw new Error("营养分析失败");
      }
    },
  };
}
