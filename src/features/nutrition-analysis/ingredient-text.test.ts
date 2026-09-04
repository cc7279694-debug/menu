import { describe, expect, it } from "vitest";

import { buildRecipeIngredientText } from "@/features/nutrition-analysis/ingredient-text";

describe("buildRecipeIngredientText", () => {
  it("prefers numeric amounts and keeps text amounts and preparation notes", () => {
    expect(buildRecipeIngredientText([
      { name: "牛肉", quantity: 200, unit: "克", quantityText: null, preparationNote: "切片" },
      { name: "盐", quantity: null, unit: null, quantityText: "少许", preparationNote: null },
    ])).toBe("牛肉 200克（切片）\n盐 少许");
  });

  it("ignores blank names and does not duplicate units", () => {
    expect(buildRecipeIngredientText([
      { name: " ", quantity: 1, unit: "个", quantityText: "一只", preparationNote: null },
      { name: "鸡蛋", quantity: 2, unit: "个", quantityText: "两个", preparationNote: null },
    ])).toBe("鸡蛋 2个");
  });
});
