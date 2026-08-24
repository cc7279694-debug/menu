import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ShoppingGenerationInputSchemaOutput,
  type ShoppingRecipeSelectionSchemaOutput,
  shoppingGenerationInputSchema,
  shoppingItemInputSchema,
  shoppingReorderInputSchema,
} from "@/features/shopping/schemas";
import type {
  ShoppingGenerationInput,
  ShoppingRecipeSelection,
} from "@/features/shopping/types";

const recipeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherRecipeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ingredientId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const listId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const itemId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe("shopping schemas", () => {
  it("exports schema-derived output types for shared shopping contracts", () => {
    expectTypeOf<ShoppingRecipeSelection>().toEqualTypeOf<ShoppingRecipeSelectionSchemaOutput>();
    expectTypeOf<ShoppingGenerationInput>().toEqualTypeOf<ShoppingGenerationInputSchemaOutput>();
  });

  it("accepts distinct recipe selections and trims item fields", () => {
    const generation = shoppingGenerationInputSchema.parse({
      selections: [{ recipeId, selectedServings: 2.5 }],
      excludedRecipeIngredientIds: [ingredientId],
    });

    const item = shoppingItemInputSchema.parse({
      shoppingListId: listId,
      itemId,
      nameSnapshot: " 番茄 ",
      quantity: 1.25,
      quantityText: "",
      unit: " 个 ",
      aisle: " 蔬菜 ",
    });

    expect(generation).toEqual({
      selections: [{ recipeId, selectedServings: 2.5 }],
      excludedRecipeIngredientIds: [ingredientId],
    });
    expect(item).toMatchObject({
      shoppingListId: listId,
      itemId,
      nameSnapshot: "番茄",
      quantity: 1.25,
      quantityText: null,
      unit: "个",
      aisle: "蔬菜",
    });
  });

  it("rejects duplicate selections, too many exclusions, and invalid serving precision", () => {
    expect(() =>
      shoppingGenerationInputSchema.parse({
        selections: [
          { recipeId, selectedServings: 2 },
          { recipeId, selectedServings: 3 },
        ],
        excludedRecipeIngredientIds: [],
      }),
    ).toThrow();

    expect(() =>
      shoppingGenerationInputSchema.parse({
        selections: [{ recipeId, selectedServings: 2.345 }],
        excludedRecipeIngredientIds: [],
      }),
    ).toThrow();

    expect(() =>
      shoppingGenerationInputSchema.parse({
        selections: [{ recipeId, selectedServings: 2 }],
        excludedRecipeIngredientIds: Array.from({ length: 501 }, (_, index) =>
          `${index.toString().padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`),
      }),
    ).toThrow();
  });

  it("rejects invalid item amount shapes and invalid reorder payloads", () => {
    expect(() =>
      shoppingItemInputSchema.parse({
        shoppingListId: listId,
        itemId: null,
        nameSnapshot: "番茄",
        quantity: 1,
        quantityText: "少许",
        unit: "个",
        aisle: null,
      }),
    ).toThrow();

    expect(() =>
      shoppingItemInputSchema.parse({
        shoppingListId: listId,
        itemId,
        nameSnapshot: "",
        quantity: null,
        quantityText: null,
        unit: null,
        aisle: null,
      }),
    ).toThrow();

    expect(() =>
      shoppingReorderInputSchema.parse({
        shoppingListId: listId,
        itemIds: [itemId, itemId],
      }),
    ).toThrow();

    expect(shoppingReorderInputSchema.parse({
      shoppingListId: listId,
      itemIds: [itemId, otherRecipeId],
    })).toEqual({
      shoppingListId: listId,
      itemIds: [itemId, otherRecipeId],
    });
  });
});
