import { z } from "zod";

const uuidSchema = z.string().uuid();

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const nullableNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === "" || (typeof value === "number" && Number.isNaN(value)) ? null : value),
    schema.nullable(),
  );

const nullableUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  uuidSchema.nullable(),
);

export const recipeIngredientGroupSchema = z.enum(["main", "seasoning", "other"]);

const ingredientLinkSchema = z.object({
  recipeIngredientId: uuidSchema,
  quantityOverride: nullableNumber(z.number().finite().positive()),
  quantityTextOverride: nullableText(40),
  note: nullableText(120),
});

const ingredientSchema = z.object({
  recipeIngredientId: uuidSchema,
  name: z.string().trim().min(1).max(80),
  quantity: nullableNumber(z.number().finite().positive()),
  quantityText: nullableText(40),
  unit: nullableText(20),
  preparationNote: nullableText(120),
  groupType: recipeIngredientGroupSchema.optional(),
  sortOrder: z.number().int().nonnegative(),
});

const stepSchema = z.object({
  stepId: uuidSchema,
  instruction: z.string().trim().min(1).max(2000),
  imagePath: nullableText(500),
  timerSeconds: nullableNumber(z.number().int().min(1).max(86400)),
  heatLevel: nullableText(60).optional(),
  sortOrder: z.number().int().nonnegative(),
  ingredientLinks: z.array(ingredientLinkSchema),
});

const recipeSaveInputBaseSchema = z.object({
  recipeId: uuidSchema,
  title: z.string().trim().min(1).max(100),
  description: nullableText(500),
  categoryId: nullableUuid,
  tagIds: z.array(uuidSchema),
  coverPath: nullableText(500),
  baseServings: z.number().finite().positive().max(1000),
  prepMinutes: nullableNumber(z.number().int().min(0).max(10080)),
  cookMinutes: nullableNumber(z.number().int().min(0).max(10080)),
  personalNotes: nullableText(4000),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(stepSchema).min(1),
});

export const recipeSaveInputSchema = recipeSaveInputBaseSchema
  .superRefine((value, context) => {
    if (new Set(value.tagIds).size !== value.tagIds.length) {
      context.addIssue({ code: "custom", path: ["tagIds"], message: "标签不能重复" });
    }

    const ingredientIds = new Set<string>();
    value.ingredients.forEach((ingredient, index) => {
      if (ingredientIds.has(ingredient.recipeIngredientId)) {
        context.addIssue({
          code: "custom",
          path: ["ingredients", index, "recipeIngredientId"],
          message: "食材不能重复",
        });
      }
      ingredientIds.add(ingredient.recipeIngredientId);
    });

    const stepIds = new Set<string>();
    value.steps.forEach((step, index) => {
      if (stepIds.has(step.stepId)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "stepId"],
          message: "步骤不能重复",
        });
      }
      stepIds.add(step.stepId);

      const linkIds = new Set<string>();
      step.ingredientLinks.forEach((link, linkIndex) => {
        if (!ingredientIds.has(link.recipeIngredientId)) {
          context.addIssue({
            code: "custom",
            path: ["steps", index, "ingredientLinks", linkIndex, "recipeIngredientId"],
            message: "步骤食材必须来自当前菜谱",
          });
        }
        if (linkIds.has(link.recipeIngredientId)) {
          context.addIssue({
            code: "custom",
            path: ["steps", index, "ingredientLinks", linkIndex, "recipeIngredientId"],
            message: "步骤中的食材不能重复",
          });
        }
        linkIds.add(link.recipeIngredientId);
      });
    });
  })
  .transform((value) => ({
    ...value,
    ingredients: value.ingredients.map((ingredient, sortOrder) => ({
      ...ingredient,
      sortOrder,
    })),
    steps: value.steps.map((step, sortOrder) => ({
      ...step,
      sortOrder,
    })),
  }));

export type RecipeSaveInput = z.output<typeof recipeSaveInputSchema>;

export const recipeListQuerySchema = z.object({
  query: z.string().trim().max(100).default(""),
  categoryId: uuidSchema.nullable().default(null),
  tagId: uuidSchema.nullable().default(null),
  favoriteOnly: z.boolean().default(false),
  deletedOnly: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
});
