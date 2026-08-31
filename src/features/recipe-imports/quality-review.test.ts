import { describe, expect, it } from "vitest";

import type { RecipeImportModelDraft } from "@/features/recipe-imports/schemas";
import { buildRecipeImportQualityDraft } from "@/features/recipe-imports/quality-review";

const modelDraft: RecipeImportModelDraft = {
  title: "干锅脆鱼",
  description: null,
  baseServings: 2,
  prepMinutes: 20,
  cookMinutes: 10,
  personalNotes: null,
  suggestedCategoryName: "家常菜",
  suggestedTagNames: ["干锅"],
  ingredients: [
    { name: "鱼片", groupType: "main", quantity: 500, quantityText: null, unit: "克", preparationNote: null },
    { name: "盐", groupType: "seasoning", quantity: null, quantityText: "少许", unit: null, preparationNote: null },
  ],
  steps: [{ instruction: "鱼片下锅炸。", heatLevel: null, timerSeconds: 300, ingredientNames: ["鱼片"] }],
  preparations: [{ ingredientName: "鱼片", instruction: "提前腌制", leadTimeMinutes: 30, timingText: null }],
  warnings: [],
  fieldChecks: [
    { path: "prepMinutes", status: "inferred", label: "准备时间", message: "根据步骤估算" },
    { path: "ingredients.0.quantity", status: "explicit", label: "鱼片的用量", message: null },
    { path: "ingredients.0.quantity", status: "missing", label: "鱼片的用量", message: "来源不清楚" },
    { path: "suggestedTagNames", status: "inferred", label: "标签", message: "根据菜名归类" },
    { path: "steps.0.heatLevel", status: "missing", label: "第 1 步火候", message: "来源未说明" },
    { path: "__proto__.polluted", status: "explicit", label: "非法字段", message: null },
  ],
};

describe("recipe import quality review", () => {
  it("keeps the most conservative status and clears inferred critical values", () => {
    const result = buildRecipeImportQualityDraft(modelDraft);

    expect(result.prepMinutes).toBeNull();
    expect(result.ingredients[0]?.quantity).toBeNull();
    expect(result.ingredients[1]?.quantityText).toBe("少许");
    expect(result.suggestedTagNames).toEqual(["干锅"]);
    expect(result.review.fieldChecks).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "__proto__.polluted" }),
    ]));
    expect(result.review.fieldChecks).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "ingredients.0.quantity", status: "missing" }),
    ]));
    expect(result.review.requiresConfirmation).toBe(true);
    expect(result.review.confirmedAt).toBeNull();
  });

  it("adds missing checks for critical empty fields and deduplicates warnings", () => {
    const result = buildRecipeImportQualityDraft({
      ...modelDraft,
      prepMinutes: null,
      cookMinutes: null,
      ingredients: [{ ...modelDraft.ingredients[0]!, quantity: null, quantityText: null, unit: null }],
      steps: [{ ...modelDraft.steps[0]!, timerSeconds: null }],
      preparations: [{ ...modelDraft.preparations[0]!, leadTimeMinutes: null, timingText: null }],
      warnings: ["请确认", "请确认"],
      fieldChecks: [],
    });

    expect(result.review.fieldChecks).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "prepMinutes", status: "missing" }),
      expect.objectContaining({ path: "cookMinutes", status: "missing" }),
      expect.objectContaining({ path: "ingredients.0.quantity", status: "missing" }),
      expect.objectContaining({ path: "steps.0.timerSeconds", status: "missing" }),
      expect.objectContaining({ path: "preparations.0.leadTimeMinutes", status: "missing" }),
    ]));
    expect(result.warnings[0]).toBe("请确认");
    expect(new Set(result.warnings).size).toBe(result.warnings.length);
  });
});
