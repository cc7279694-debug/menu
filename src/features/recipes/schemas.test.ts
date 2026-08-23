import { describe, expect, it } from "vitest";

import {
  recipeSaveInputSchema,
  type RecipeSaveInput,
} from "@/features/recipes/schemas";

const ingredientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const stepId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function validInput(overrides: Partial<RecipeSaveInput> = {}): RecipeSaveInput {
  return {
    recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: " 番茄炒蛋 ",
    description: " 家常做法 ",
    categoryId: null,
    tagIds: [],
    coverPath: null,
    baseServings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    personalNotes: "",
    ingredients: [
      {
        recipeIngredientId: ingredientId,
        name: " 番茄 ",
        quantity: 2,
        quantityText: "",
        unit: " 个 ",
        preparationNote: "",
        sortOrder: 8,
      },
    ],
    steps: [
      {
        stepId,
        instruction: " 番茄切块。 ",
        imagePath: "",
        timerSeconds: null,
        sortOrder: 5,
        ingredientLinks: [
          {
            recipeIngredientId: ingredientId,
            quantityOverride: null,
            quantityTextOverride: "",
            note: "",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("recipe save schema", () => {
  it("trims optional values and rewrites child sort orders", () => {
    const result = recipeSaveInputSchema.parse(validInput());

    expect(result.title).toBe("番茄炒蛋");
    expect(result.description).toBe("家常做法");
    expect(result.personalNotes).toBeNull();
    expect(result.ingredients[0]).toMatchObject({
      name: "番茄",
      quantityText: null,
      unit: "个",
      preparationNote: null,
      sortOrder: 0,
    });
    expect(result.steps[0]).toMatchObject({
      instruction: "番茄切块。",
      imagePath: null,
      sortOrder: 0,
    });
    expect(result.steps[0].ingredientLinks[0].note).toBeNull();
  });

  it("keeps text quantities such as 少许 without requiring a number", () => {
    const result = recipeSaveInputSchema.parse(
      validInput({
        ingredients: [
          {
            ...validInput().ingredients[0],
            quantity: null,
            quantityText: "少许",
          },
        ],
      }),
    );

    expect(result.ingredients[0]).toMatchObject({ quantity: null, quantityText: "少许" });
  });

  it("rejects duplicate IDs and links to an ingredient outside the payload", () => {
    expect(() =>
      recipeSaveInputSchema.parse(
        validInput({
          ingredients: [validInput().ingredients[0], validInput().ingredients[0]],
        }),
      ),
    ).toThrow();

    expect(() =>
      recipeSaveInputSchema.parse(
        validInput({
          steps: [
            {
              ...validInput().steps[0],
              ingredientLinks: [
                {
                  ...validInput().steps[0].ingredientLinks[0],
                  recipeIngredientId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects empty recipes and invalid limits", () => {
    expect(() => recipeSaveInputSchema.parse(validInput({ ingredients: [] }))).toThrow();
    expect(() => recipeSaveInputSchema.parse(validInput({ steps: [] }))).toThrow();
    expect(() => recipeSaveInputSchema.parse(validInput({ baseServings: 0 }))).toThrow();
    expect(() => recipeSaveInputSchema.parse(validInput({ title: "" }))).toThrow();
  });
});
