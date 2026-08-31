import { describe, expect, it } from "vitest";

import {
  recipeSaveInputSchema,
  type RecipeSaveInput,
} from "@/features/recipes/schemas";

const ingredientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const stepId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const preparationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

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
    preparations: [],
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

  it("accepts precise, text-only, and combined preparation times", () => {
    const result = recipeSaveInputSchema.parse(
      validInput({
        preparations: [
          {
            preparationId,
            recipeIngredientId: ingredientId,
            instruction: "腌制牛肉",
            leadTimeMinutes: 30,
            timingText: null,
            sortOrder: 4,
          },
          {
            preparationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            recipeIngredientId: null,
            instruction: "提前一晚解冻",
            leadTimeMinutes: null,
            timingText: "提前一晚",
            sortOrder: 5,
          },
          {
            preparationId: "99999999-9999-4999-8999-999999999999",
            recipeIngredientId: ingredientId,
            instruction: "静置回温",
            leadTimeMinutes: 15,
            timingText: "约一刻钟",
            sortOrder: 6,
          },
        ],
      }),
    );

    expect(result.preparations.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
  });

  it("rejects invalid preparation times, empty instructions, duplicate IDs, and unknown links", () => {
    expect(() =>
      recipeSaveInputSchema.parse({
        ...validInput(),
        preparations: [{ preparationId, recipeIngredientId: ingredientId, instruction: "", leadTimeMinutes: 30, timingText: null, sortOrder: 0 }],
      }),
    ).toThrow();
    expect(() =>
      recipeSaveInputSchema.parse({
        ...validInput(),
        preparations: [{ preparationId, recipeIngredientId: ingredientId, instruction: "浸泡", leadTimeMinutes: null, timingText: null, sortOrder: 0 }],
      }),
    ).toThrow();
    expect(() =>
      recipeSaveInputSchema.parse({
        ...validInput(),
        preparations: [
          { preparationId, recipeIngredientId: ingredientId, instruction: "浸泡", leadTimeMinutes: 0, timingText: null, sortOrder: 0 },
        ],
      }),
    ).toThrow();
    expect(() =>
      recipeSaveInputSchema.parse({
        ...validInput(),
        preparations: [
          { preparationId, recipeIngredientId: ingredientId, instruction: "浸泡", leadTimeMinutes: 30, timingText: null, sortOrder: 0 },
          { preparationId, recipeIngredientId: null, instruction: "重复", leadTimeMinutes: 60, timingText: null, sortOrder: 1 },
        ],
      }),
    ).toThrow();
    expect(() =>
      recipeSaveInputSchema.parse({
        ...validInput(),
        preparations: [{ preparationId, recipeIngredientId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", instruction: "浸泡", leadTimeMinutes: 30, timingText: null, sortOrder: 0 }],
      }),
    ).toThrow();
  });

  it("rejects empty recipes and invalid limits", () => {
    expect(() => recipeSaveInputSchema.parse(validInput({ ingredients: [] }))).toThrow();
    expect(() => recipeSaveInputSchema.parse(validInput({ steps: [] }))).toThrow();
    expect(() => recipeSaveInputSchema.parse(validInput({ baseServings: 0 }))).toThrow();
    expect(() => recipeSaveInputSchema.parse(validInput({ title: "" }))).toThrow();
  });
});
