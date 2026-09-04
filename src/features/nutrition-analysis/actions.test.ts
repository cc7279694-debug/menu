import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  analyze: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }));
vi.mock("@/features/nutrition-analysis/qianwen-analyzer", () => ({
  createQianwenNutritionAnalyzer: () => ({ analyze: mocks.analyze }),
}));

import { analyzeNutritionAction } from "@/features/nutrition-analysis/actions";

const input = { ingredientText: "200克牛肉", servings: 2 };
const result = {
  total: { caloriesKcal: 400, proteinGrams: 40, fatGrams: null, carbsGrams: null },
  perServing: { caloriesKcal: 200, proteinGrams: 20, fatGrams: null, carbsGrams: null },
  ingredients: [], assumptions: [], omittedItems: [], confidence: "high" as const,
};

describe("analyzeNutritionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    });
    mocks.analyze.mockResolvedValue(result);
  });

  it("rejects invalid input before auth or AI", async () => {
    await expect(analyzeNutritionAction({ ingredientText: "", servings: 1 })).resolves.toEqual({ ok: false, message: "请先输入食材和用量" });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } });
    await expect(analyzeNutritionAction(input)).resolves.toEqual({ ok: false, message: "请先登录后再分析" });
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it("returns structured analysis for an authenticated user", async () => {
    await expect(analyzeNutritionAction(input)).resolves.toEqual({ ok: true, data: result });
    expect(mocks.analyze).toHaveBeenCalledWith(input);
  });

  it("maps analyzer errors without exposing input", async () => {
    mocks.analyze.mockRejectedValue(new Error("AI 服务请求过于频繁"));
    await expect(analyzeNutritionAction(input)).resolves.toEqual({ ok: false, message: "AI 服务请求过于频繁" });
    expect(mocks.analyze.mock.calls.flat().join(" ")).not.toContain(input.ingredientText);
  });
});
