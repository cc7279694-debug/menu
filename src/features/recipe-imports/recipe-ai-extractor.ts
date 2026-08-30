import "server-only";

import { createGeminiRecipeDraftExtractor } from "@/features/recipe-imports/gemini-extractor";
import { createQianwenRecipeDraftExtractor } from "@/features/recipe-imports/qianwen-extractor";
import { type RecipeDraftExtractor } from "@/features/recipe-imports/schemas";

type RecipeAiExtractorOptions = {
  primary?: RecipeDraftExtractor;
  fallback?: RecipeDraftExtractor | null;
};

const FALLBACK_ERRORS = new Set([
  "AI 服务请求失败",
  "AI 服务请求过于频繁",
  "AI 服务认证失败",
  "AI 服务暂时不可用",
  "菜谱内容整理失败",
]);

function isFallbackCandidate(error: unknown): boolean {
  return error instanceof Error && FALLBACK_ERRORS.has(error.message);
}

export function createRecipeAiExtractor(options: RecipeAiExtractorOptions = {}): RecipeDraftExtractor {
  const primary = options.primary ?? createQianwenRecipeDraftExtractor();
  const fallback = options.fallback !== undefined
    ? options.fallback
    : process.env.GEMINI_API_KEY?.trim()
      ? createGeminiRecipeDraftExtractor()
      : null;

  return {
    async extract(input) {
      try {
        return await primary.extract(input);
      } catch (error) {
        if (!fallback || !isFallbackCandidate(error)) throw error;
        console.warn("[recipe-import] Primary AI extractor failed; trying Gemini fallback");
        return fallback.extract(input);
      }
    },
  };
}
