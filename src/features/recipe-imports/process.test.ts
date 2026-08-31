import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const providerMocks = vi.hoisted(() => ({
  auto: { extract: vi.fn() },
  qwen: { extract: vi.fn() },
  gemini: { extract: vi.fn() },
}));
vi.mock("@/features/recipe-imports/recipe-ai-extractor", () => ({ createRecipeAiExtractor: () => providerMocks.auto }));
vi.mock("@/features/recipe-imports/qianwen-extractor", () => ({ createQianwenRecipeDraftExtractor: () => providerMocks.qwen }));
vi.mock("@/features/recipe-imports/gemini-extractor", () => ({ createGeminiRecipeDraftExtractor: () => providerMocks.gemini }));

import { createRecipeDraftExtractorForProvider, mapImportErrorCode, processRecipeImport } from "@/features/recipe-imports/process";

describe("recipe import process state machine", () => {
  it("selects the requested provider and keeps auto mode distinct", () => {
    expect(createRecipeDraftExtractorForProvider("auto")).toBe(providerMocks.auto);
    expect(createRecipeDraftExtractorForProvider("qwen")).toBe(providerMocks.qwen);
    expect(createRecipeDraftExtractorForProvider("gemini")).toBe(providerMocks.gemini);
  });

  it("maps known failures to stable codes", () => {
    expect(mapImportErrorCode(new Error("不支持访问该地址"))).toBe("unsafe_url");
    expect(mapImportErrorCode(new Error("网页暂时无法访问"))).toBe("source_unreadable");
    expect(mapImportErrorCode(new Error("网页格式不受支持"))).toBe("source_unreadable");
    expect(mapImportErrorCode(new Error("网页跳转次数过多"))).toBe("source_unreadable");
    expect(mapImportErrorCode(new Error("AI 服务请求过于频繁"))).toBe("ai_rate_limited");
    expect(mapImportErrorCode(new Error("AI 服务暂时不可用"))).toBe("ai_unavailable");
    expect(mapImportErrorCode(new Error("菜谱内容整理失败"))).toBe("invalid_ai_output");
  });

  it("moves a text job to extracting and review with validated AI output", async () => {
    const draft = {
      title: "番茄炒蛋", description: null, baseServings: 2, prepMinutes: null, cookMinutes: 5, personalNotes: null,
      suggestedCategoryName: null, suggestedTagNames: [],
      ingredients: [{ name: "鸡蛋", groupType: "main", quantity: 2, quantityText: null, unit: "个", preparationNote: null }],
      steps: [{ instruction: "炒熟", heatLevel: "中火", timerSeconds: null, ingredientNames: ["鸡蛋"] }], preparations: [], warnings: [],
      review: { fieldChecks: [], requiresConfirmation: false, confirmedAt: null },
    };
    const update = vi.fn().mockResolvedValue({ data: { id: "job" }, error: null });
    const job = { id: "job", user_id: "user", source_type: "text", source_text: "鸡蛋两个，中火炒熟。".repeat(5), source_url: null, source_title: null, source_author: null, source_platform: null, image_paths: [], status: "queued", draft: null, warnings: [], error_code: null, recipe_id: null, expires_at: "future" };
    const supabase = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: job, error: null }) })) })) })), update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: update })) })) })) })) })) };
    const extractor = { extract: vi.fn().mockResolvedValue(draft) };
    await expect(processRecipeImport("job", { supabase: supabase as never, userId: "user", extractor, fetchDocument: vi.fn() as never })).resolves.toEqual({ status: "review", draft });
    expect(extractor.extract).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});
