import { describe, expect, it } from "vitest";

import {
  attachRecipeImportImagesSchema,
  createRecipeImportSchema,
  recipeAiProviderSchema,
  recipeImportDraftSchema,
  recipeImportDraftModelSchema,
} from "@/features/recipe-imports/schemas";

const validDraft = {
  title: "番茄炒蛋",
  description: "家常快手菜",
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 8,
  personalNotes: null,
  suggestedCategoryName: "家常菜",
  suggestedTagNames: ["快手", "炒"],
  ingredients: [
    {
      name: "鸡蛋",
      groupType: "main",
      quantity: 2,
      quantityText: null,
      unit: "个",
      preparationNote: null,
    },
    {
      name: "盐",
      groupType: "seasoning",
      quantity: null,
      quantityText: "适量",
      unit: null,
      preparationNote: null,
    },
  ],
  steps: [
    {
      instruction: "鸡蛋打散。",
      heatLevel: "中火",
      timerSeconds: 65,
      ingredientNames: ["鸡蛋"],
    },
  ],
  preparations: [],
  warnings: [],
  nutrition: null,
};

describe("recipe import schemas", () => {
  it("accepts a structured draft with seasoning and heat fields", () => {
    const parsed = recipeImportDraftModelSchema.parse(validDraft);
    expect(parsed.ingredients[1]?.groupType).toBe("seasoning");
    expect(parsed.steps[0]?.heatLevel).toBe("中火");
  });

  it("accepts partial nutrition facts while keeping missing metrics nullable", () => {
    const parsed = recipeImportDraftModelSchema.parse({
      ...validDraft,
      nutrition: { caloriesKcal: 380, proteinGrams: 26, fatGrams: null, carbsGrams: null, isEstimated: false },
    });
    expect(parsed.nutrition).toMatchObject({ caloriesKcal: 380, proteinGrams: 26, fatGrams: null });
  });

  it("separates AI field checks from server confirmation metadata", () => {
    const model = recipeImportDraftModelSchema.parse({
      ...validDraft,
      fieldChecks: [
        { path: "ingredients.0.quantity", status: "missing", label: "鱼片的用量", message: "来源没有给出重量" },
      ],
    });

    expect(model.fieldChecks[0]?.status).toBe("missing");
    expect(recipeImportDraftModelSchema.safeParse({
      ...validDraft,
      confirmedAt: "2026-08-31T10:00:00.000Z",
    }).success).toBe(false);

    const stored = recipeImportDraftSchema.parse({
      ...validDraft,
      review: {
        fieldChecks: model.fieldChecks,
        requiresConfirmation: true,
        confirmedAt: null,
      },
    });
    expect(stored.review.requiresConfirmation).toBe(true);
    expect(stored.review.confirmedAt).toBeNull();
  });

  it("rejects an empty recipe or too many warnings", () => {
    expect(() => recipeImportDraftSchema.parse({ ...validDraft, ingredients: [] })).toThrow();
    expect(() => recipeImportDraftSchema.parse({ ...validDraft, steps: [] })).toThrow();
    expect(() => recipeImportDraftSchema.parse({ ...validDraft, warnings: Array(21).fill("请确认") })).toThrow();
  });

  it("accepts exactly one supported source shape", () => {
    expect(createRecipeImportSchema.parse({ sourceType: "url", sourceUrl: "https://example.com/recipe" })).toEqual({
      sourceType: "url",
      sourceUrl: "https://example.com/recipe",
      aiProvider: "auto",
    });
    expect(createRecipeImportSchema.parse({ sourceType: "text", sourceText: "这是一段足够长的菜谱文字，用来测试粘贴文字导入，并且包含食材、调料和步骤信息，最后还会记录火候和烹饪时间。", aiProvider: "qwen" })).toMatchObject({ sourceType: "text", aiProvider: "qwen" });
    expect(createRecipeImportSchema.parse({ sourceType: "images", aiProvider: "gemini" })).toEqual({ sourceType: "images", aiProvider: "gemini" });
    expect(() => createRecipeImportSchema.parse({ sourceType: "text", sourceText: "太短" })).toThrow();
    expect(() => recipeAiProviderSchema.parse("other")).toThrow();
  });

  it("limits image paths to six owned candidates", () => {
    const importId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const paths = Array.from({ length: 6 }, (_, index) => `user/${importId}/${index}.webp`);
    expect(attachRecipeImportImagesSchema.parse({ importId, imagePaths: paths }).imagePaths).toHaveLength(6);
    expect(() => attachRecipeImportImagesSchema.parse({ importId, imagePaths: [...paths, "user/id/7.webp"] })).toThrow();
  });
});
