import { describe, expect, it } from "vitest";

import {
  buildShoppingContributions,
  mergeShoppingContributions,
  normalizeShoppingUnit,
} from "@/features/shopping/merge";
import type {
  ShoppingContribution,
  ShoppingGenerationRecipe,
  ShoppingRecipeSelection,
} from "@/features/shopping/types";

function contribution(overrides: Partial<ShoppingContribution> = {}): ShoppingContribution {
  return {
    recipeId: "recipe-a",
    recipeTitleSnapshot: "番茄炒蛋",
    selectedServings: 2,
    recipeOrder: 0,
    recipeIngredientId: "ingredient-a",
    ingredientId: "tomato",
    nameSnapshot: "番茄",
    quantity: 2,
    quantityText: null,
    unit: "个",
    normalizedUnit: "个",
    aisle: "蔬菜",
    recipeIngredientOrder: 0,
    isManual: false,
    ...overrides,
  };
}

function recipe(overrides: Partial<ShoppingGenerationRecipe> = {}): ShoppingGenerationRecipe {
  return {
    id: "recipe-a",
    title: "番茄炒蛋",
    baseServings: 2,
    ingredients: [
      {
        recipeIngredientId: "ingredient-a",
        ingredientId: "tomato",
        name: "番茄",
        quantity: 2,
        quantityText: null,
        unit: "个",
        aisle: "蔬菜",
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

describe("shopping merge pipeline", () => {
  it("normalizes units conservatively", () => {
    expect(normalizeShoppingUnit(" G ")).toBe("g");
    expect(normalizeShoppingUnit("　G　")).toBe("g");
    expect(normalizeShoppingUnit("克")).toBe("克");
    expect(normalizeShoppingUnit(null)).toBeNull();
  });

  it("builds scaled contributions and keeps recipe order metadata", () => {
    const recipes: ShoppingGenerationRecipe[] = [
      recipe({
        ingredients: [
          {
            recipeIngredientId: "ingredient-a",
            ingredientId: "tomato",
            name: "番茄",
            quantity: 1,
            quantityText: null,
            unit: "个",
            aisle: null,
            sortOrder: 0,
          },
          {
            recipeIngredientId: "ingredient-b",
            ingredientId: "salt",
            name: "盐",
            quantity: 0.3333,
            quantityText: null,
            unit: "g",
            aisle: "调料",
            sortOrder: 1,
          },
        ],
      }),
    ];
    const selections: ShoppingRecipeSelection[] = [{ recipeId: "recipe-a", selectedServings: 3 }];

    const result = buildShoppingContributions(recipes, selections);

    expect(result).toEqual([
      expect.objectContaining({
        recipeIngredientId: "ingredient-a",
        quantity: 1.5,
        aisle: "未分类",
        recipeOrder: 0,
        recipeIngredientOrder: 0,
      }),
      expect.objectContaining({
        recipeIngredientId: "ingredient-b",
        quantity: 0.5,
        normalizedUnit: "g",
        aisle: "调料",
        recipeIngredientOrder: 1,
      }),
    ]);
  });

  it("merges only exact numeric contributions and keeps deterministic source order", () => {
    const result = mergeShoppingContributions(
      [
        contribution({ recipeIngredientId: "a", quantity: 2, unit: "个", normalizedUnit: "个" }),
        contribution({
          recipeId: "recipe-b",
          recipeTitleSnapshot: "番茄炖牛腩",
          selectedServings: 3,
          recipeOrder: 1,
          recipeIngredientId: "b",
          quantity: 3,
          unit: "个",
          normalizedUnit: "个",
          recipeIngredientOrder: 2,
        }),
      ],
      new Set(),
    );

    expect(result[0]).toMatchObject({
      ingredientId: "tomato",
      quantity: 5,
      unit: "个",
      aisle: "蔬菜",
      isManual: false,
      sources: [
        expect.objectContaining({ recipeIngredientId: "a", quantityContribution: 2 }),
        expect.objectContaining({ recipeIngredientId: "b", quantityContribution: 3 }),
      ],
    });
  });

  it("merges latin unit case only and keeps every conservative split boundary", () => {
    const result = mergeShoppingContributions(
      [
        contribution({ recipeIngredientId: "a", ingredientId: "salt", nameSnapshot: "盐", quantity: 2, unit: "g", normalizedUnit: "g", aisle: "调料" }),
        contribution({ recipeIngredientId: "b", ingredientId: "salt", nameSnapshot: "盐", quantity: 3, unit: "G", normalizedUnit: "g", aisle: "调料" }),
        contribution({ recipeIngredientId: "c", ingredientId: "salt", nameSnapshot: "盐", quantity: 4, unit: "克", normalizedUnit: "克", aisle: "调料" }),
        contribution({ recipeIngredientId: "d", ingredientId: "salt", nameSnapshot: "盐", quantity: 5, unit: "千克", normalizedUnit: "千克", aisle: "调料" }),
        contribution({ recipeIngredientId: "e", ingredientId: "salt", nameSnapshot: "盐", quantity: null, quantityText: "少许", unit: "克", normalizedUnit: "克", aisle: "调料" }),
        contribution({ recipeIngredientId: "f", ingredientId: "salt", nameSnapshot: "盐", quantity: null, quantityText: null, unit: "克", normalizedUnit: "克", aisle: "调料" }),
        contribution({ recipeIngredientId: "g", ingredientId: "pepper", nameSnapshot: "胡椒", quantity: 1, unit: "g", normalizedUnit: "g", aisle: "调料" }),
        contribution({ recipeIngredientId: "h", ingredientId: "salt", nameSnapshot: "盐", quantity: 1, unit: "g", normalizedUnit: "g", aisle: "调料", isManual: true }),
      ],
      new Set(),
    );

    expect(result).toHaveLength(7);
    expect(result[0]).toMatchObject({ ingredientId: "pepper", quantity: 1, unit: "g" });
    expect(result[1]).toMatchObject({
      ingredientId: "salt",
      quantity: 5,
      unit: "g",
      sources: [
        expect.objectContaining({ recipeIngredientId: "a" }),
        expect.objectContaining({ recipeIngredientId: "b" }),
      ],
    });
    expect(result.slice(2).map((item) => item.sources[0]?.recipeIngredientId)).toEqual([
      "c",
      "d",
      "e",
      "f",
      "h",
    ]);
  });

  it("supports exclusions and does not mutate recipe inputs", () => {
    const recipes: ShoppingGenerationRecipe[] = [
      recipe({
        id: "recipe-a",
        title: "番茄炒蛋",
        ingredients: [
          {
            recipeIngredientId: "ingredient-a",
            ingredientId: "tomato",
            name: "番茄",
            quantity: 2,
            quantityText: null,
            unit: "个",
            aisle: "蔬菜",
            sortOrder: 0,
          },
          {
            recipeIngredientId: "ingredient-b",
            ingredientId: "egg",
            name: "鸡蛋",
            quantity: 4,
            quantityText: null,
            unit: "个",
            aisle: "蛋奶",
            sortOrder: 1,
          },
        ],
      }),
    ];
    const snapshot = structuredClone(recipes);

    const contributions = buildShoppingContributions(recipes, [{ recipeId: "recipe-a", selectedServings: 2 }]);
    const merged = mergeShoppingContributions(contributions, new Set(["ingredient-b"]));

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ ingredientId: "tomato", aisle: "蔬菜" });
    expect(recipes).toEqual(snapshot);
    expect(contributions[1].recipeIngredientId).toBe("ingredient-b");
  });
});
