import "server-only";

import { z } from "zod";

const recipeAiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1),
  RECIPE_AI_MODEL: z.string().trim().min(1).max(100).default("gpt-5-mini"),
});

export type RecipeAiEnv = z.infer<typeof recipeAiEnvSchema>;

export function parseRecipeAiEnv(input: Record<string, string | undefined>): RecipeAiEnv {
  const parsed = recipeAiEnvSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("AI 服务配置缺失");
  }
  return parsed.data;
}

export function getRecipeAiEnv(): RecipeAiEnv {
  return parseRecipeAiEnv({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RECIPE_AI_MODEL: process.env.RECIPE_AI_MODEL,
  });
}
