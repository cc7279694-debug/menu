import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createQianwenNutritionAnalyzer } from "@/features/nutrition-analysis/qianwen-analyzer";

const input = { ingredientText: "200克牛肉 + 100克熟米饭", servings: 2 };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Qwen nutrition analyzer", () => {
  it("requests structured JSON and normalizes total to per-serving metrics", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify({
        total: { caloriesKcal: 601.4, proteinGrams: 50.24, fatGrams: 20.36, carbsGrams: 70.25 },
        ingredients: [{ name: "牛肉", normalizedAmount: "200克", caloriesKcal: 400, proteinGrams: 42 }],
        assumptions: ["熟米饭按熟重理解"], omittedItems: [], confidence: "medium",
      }) } }],
    }));
    const analyzer = createQianwenNutritionAnalyzer({
      fetchImpl,
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(analyzer.analyze(input)).resolves.toMatchObject({
      total: { caloriesKcal: 601, proteinGrams: 50.2, fatGrams: 20.4, carbsGrams: 70.3 },
      perServing: { caloriesKcal: 301, proteinGrams: 25.1, fatGrams: 10.2, carbsGrams: 35.2 },
    });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ model: "qwen3.8-flash", response_format: { type: "json_object" }, temperature: 0.1, stream: false, enable_thinking: false });
  });

  it("maps provider failures to stable Chinese errors", async () => {
    const make = (status: number, body: unknown = {}) => createQianwenNutritionAnalyzer({ fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response(body, status)), env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" } });
    await expect(make(401).analyze(input)).rejects.toThrow("AI 服务认证失败");
    await expect(make(429).analyze(input)).rejects.toThrow("AI 服务请求过于频繁");
    await expect(make(503).analyze(input)).rejects.toThrow("AI 服务暂时不可用");
  });

  it("reports unavailable model and insufficient input distinctly", async () => {
    const unavailable = createQianwenNutritionAnalyzer({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({ code: "ModelNotFound", message: "model unavailable" }, 400)),
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });
    await expect(unavailable.analyze(input)).rejects.toThrow("AI 模型不可用");

    const insufficient = createQianwenNutritionAnalyzer({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({ total: { caloriesKcal: null, proteinGrams: null, fatGrams: null, carbsGrams: null }, ingredients: [], assumptions: [], omittedItems: ["适量油"], confidence: "low" }) } }] })),
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });
    await expect(insufficient.analyze(input)).rejects.toThrow("营养分析信息不足");
  });

  it("rejects malformed or out-of-range model output safely", async () => {
    const analyzer = createQianwenNutritionAnalyzer({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({ total: { caloriesKcal: -1, proteinGrams: null, fatGrams: null, carbsGrams: null }, ingredients: [], assumptions: [], omittedItems: [], confidence: "low" }) } }] })),
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });
    await expect(analyzer.analyze(input)).rejects.toThrow("营养分析失败");
  });

  it("normalizes common nutrition aliases and ignores extra model explanations", async () => {
    const analyzer = createQianwenNutritionAnalyzer({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: JSON.stringify({
        totalNutrition: { calories: "601.4", protein: "50.24", fat: "20.36", carbohydrates: "70.25" },
        ingredientContributions: [{ name: "牛肉", amount: "200克", calories: "400", protein: "42", fat: "18", note: "按生重" }],
        assumptions: ["熟米饭按熟重理解"], omittedItems: [], confidence: "medium", explanation: "仅作日常参考",
      }) } }] })),
      env: { API_KEY: "sk-test", RECIPE_AI_MODEL: "qwen3.8-flash" },
    });

    await expect(analyzer.analyze(input)).resolves.toMatchObject({
      total: { caloriesKcal: 601, proteinGrams: 50.2, fatGrams: 20.4, carbsGrams: 70.3 },
      ingredients: [{ name: "牛肉", normalizedAmount: "200克", caloriesKcal: 400, proteinGrams: 42 }],
      perServing: { caloriesKcal: 301, proteinGrams: 25.1 },
    });
  });
});
