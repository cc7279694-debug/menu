import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createOpenAiRecipeDraftExtractor } from "@/features/recipe-imports/openai-extractor";

const draft = {
  title: "番茄炒蛋",
  description: "家常快手菜",
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 8,
  personalNotes: null,
  suggestedCategoryName: "家常菜",
  suggestedTagNames: ["快手"],
  ingredients: [{ name: "鸡蛋", groupType: "main", quantity: 2, quantityText: null, unit: "个", preparationNote: null }],
  steps: [{ instruction: "鸡蛋打散。", heatLevel: "中火", timerSeconds: 65, ingredientNames: ["鸡蛋"] }],
  warnings: [],
};

const document = {
  platform: "example",
  title: "番茄炒蛋",
  author: null,
  canonicalUrl: "https://example.com/recipe",
  text: "鸡蛋两个，打散后中火炒熟。",
  imageUrls: [],
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("OpenAI recipe draft extractor", () => {
  it("requests strict structured JSON and validates the returned draft", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      output: [{ content: [{ type: "output_text", text: JSON.stringify(draft) }] }],
    }));
    const extractor = createOpenAiRecipeDraftExtractor({
      fetchImpl,
      env: { OPENAI_API_KEY: "sk-test", RECIPE_AI_MODEL: "gpt-5-mini" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/image.webp"] })).resolves.toEqual(draft);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe("gpt-5-mini");
    expect(payload.text.format.type).toBe("json_schema");
    expect(payload.text.format.strict).toBe(true);
    expect(payload.input[1].content.some((part: { type: string }) => part.type === "input_image")).toBe(true);
  });

  it("maps provider failures to stable user-facing errors", async () => {
    const makeExtractor = (status: number) => createOpenAiRecipeDraftExtractor({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({}, status)),
      env: { OPENAI_API_KEY: "sk-test", RECIPE_AI_MODEL: "gpt-5-mini" },
    });

    await expect(makeExtractor(429).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务请求过于频繁");
    await expect(makeExtractor(503).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务暂时不可用");
  });

  it("rejects malformed or schema-invalid model output without exposing the response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...draft, ingredients: [] }) }] }],
    }));
    const extractor = createOpenAiRecipeDraftExtractor({ fetchImpl, env: { OPENAI_API_KEY: "sk-test", RECIPE_AI_MODEL: "gpt-5-mini" } });
    await expect(extractor.extract({ document, imageUrls: [] })).rejects.toThrow("菜谱内容整理失败");
  });
});
