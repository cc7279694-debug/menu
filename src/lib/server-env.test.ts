import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseGeminiRecipeAiEnv, parseRecipeAiEnv } from "@/lib/server-env";

describe("recipe AI server environment", () => {
  it("requires a server-side Qwen key", () => {
    expect(() => parseRecipeAiEnv({})).toThrow("AI 服务配置缺失");
  });

  it("uses qwen3.7-flash unless a model override is supplied", () => {
    expect(parseRecipeAiEnv({ DASHSCOPE_API_KEY: "sk-test" })).toEqual({
      API_KEY: "sk-test",
      RECIPE_AI_MODEL: "qwen3.7-flash",
    });
    expect(parseRecipeAiEnv({ QIANWEN_API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" })).toEqual({
      API_KEY: "sk-test",
      RECIPE_AI_MODEL: "qwen3.8-flash",
    });
  });

  it("prefers the QianWen alias when both key names are configured", () => {
    expect(parseRecipeAiEnv({ DASHSCOPE_API_KEY: "dashscope-key", QIANWEN_API_KEY: "qianwen-key" }).API_KEY).toBe("qianwen-key");
  });

  it("parses the optional Gemini fallback configuration", () => {
    expect(parseGeminiRecipeAiEnv({ GEMINI_API_KEY: "AIza-test" })).toEqual({
      API_KEY: "AIza-test",
      RECIPE_AI_MODEL: "gemini-3.7-flash",
    });
    expect(() => parseGeminiRecipeAiEnv({})).toThrow("Gemini 服务配置缺失");
  });
});
