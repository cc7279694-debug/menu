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
  preparations: [],
  warnings: [],
};

const explicitDraft = {
  ...draft,
  fieldChecks: [
    { path: "prepMinutes", label: "总准备时间", status: "explicit", message: null },
    { path: "cookMinutes", label: "总烹饪时间", status: "explicit", message: null },
    { path: "ingredients.0.quantity", label: "第 1 项食材数量", status: "explicit", message: null },
    { path: "ingredients.0.unit", label: "第 1 项食材单位", status: "explicit", message: null },
    { path: "steps.0.heatLevel", label: "第 1 步火候", status: "explicit", message: null },
    { path: "steps.0.timerSeconds", label: "第 1 步计时", status: "explicit", message: null },
    { path: "suggestedCategoryName", label: "建议分类", status: "explicit", message: null },
    { path: "suggestedTagNames", label: "建议标签", status: "explicit", message: null },
  ],
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
  it("includes nutrition analysis in the same request and keeps inferred values for review", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify({
        ...draft,
        nutrition: { caloriesKcal: 460, proteinGrams: 31, fatGrams: null, carbsGrams: null, isEstimated: false },
        fieldChecks: [{ path: "nutrition.caloriesKcal", label: "每份热量", status: "inferred", message: null }],
      }) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: [] })).resolves.toMatchObject({
      nutrition: { caloriesKcal: 460, proteinGrams: 31, isEstimated: true },
      review: { requiresConfirmation: true, confirmedAt: null },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(payload.messages[0].content).toContain("食材用量与基础份数足以支持日常参考时，可以分析每份营养并标记 inferred");
    expect(payload.messages[0].content).toContain("关键用量不足时保持 null、标记 missing，并在 warnings 中说明原因");
  });

  it("requests structured JSON and validates the returned draft", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify(explicitDraft) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/image.webp"] })).resolves.toMatchObject({ ...draft, review: { requiresConfirmation: false, confirmedAt: null } });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe("qwen3.8-flash");
    expect(payload.response_format.type).toBe("json_object");
    expect(payload.messages[1].content).toContainEqual({ type: "image_url", image_url: { url: "https://example.com/image.webp" } });
    expect(payload.messages[1].content).not.toContainEqual(expect.objectContaining({ type: "video_url" }));
    expect(payload.enable_thinking).toBe(false);
    expect(payload.stream).toBe(false);
  });

  it("uses the OpenAI-compatible multimodal content for video sources", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify(explicitDraft) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(extractor.extract({
      document: { ...document, videoUrls: ["https://example.com/recipe.mp4"] },
      imageUrls: [],
    })).resolves.toMatchObject({ ...draft, review: { requiresConfirmation: false, confirmedAt: null } });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    const payload = JSON.parse(String(init?.body));
    expect(payload.messages[1].content).toContainEqual({ type: "video_url", video_url: { url: "https://example.com/recipe.mp4" } });
    expect(payload.response_format.type).toBe("json_object");
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

  it("identifies an unavailable model without exposing provider details", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      code: "ModelNotFound",
      message: "The model qwen3.8-flash does not exist or you do not have access to it",
    }, 400));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: [] })).rejects.toThrow("AI 模型不可用");
  });

  it("rejects malformed or schema-invalid model output without exposing the response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify({ ...draft, ingredients: [] }) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" } });
    await expect(extractor.extract({ document, imageUrls: [] })).rejects.toThrow("菜谱内容整理失败");
  });

  it("passes images as OpenAI-compatible multimodal content", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify(explicitDraft) } }],
    }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.7-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://example.com/image.avif"] })).resolves.toMatchObject({ ...draft, review: { requiresConfirmation: false, confirmedAt: null } });
    const payload = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(payload.messages[1].content).toContainEqual({ type: "image_url", image_url: { url: "https://example.com/image.avif" } });
  });

  it("retries blocked remote images as inline data when Qwen cannot download them", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ code: "invalid_parameter_error", message: "Failed to download multimodal content" }, 400))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } }))
      .mockResolvedValueOnce(response({ choices: [{ message: { content: JSON.stringify(explicitDraft) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(extractor.extract({ document, imageUrls: ["https://sns-webpic-qc.xhscdn.com/example.jpg"] })).resolves.toMatchObject({ ...draft, review: { requiresConfirmation: false, confirmedAt: null } });

    const retryPayload = JSON.parse(String(fetchImpl.mock.calls[2]?.[1]?.body));
    expect(retryPayload.messages[1].content).toContainEqual({
      type: "image_url",
      image_url: { url: "data:image/jpeg;base64,AQID" },
    });
  });

  it("normalizes optional model fields before schema validation", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
      title: "干锅脆鱼",
      ingredients: [{ name: "鱼片", groupType: "主料", quantity: "适量" }],
      steps: [{ instruction: { text: "炸至金黄" }, timerSeconds: "120", ingredientNames: [] }],
      fieldChecks: [{ path: "steps.0.timerSeconds", label: "第 1 步计时", status: "explicit", message: null }],
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

  it("normalizes common Qwen recipe aliases and nested step text", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
      name: "鱼香肉丝",
      servings: "2",
      prepTimeMinutes: "10",
      cookTimeMinutes: 15,
      ingredients: [{ name: "猪里脊", groupType: "主料", quantity: null, quantityText: "适量" }],
      steps: [{ instruction: { description: { text: "腌制肉丝" } }, ingredientNames: [] }],
      warnings: [],
      fieldChecks: [
        { path: "prepMinutes", label: "总准备时间", status: "explicit", message: null },
        { path: "cookMinutes", label: "总烹饪时间", status: "explicit", message: null },
      ],
    }) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" } });
    await expect(extractor.extract({ document, imageUrls: [] })).resolves.toMatchObject({
      title: "鱼香肉丝",
      baseServings: 2,
      prepMinutes: 10,
      cookMinutes: 15,
      steps: [{ instruction: "腌制肉丝" }],
    });
  });

  it("unwraps a recipe envelope returned by Qwen", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
      recipe: { name: "鱼香肉丝", ingredients: [{ name: "猪肉丝", groupType: "main", quantity: null, quantityText: "适量" }], steps: [{ instruction: "翻炒" }] },
      warnings: ["数量待确认"],
    }) } }] }));
    const extractor = createQianwenRecipeDraftExtractor({ fetchImpl, env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" } });
    await expect(extractor.extract({ document, imageUrls: [] })).resolves.toMatchObject({ title: "鱼香肉丝", ingredients: [{ name: "猪肉丝" }], steps: [{ instruction: "翻炒" }] });
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
