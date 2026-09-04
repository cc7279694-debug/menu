import { describe, expect, it } from "vitest";

import {
  nutritionAnalysisInputSchema,
  nutritionAnalysisModelSchema,
} from "@/features/nutrition-analysis/schemas";

describe("nutritionAnalysisInputSchema", () => {
  it("accepts ingredient text and servings", () => {
    expect(
      nutritionAnalysisInputSchema.parse({
        ingredientText: "200克牛肉 + 100克熟米饭",
        servings: 2,
      }),
    ).toEqual({ ingredientText: "200克牛肉 + 100克熟米饭", servings: 2 });
  });

  it("trims text and coerces a numeric serving count", () => {
    expect(
      nutritionAnalysisInputSchema.parse({
        ingredientText: "  100 克鸡胸肉  ",
        servings: "2",
      }),
    ).toEqual({ ingredientText: "100 克鸡胸肉", servings: 2 });
  });

  it("rejects empty text and invalid servings", () => {
    expect(
      nutritionAnalysisInputSchema.safeParse({ ingredientText: " ", servings: 0 })
        .success,
    ).toBe(false);
    expect(
      nutritionAnalysisInputSchema.safeParse({ ingredientText: "牛肉", servings: 101 })
        .success,
    ).toBe(false);
  });

  it("rejects unknown input fields", () => {
    expect(
      nutritionAnalysisInputSchema.safeParse({
        ingredientText: "牛肉",
        servings: 1,
        debug: true,
      }).success,
    ).toBe(false);
  });
});

describe("nutritionAnalysisModelSchema", () => {
  it("keeps an all-null model result so the service can return a specific insufficient-input error", () => {
    const parsed = nutritionAnalysisModelSchema.safeParse({
      total: { caloriesKcal: null, proteinGrams: null, fatGrams: null, carbsGrams: null },
      ingredients: [],
      assumptions: [],
      omittedItems: [],
      confidence: "low",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts bounded ingredient contributions and rejects malformed metrics", () => {
    const parsed = nutritionAnalysisModelSchema.safeParse({
      total: { caloriesKcal: 500, proteinGrams: 40, fatGrams: null, carbsGrams: 20 },
      ingredients: [
        {
          name: "牛肉",
          normalizedAmount: "200 克（生重）",
          caloriesKcal: 400,
          proteinGrams: 38,
        },
      ],
      assumptions: ["牛肉按生重计算"],
      omittedItems: ["少许食用油"],
      confidence: "medium",
    });
    expect(parsed.success).toBe(true);

    expect(
      nutritionAnalysisModelSchema.safeParse({
        total: { caloriesKcal: -1, proteinGrams: null, fatGrams: null, carbsGrams: null },
        ingredients: [],
        assumptions: [],
        omittedItems: [],
        confidence: "low",
      }).success,
    ).toBe(false);
  });

  it("rejects more than 100 contributions or 20 assumptions", () => {
    const contribution = {
      name: "食材",
      normalizedAmount: null,
      caloriesKcal: 1,
      proteinGrams: 0,
    };
    const base = {
      total: { caloriesKcal: 1, proteinGrams: 0, fatGrams: 0, carbsGrams: 0 },
      ingredients: Array.from({ length: 101 }, () => contribution),
      assumptions: [],
      omittedItems: [],
      confidence: "high" as const,
    };
    expect(nutritionAnalysisModelSchema.safeParse(base).success).toBe(false);
    expect(
      nutritionAnalysisModelSchema.safeParse({
        ...base,
        ingredients: [],
        assumptions: Array.from({ length: 21 }, () => "假设"),
      }).success,
    ).toBe(false);
  });
});
