import "server-only";

import { z } from "zod";

const recipeAiEnvSchema = z.object({
  DASHSCOPE_API_KEY: z.string().trim().min(1).optional(),
  QIANWEN_API_KEY: z.string().trim().min(1).optional(),
  RECIPE_AI_MODEL: z.string().trim().min(1).max(100).default("qwen3.7-flash"),
});

const geminiRecipeAiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1),
  GEMINI_RECIPE_AI_MODEL: z.string().trim().min(1).max(100).default("gemini-3.7-flash"),
});

export type RecipeAiEnv = {
  API_KEY: string;
  RECIPE_AI_MODEL: string;
};

export type GeminiRecipeAiEnv = {
  API_KEY: string;
  RECIPE_AI_MODEL: string;
};

export function parseRecipeAiEnv(input: Record<string, string | undefined>): RecipeAiEnv {
  const parsed = recipeAiEnvSchema.safeParse(input);
  if (!parsed.success || (!parsed.data.QIANWEN_API_KEY && !parsed.data.DASHSCOPE_API_KEY)) {
    throw new Error("AI 服务配置缺失");
  }
  return {
    API_KEY: parsed.data.QIANWEN_API_KEY ?? parsed.data.DASHSCOPE_API_KEY!,
    RECIPE_AI_MODEL: parsed.data.RECIPE_AI_MODEL,
  };
}

export function getRecipeAiEnv(): RecipeAiEnv {
  return parseRecipeAiEnv({
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
    QIANWEN_API_KEY: process.env.QIANWEN_API_KEY,
    RECIPE_AI_MODEL: process.env.RECIPE_AI_MODEL,
  });
}

export function parseGeminiRecipeAiEnv(input: Record<string, string | undefined>): GeminiRecipeAiEnv {
  const parsed = geminiRecipeAiEnvSchema.safeParse(input);
  if (!parsed.success) throw new Error("Gemini 服务配置缺失");
  return { API_KEY: parsed.data.GEMINI_API_KEY, RECIPE_AI_MODEL: parsed.data.GEMINI_RECIPE_AI_MODEL };
}

export function getGeminiRecipeAiEnv(): GeminiRecipeAiEnv {
  return parseGeminiRecipeAiEnv({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_RECIPE_AI_MODEL: process.env.GEMINI_RECIPE_AI_MODEL,
  });
}
