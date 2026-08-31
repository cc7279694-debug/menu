import { describe, expect, it } from "vitest";

import { mapImportDraftToRecipeSaveInput } from "@/features/recipe-imports/draft-mapping";

const categoryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const tagId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ids = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
];

describe("mapImportDraftToRecipeSaveInput", () => {
  it("maps taxonomy names, ingredient groups, heat, timers, and links", () => {
    const result = mapImportDraftToRecipeSaveInput({
      draft: {
        title: "番茄炒蛋",
        description: "家常做法",
        baseServings: 2,
        prepMinutes: 5,
        cookMinutes: 8,
        personalNotes: null,
        suggestedCategoryName: "家常菜",
        suggestedTagNames: ["快手", "不存在"],
        ingredients: [
          { name: "番茄", groupType: "main", quantity: 2, quantityText: null, unit: "个", preparationNote: null },
          { name: "盐", groupType: "seasoning", quantity: null, quantityText: "适量", unit: null, preparationNote: null },
        ],
        steps: [{ instruction: "番茄下锅。", heatLevel: "中火", timerSeconds: 65, ingredientNames: ["番茄"] }],
        preparations: [{ ingredientName: "番茄", instruction: "提前腌制", leadTimeMinutes: 30, timingText: null }],
        warnings: ["火候来自原文"],
      },
      categories: [{ id: categoryId, name: "家常菜" }],
      tags: [{ id: tagId, name: "快手" }],
      createId: (() => {
        let index = 0;
        return () => ids[index++] ?? ids[0];
      })(),
    });

    expect(result.value.recipeId).toBe(ids[0]);
    expect(result.value.categoryId).toBe(categoryId);
    expect(result.value.tagIds).toEqual([tagId]);
    expect(result.value.ingredients[1]?.groupType).toBe("seasoning");
    expect(result.value.steps[0]?.heatLevel).toBe("中火");
    expect(result.value.steps[0]?.timerSeconds).toBe(65);
    expect(result.value.steps[0]?.ingredientLinks[0]?.recipeIngredientId).toBe(ids[1]);
    expect(result.value.preparations[0]).toMatchObject({ recipeIngredientId: ids[1], leadTimeMinutes: 30 });
    expect(result.unmatchedCategoryName).toBeNull();
    expect(result.unmatchedTagNames).toEqual(["不存在"]);
  });

  it("preserves an unmatched category and warning in editable values", () => {
    const result = mapImportDraftToRecipeSaveInput({
      draft: {
        title: "清炒时蔬",
        description: null,
        baseServings: 1,
        prepMinutes: null,
        cookMinutes: null,
        personalNotes: null,
        suggestedCategoryName: "减脂餐",
        suggestedTagNames: [],
        ingredients: [{ name: "西兰花", groupType: "main", quantity: null, quantityText: "适量", unit: null, preparationNote: null }],
        steps: [{ instruction: "焯水后装盘。", heatLevel: null, timerSeconds: null, ingredientNames: ["西兰花"] }],
        preparations: [],
        warnings: ["份量未识别"],
      },
      categories: [],
      tags: [],
      createId: () => ids[0],
    });

    expect(result.unmatchedCategoryName).toBe("减脂餐");
    expect(result.value.personalNotes).toContain("份量未识别");
  });
});
