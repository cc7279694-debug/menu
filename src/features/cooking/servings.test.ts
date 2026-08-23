import { describe, expect, it } from "vitest";

import {
  formatIngredientAmount,
  formatKitchenQuantity,
  getStepIngredients,
  parseTargetServings,
  scaleQuantity,
} from "./servings";

describe("serving scaling", () => {
  it("scales quantities and formats common kitchen values", () => {
    expect(scaleQuantity(2, 2, 4)).toBe(4);
    expect(formatKitchenQuantity(1.5)).toBe("1 1/2");
    expect(formatKitchenQuantity(0.333333)).toBe("1/3");
    expect(formatKitchenQuantity(1.27)).toBe("1.27");
  });

  it("uses the fallback for invalid serving input", () => {
    expect(parseTargetServings("0", 2)).toBe(2);
    expect(parseTargetServings("4.5", 2)).toBe(4.5);
    expect(parseTargetServings("2.345", 2)).toBe(2);
    expect(parseTargetServings(2.345, 2)).toBe(2);
  });

  it("formats text and units without adding an empty unit", () => {
    expect(formatIngredientAmount(2, null, "个")).toBe("2 个");
    expect(formatIngredientAmount(null, "少许", null)).toBe("少许");
  });

  it("prefers text amounts and falls back to 适量", () => {
    expect(formatIngredientAmount(2, "少许", "个")).toBe("少许 个");
    expect(formatIngredientAmount(null, null, null)).toBe("适量");
  });

  it("does not turn near-but-unconfirmed values into fractions", () => {
    expect(formatKitchenQuantity(1.26)).toBe("1.26");
    expect(formatKitchenQuantity(0.25005)).toBe("0.25");
  });
});

describe("step ingredient projection", () => {
  it("keeps recipe order, discards unlinked items, and applies overrides", () => {
    const recipe = {
      baseServings: 2,
      ingredients: [
        { id: "egg", name: "鸡蛋", quantity: 1, quantityText: null, unit: "个", preparationNote: "打散", sortOrder: 0 },
        { id: "salt", name: "盐", quantity: null, quantityText: "少许", unit: null, preparationNote: null, sortOrder: 1 },
        { id: "oil", name: "油", quantity: 1, quantityText: null, unit: "勺", preparationNote: null, sortOrder: 2 },
      ],
      steps: [
        {
          id: "step-1",
          instruction: "混合",
          imagePath: null,
          imageUrl: null,
          timerSeconds: null,
          sortOrder: 0,
          ingredientLinks: [
            { recipeIngredientId: "salt", quantityOverride: null, quantityTextOverride: "少许", note: null },
            { recipeIngredientId: "egg", quantityOverride: 1, quantityTextOverride: null, note: "先用一半" },
          ],
        },
      ],
    };

    expect(getStepIngredients(recipe, "step-1", 4)).toEqual([
      expect.objectContaining({ name: "鸡蛋", amount: "2 个", preparationNote: "打散", linkNote: "先用一半" }),
      expect.objectContaining({ name: "盐", amount: "少许", preparationNote: null, linkNote: null }),
    ]);
  });

  it("uses a numeric step override before the ingredient text amount", () => {
    const recipe = {
      baseServings: 2,
      ingredients: [
        { id: "stock", name: "高汤", quantity: null, quantityText: "按需", unit: "毫升", preparationNote: null, sortOrder: 0 },
      ],
      steps: [
        {
          id: "step-1",
          ingredientLinks: [
            { recipeIngredientId: "stock", quantityOverride: 100, quantityTextOverride: null, note: null },
          ],
        },
      ],
    };

    expect(getStepIngredients(recipe, "step-1", 4)[0].amount).toBe("200 毫升");
  });
});
