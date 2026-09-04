import { describe, expect, it } from "vitest";

import {
  normalizeNutritionAnalysis,
  NutritionAnalysisInsufficientError,
} from "@/features/nutrition-analysis/math";
import type { NutritionAnalysisModel } from "@/features/nutrition-analysis/types";

const model: NutritionAnalysisModel = {
  total: {
    caloriesKcal: 501.6,
    proteinGrams: 43.26,
    fatGrams: 12.34,
    carbsGrams: null,
  },
  ingredients: [
    {
      name: "牛肉",
      normalizedAmount: "200 克",
      caloriesKcal: 400,
      proteinGrams: 38,
    },
  ],
  assumptions: ["按生重计算"],
  omittedItems: ["少许食用油"],
  confidence: "medium",
};

describe("normalizeNutritionAnalysis", () => {
  it("rounds total values and derives per-serving values for two servings", () => {
    const result = normalizeNutritionAnalysis(model, 2);

    expect(result.total).toEqual({
      caloriesKcal: 502,
      proteinGrams: 43.3,
      fatGrams: 12.3,
      carbsGrams: null,
    });
    expect(result.perServing).toEqual({
      caloriesKcal: 251,
      proteinGrams: 21.7,
      fatGrams: 6.2,
      carbsGrams: null,
    });
    expect(result.ingredients).toEqual(model.ingredients);
    expect(result.omittedItems).toEqual(["少许食用油"]);
  });

  it("preserves legal zero metrics and null metrics", () => {
    const result = normalizeNutritionAnalysis(
      {
        ...model,
        total: {
          caloriesKcal: 0,
          proteinGrams: null,
          fatGrams: 0,
          carbsGrams: null,
        },
      },
      3,
    );

    expect(result.total).toEqual({
      caloriesKcal: 0,
      proteinGrams: null,
      fatGrams: 0,
      carbsGrams: null,
    });
    expect(result.perServing).toEqual({
      caloriesKcal: 0,
      proteinGrams: null,
      fatGrams: 0,
      carbsGrams: null,
    });
  });

  it("throws an insufficient-input error when every total metric is null", () => {
    expect(() =>
      normalizeNutritionAnalysis(
        {
          ...model,
          total: {
            caloriesKcal: null,
            proteinGrams: null,
            fatGrams: null,
            carbsGrams: null,
          },
        },
        1,
      ),
    ).toThrow(NutritionAnalysisInsufficientError);
  });

  it("rejects non-positive or non-finite serving counts", () => {
    expect(() => normalizeNutritionAnalysis(model, 0)).toThrow(RangeError);
    expect(() => normalizeNutritionAnalysis(model, Number.NaN)).toThrow(RangeError);
  });
});
