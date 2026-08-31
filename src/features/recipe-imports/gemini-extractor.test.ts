import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGeminiRecipeDraftExtractor } from "@/features/recipe-imports/gemini-extractor";

const draft = {
  title: "干锅脆鱼",
  description: "香辣下饭",
  baseServings: 2,
  prepMinutes: 10,
  cookMinutes: 15,
  personalNotes: null,
  suggestedCategoryName: "家常菜",
  suggestedTagNames: ["下饭"],
  ingredients: [{ name: "鱼片", groupType: "main", quantity: 200, quantityText: null, unit: "克", preparationNote: null }],
  steps: [{ instruction: "鱼片炸至金黄", heatLevel: "中火", timerSeconds: 300, ingredientNames: ["鱼片"] }],
  preparations: [],
  warnings: [],
};

const document = {
  platform: "小红书",
  title: "干锅脆鱼",
  author: null,
  canonicalUrl: "https://example.com/recipe",
  text: "鱼片炸五分钟。",
  imageUrls: [],
};

function response(body: unknown, status = 200, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("Gemini recipe draft extractor", () => {
  it("uses the OpenAI-compatible endpoint and inlines source images", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } }))
      .mockResolvedValueOnce(response({ choices: [{ message: { content: JSON.stringify(draft) } }] }));
    const extractor = createGeminiRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "AIza-test", RECIPE_AI_MODEL: "gemini-3.7-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/image.jpg"] })).resolves.toEqual(draft);

    const [url, init] = fetchImpl.mock.calls[1] ?? [];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer AIza-test");
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe("gemini-3.7-flash");
    expect(payload.response_format.type).toBe("json_object");
    expect(payload.messages[1].content.some((part: { type: string; image_url?: { url?: string } }) => part.type === "image_url" && part.image_url?.url?.startsWith("data:image/jpeg;base64,"))).toBe(true);
  });

  it("maps provider failures to stable user-facing errors", async () => {
    const makeExtractor = (status: number) => createGeminiRecipeDraftExtractor({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({}, status)),
      env: { API_KEY: "AIza-test", RECIPE_AI_MODEL: "gemini-3.7-flash" },
    });

    await expect(makeExtractor(401).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务认证失败");
    await expect(makeExtractor(429).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务请求过于频繁");
    await expect(makeExtractor(503).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务暂时不可用");
  });

  it("skips an unavailable image when text is still available", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response({ choices: [{ message: { content: JSON.stringify(draft) } }] }));
    const extractor = createGeminiRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "AIza-test", RECIPE_AI_MODEL: "gemini-3.7-flash" } });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/missing.jpg"] })).resolves.toEqual(draft);
    const payload = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(payload.messages[1].content).toHaveLength(1);
  });

  it("fails an image-only import when no usable image remains", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({}, 404));
    const extractor = createGeminiRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "AIza-test", RECIPE_AI_MODEL: "gemini-3.7-flash" } });

    await expect(extractor.extract({ document: { ...document, text: "" }, imageUrls: ["https://example.com/missing.jpg"] })).rejects.toThrow("AI 服务暂时不可用");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not inline images that would exceed the total request budget", async () => {
    const oversized = new Uint8Array(16 * 1024 * 1024 + 1);
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(oversized, { status: 200, headers: { "content-type": "image/jpeg" } }))
      .mockResolvedValueOnce(response({ choices: [{ message: { content: JSON.stringify(draft) } }] }));
    const extractor = createGeminiRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "AIza-test", RECIPE_AI_MODEL: "gemini-3.7-flash" } });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/large.jpg"] })).resolves.toEqual(draft);
    const payload = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(payload.messages[1].content).toHaveLength(1);
  });
});
