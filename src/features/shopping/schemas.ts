import { z } from "zod";

import { MAX_SERVINGS, MIN_SERVINGS } from "@/features/ingredients/quantities";

const uuidSchema = z.string().uuid();

function hasPrecision(value: number, places: number) {
  return Number(value.toFixed(places)) === value;
}

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const nullableUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  uuidSchema.nullable(),
);

const nullableQuantity = (places: number) =>
  z.preprocess(
    (value) => (value === "" || (typeof value === "number" && Number.isNaN(value)) ? null : value),
    z
      .number()
      .finite()
      .positive()
      .refine((value) => hasPrecision(value, places), `数量最多保留 ${places} 位小数`)
      .nullable(),
  );

const servingsSchema = z
  .number()
  .finite()
  .min(MIN_SERVINGS, `份数不能小于 ${MIN_SERVINGS}`)
  .max(MAX_SERVINGS, `份数不能大于 ${MAX_SERVINGS}`)
  .refine((value) => hasPrecision(value, 2), "份数最多保留 2 位小数");

export const shoppingRecipeSelectionSchema = z.object({
  recipeId: uuidSchema,
  selectedServings: servingsSchema,
});

export const shoppingGenerationInputSchema = z
  .object({
    selections: z.array(shoppingRecipeSelectionSchema).min(1).max(20),
    excludedRecipeIngredientIds: z.array(uuidSchema).max(500),
  })
  .superRefine((value, context) => {
    if (new Set(value.selections.map((selection) => selection.recipeId)).size !== value.selections.length) {
      context.addIssue({ code: "custom", path: ["selections"], message: "菜谱不能重复" });
    }

    if (
      new Set(value.excludedRecipeIngredientIds).size
      !== value.excludedRecipeIngredientIds.length
    ) {
      context.addIssue({ code: "custom", path: ["excludedRecipeIngredientIds"], message: "排除食材不能重复" });
    }
  });

export const shoppingItemInputSchema = z
  .object({
    shoppingListId: uuidSchema,
    itemId: nullableUuid,
    nameSnapshot: z.string().trim().min(1).max(80),
    quantity: nullableQuantity(3),
    quantityText: nullableText(40),
    unit: nullableText(20),
    aisle: nullableText(40),
  })
  .superRefine((value, context) => {
    if (value.quantity !== null && value.quantityText !== null) {
      context.addIssue({ code: "custom", path: ["quantityText"], message: "数量和文本数量不能同时填写" });
    }
  });

const shoppingListScopedItemSchema = z.object({
  shoppingListId: uuidSchema,
  itemId: uuidSchema,
});

export const shoppingItemCheckedInputSchema = shoppingListScopedItemSchema.extend({
  isChecked: z.boolean(),
});

export const shoppingItemDeleteInputSchema = shoppingListScopedItemSchema;

export const shoppingClearCompletedInputSchema = z.object({
  shoppingListId: uuidSchema,
});

export const shoppingReorderInputSchema = z
  .object({
    shoppingListId: uuidSchema,
    itemIds: z.array(uuidSchema).min(1),
  })
  .superRefine((value, context) => {
    if (new Set(value.itemIds).size !== value.itemIds.length) {
      context.addIssue({ code: "custom", path: ["itemIds"], message: "排序项不能重复" });
    }
  });

export type ShoppingRecipeSelectionInput = z.output<typeof shoppingRecipeSelectionSchema>;
export type ShoppingGenerationInputSchemaValue = z.output<typeof shoppingGenerationInputSchema>;
export type ShoppingItemInput = z.output<typeof shoppingItemInputSchema>;
export type ShoppingItemCheckedInput = z.output<typeof shoppingItemCheckedInputSchema>;
export type ShoppingItemDeleteInput = z.output<typeof shoppingItemDeleteInputSchema>;
export type ShoppingClearCompletedInput = z.output<typeof shoppingClearCompletedInputSchema>;
export type ShoppingReorderInput = z.output<typeof shoppingReorderInputSchema>;
