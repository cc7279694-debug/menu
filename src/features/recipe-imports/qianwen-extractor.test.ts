import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createQianwenRecipeDraftExtractor } from "@/features/recipe-imports/qianwen-extractor";

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

describe("QianWen recipe draft extractor", () => {
  it("requests structured JSON and validates the returned draft", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify(draft) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/image.webp"] })).resolves.toEqual(draft);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe("qwen3.7-flash");
    expect(payload.response_format.type).toBe("json_object");
    expect(payload.messages[1].content.some((part: { type: string }) => part.type === "image_url")).toBe(true);
    expect(payload.max_tokens).toBeUndefined();
    expect(payload.stream).toBe(false);
  });

  it("maps provider failures to stable user-facing errors", async () => {
    const makeExtractor = (status: number) => createQianwenRecipeDraftExtractor({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({}, status)),
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(makeExtractor(401).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务认证失败");
    await expect(makeExtractor(429).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务请求过于频繁");
    await expect(makeExtractor(503).extract({ document, imageUrls: [] })).rejects.toThrow("AI 服务暂时不可用");
  });

  it("rejects malformed or schema-invalid model output without exposing the response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify({ ...draft, ingredients: [] }) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" } });
    await expect(extractor.extract({ document, imageUrls: [] })).rejects.toThrow("菜谱内容整理失败");
  });

  it("retries without remote images when the provider rejects an image format", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ code: "invalid_parameter_error", message: "The image format is illegal and cannot be opened" }, 400))
      .mockResolvedValueOnce(response({ choices: [{ message: { content: JSON.stringify(draft) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/image.avif"] })).resolves.toEqual(draft);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const retryPayload = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(retryPayload.messages[1].content).toHaveLength(1);
  });

  it("normalizes optional model fields before schema validation", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
      title: "干锅脆鱼",
      ingredients: [{ name: "鱼片", groupType: "主料", quantity: "适量" }],
      steps: [{ instruction: { text: "炸至金黄" }, timerSeconds: "120", ingredientNames: [] }],
    }) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: [] })).resolves.toMatchObject({
      title: "干锅脆鱼",
      baseServings: 2,
      description: null,
      ingredients: [{ groupType: "main", quantity: null, quantityText: "适量", unit: null }],
      steps: [{ timerSeconds: 120, heatLevel: null }],
    });
  });

  it("splits amounts embedded in ingredient names", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
      ...draft,
      ingredients: [
        { name: "豆瓣酱2勺", groupType: "seasoning", quantity: null, quantityText: null, unit: null },
        { name: "干锅酱一包", groupType: "seasoning", quantity: null, quantityText: null, unit: null },
      ],
    }) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: [] })).resolves.toMatchObject({
      ingredients: [
        { name: "豆瓣酱", quantity: 2, quantityText: null, unit: "勺" },
        { name: "干锅酱", quantity: null, quantityText: "一包", unit: null },
      ],
    });
  });

  it("recovers units from source text when the model omits them", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
      ...draft,
      ingredients: [
        { name: "鸡蛋", groupType: "main", quantity: 2, quantityText: null, unit: null },
        { name: "番茄", groupType: "main", quantity: 200, quantityText: null, unit: null },
        { name: "食用油", groupType: "seasoning", quantity: 1, quantityText: null, unit: null },
      ],
    }) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(extractor.extract({
      document: { ...document, text: "食材：鸡蛋2个，番茄200克，食用油1勺。步骤：炒熟。" },
      imageUrls: [],
    })).resolves.toMatchObject({
      ingredients: [
        { name: "鸡蛋", quantity: 2, unit: "个" },
        { name: "番茄", quantity: 200, unit: "克" },
        { name: "食用油", quantity: 1, unit: "勺" },
      ],
    });
  });
});
