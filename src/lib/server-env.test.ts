import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseRecipeAiEnv } from "@/lib/server-env";

describe("recipe AI server environment", () => {
  it("requires a server-side OpenAI key", () => {
    expect(() => parseRecipeAiEnv({})).toThrow("AI 服务配置缺失");
  });

  it("uses gpt-5-mini unless a valid model override is supplied", () => {
    expect(parseRecipeAiEnv({ OPENAI_API_KEY: "sk-test" })).toEqual({
      OPENAI_API_KEY: "sk-test",
      RECIPE_AI_MODEL: "gpt-5-mini",
    });
    expect(parseRecipeAiEnv({ OPENAI_API_KEY: "sk-test", RECIPE_AI_MODEL: "gpt-5.1" }).RECIPE_AI_MODEL).toBe("gpt-5.1");
  });
});
