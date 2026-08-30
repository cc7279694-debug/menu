import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRecipeAiExtractor } from "@/features/recipe-imports/recipe-ai-extractor";

const input = {
  document: { platform: "test", title: "菜", author: null, canonicalUrl: null, text: "内容", imageUrls: [] },
  imageUrls: [],
};
const draft = {
  title: "菜",
  description: null,
  baseServings: 2,
  prepMinutes: null,
  cookMinutes: null,
  personalNotes: null,
  suggestedCategoryName: null,
  suggestedTagNames: [],
  ingredients: [{ name: "盐", groupType: "seasoning" as const, quantity: null, quantityText: "适量", unit: null, preparationNote: null }],
  steps: [{ instruction: "完成", heatLevel: null, timerSeconds: null, ingredientNames: [] }],
  warnings: [],
};

describe("recipe AI fallback extractor", () => {
  it("calls Gemini once only after a retryable Qwen failure", async () => {
    const primary = { extract: vi.fn().mockRejectedValue(new Error("AI 服务请求过于频繁")) };
    const fallback = { extract: vi.fn().mockResolvedValue(draft) };
    const extractor = createRecipeAiExtractor({ primary, fallback });

    await expect(extractor.extract(input)).resolves.toEqual(draft);
    expect(primary.extract).toHaveBeenCalledTimes(1);
    expect(fallback.extract).toHaveBeenCalledTimes(1);
  });

  it("does not call fallback for unrelated application errors", async () => {
    const primary = { extract: vi.fn().mockRejectedValue(new Error("数据库连接失败")) };
    const fallback = { extract: vi.fn().mockResolvedValue(draft) };
    const extractor = createRecipeAiExtractor({ primary, fallback });

    await expect(extractor.extract(input)).rejects.toThrow("数据库连接失败");
    expect(fallback.extract).not.toHaveBeenCalled();
  });
});
