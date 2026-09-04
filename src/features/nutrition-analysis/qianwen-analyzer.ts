import "server-only";

import { ZodError } from "zod";

import { getRecipeAiEnv, type RecipeAiEnv } from "@/lib/server-env";
import { readOpenAiOutputText } from "@/features/recipe-imports/recipe-ai-shared";
import { normalizeNutritionAnalysis, NutritionAnalysisInsufficientError } from "@/features/nutrition-analysis/math";
import { nutritionAnalysisModelSchema } from "@/features/nutrition-analysis/schemas";
import { buildNutritionAnalysisUserPrompt, NUTRITION_ANALYSIS_RULES } from "@/features/nutrition-analysis/prompt";
import type { NutritionAnalyzer } from "@/features/nutrition-analysis/types";

const CHAT_COMPLETIONS_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const TRANSIENT_RETRY_DELAY_MS = 300;

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

function isTransientProviderError(error: Error): boolean {
  return error.message === "AI 服务暂时不可用";
}

async function waitBeforeTransientRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
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

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : {};
}

function firstValue(record: RecordLike, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== undefined) return record[key];
  }
  return null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMetrics(value: unknown): RecordLike {
  const record = asRecord(value);
  return {
    caloriesKcal: numericValue(firstValue(record, ["caloriesKcal", "calories", "kcal", "热量", "卡路里"])),
    proteinGrams: numericValue(firstValue(record, ["proteinGrams", "protein", "蛋白质"])),
    fatGrams: numericValue(firstValue(record, ["fatGrams", "fat", "脂肪"])),
    carbsGrams: numericValue(firstValue(record, ["carbsGrams", "carbs", "carbohydrates", "碳水"])),
  };
}

function normalizeText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => { const text = normalizeText(item); return text ? [text] : []; });
  const text = normalizeText(value);
  return text ? [text] : [];
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "较高") return "high";
  if (value === "medium" || value === "中等") return "medium";
  return "low";
}

function normalizeIngredient(value: unknown): RecordLike {
  const record = asRecord(value);
  return {
    name: normalizeText(firstValue(record, ["name", "ingredient", "食材"])) ?? "未命名食材",
    normalizedAmount: normalizeText(firstValue(record, ["normalizedAmount", "amount", "quantity", "用量"])),
    caloriesKcal: numericValue(firstValue(record, ["caloriesKcal", "calories", "kcal", "热量", "卡路里"])),
    proteinGrams: numericValue(firstValue(record, ["proteinGrams", "protein", "蛋白质"])),
  };
}

function normalizeNutritionModelOutput(value: unknown): unknown {
  const root = asRecord(value);
  const nestedNutrition = asRecord(firstValue(root, ["nutrition", "result", "data"]));
  const source = Object.keys(nestedNutrition).length > 0 ? { ...root, ...nestedNutrition } : root;
  const total = firstValue(source, ["total", "totalNutrition", "nutritionTotal"]);
  const rawIngredients = firstValue(source, ["ingredients", "ingredientContributions", "items"]);
  const ingredients = Array.isArray(rawIngredients) ? rawIngredients.map(normalizeIngredient) : [];

  return {
    total: normalizeMetrics(total ?? source),
    ingredients,
    assumptions: normalizeTextArray(firstValue(source, ["assumptions", "notes", "分析说明"])),
    omittedItems: normalizeTextArray(firstValue(source, ["omittedItems", "omitted", "未计入"])),
    confidence: normalizeConfidence(firstValue(source, ["confidence", "可信度"])),
  };
}

export function createQianwenNutritionAnalyzer(options: QianwenNutritionAnalyzerOptions = {}): NutritionAnalyzer {
  const fetchImpl = options.fetchImpl ?? fetch;
  const env = options.env ?? getRecipeAiEnv();

  return {
    async analyze(input) {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
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
          if (attempt === 0) {
            await waitBeforeTransientRetry();
            continue;
          }
          throw new Error("AI 服务暂时不可用");
        }

        if (response.ok) break;

        const error = providerError(
          response.status,
          await readProviderError(response),
        );
        if (attempt === 0 && isTransientProviderError(error)) {
          await waitBeforeTransientRetry();
          continue;
        }
        throw error;
      }

      if (!response?.ok) throw new Error("AI 服务暂时不可用");

      try {
        const payload = (await response.json()) as unknown;
        const outputText = readOpenAiOutputText(payload);
        if (!outputText) throw new Error("missing output");
        const parsed = nutritionAnalysisModelSchema.parse(normalizeNutritionModelOutput(JSON.parse(outputText)));
        return normalizeNutritionAnalysis(parsed, input.servings);
      } catch (error) {
        if (error instanceof NutritionAnalysisInsufficientError) throw error;
        if (error instanceof ZodError || error instanceof SyntaxError) throw new Error("营养分析失败");
        throw new Error("营养分析失败");
      }
    },
  };
}
