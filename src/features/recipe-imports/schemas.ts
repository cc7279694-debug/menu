import { z } from "zod";

const modelNullableText = (max: number) => z.string().trim().max(max).nullable();
const modelNullableInteger = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

const nutritionDraftSchema = z.object({
  caloriesKcal: z.number().finite().min(0).max(100000).nullable(),
  proteinGrams: z.number().finite().min(0).max(10000).nullable(),
  fatGrams: z.number().finite().min(0).max(10000).nullable(),
  carbsGrams: z.number().finite().min(0).max(10000).nullable(),
  isEstimated: z.boolean().default(true),
});

export const ingredientGroupSchema = z.enum(["main", "seasoning", "other"]);

const ingredientDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  groupType: ingredientGroupSchema,
  quantity: z.number().positive().nullable(),
  quantityText: modelNullableText(40),
  unit: modelNullableText(20),
  preparationNote: modelNullableText(120),
});

const stepDraftSchema = z.object({
  instruction: z.string().trim().min(1).max(2000),
  heatLevel: modelNullableText(60),
  timerSeconds: z.number().int().min(1).max(86400).nullable(),
  ingredientNames: z.array(z.string().trim().min(1).max(80)).max(30),
});

const preparationDraftSchema = z.object({
  ingredientName: modelNullableText(80),
  instruction: z.string().trim().min(1).max(500),
  leadTimeMinutes: modelNullableInteger(1, 43200),
  timingText: modelNullableText(60),
}).refine((item) => item.leadTimeMinutes !== null || item.timingText !== null, {
  message: "提前准备必须包含精确时间或文字时间",
});

export const recipeImportFieldStatusSchema = z.enum(["explicit", "inferred", "missing"]);

export const recipeImportFieldCheckSchema = z.object({
  path: z.string().trim().min(1).max(120),
  status: recipeImportFieldStatusSchema,
  label: z.string().trim().min(1).max(120),
  message: modelNullableText(200),
});

const recipeImportDraftContentSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: modelNullableText(500),
  baseServings: z.number().positive().max(1000),
  prepMinutes: modelNullableInteger(0, 10080),
  cookMinutes: modelNullableInteger(0, 10080),
  personalNotes: modelNullableText(4000),
  suggestedCategoryName: modelNullableText(40),
  suggestedTagNames: z.array(z.string().trim().min(1).max(40)).max(12),
  ingredients: z.array(ingredientDraftSchema).min(1).max(100),
  steps: z.array(stepDraftSchema).min(1).max(100),
  preparations: z.array(preparationDraftSchema).max(30).default([]),
  warnings: z.array(z.string().trim().min(1).max(200)).max(20),
  nutrition: nutritionDraftSchema.nullable().optional(),
});

export const recipeImportDraftModelSchema = recipeImportDraftContentSchema.extend({
  fieldChecks: z.array(recipeImportFieldCheckSchema).max(300).default([]),
}).strict();

export const recipeImportReviewSchema = z.object({
  fieldChecks: z.array(recipeImportFieldCheckSchema).max(300),
  requiresConfirmation: z.boolean(),
  confirmedAt: z.string().datetime({ offset: true }).nullable(),
});

export const recipeImportDraftSchema = recipeImportDraftContentSchema.extend({
  review: recipeImportReviewSchema,
}).strict();
export const recipeImportJsonSchema = z.toJSONSchema(recipeImportDraftModelSchema);

export const recipeAiProviderSchema = z.enum(["auto", "qwen", "gemini"]);
export type RecipeAiProvider = z.infer<typeof recipeAiProviderSchema>;

export const createRecipeImportSchema = z.discriminatedUnion("sourceType", [
  z.object({ sourceType: z.literal("url"), sourceUrl: z.string().url().max(2048), aiProvider: recipeAiProviderSchema.default("auto") }),
  z.object({ sourceType: z.literal("text"), sourceText: z.string().trim().min(40).max(60000), aiProvider: recipeAiProviderSchema.default("auto") }),
  z.object({ sourceType: z.literal("images"), aiProvider: recipeAiProviderSchema.default("auto") }),
]);

export const attachRecipeImportImagesSchema = z.object({
  importId: z.string().uuid(),
  imagePaths: z.array(z.string().min(1).max(500)).min(1).max(6),
});

export const processRecipeImportSchema = z.object({ importId: z.string().uuid() });

export type RecipeImportDraft = z.infer<typeof recipeImportDraftSchema>;
export type RecipeImportModelDraft = z.infer<typeof recipeImportDraftModelSchema>;
export type RecipeImportFieldStatus = z.infer<typeof recipeImportFieldStatusSchema>;
export type RecipeImportFieldCheck = z.infer<typeof recipeImportFieldCheckSchema>;
export type RecipeImportReview = z.infer<typeof recipeImportReviewSchema>;
export type RecipeImportStatus =
  | "queued"
  | "fetching"
  | "extracting"
  | "review"
  | "failed"
  | "saved";

export type RecipeImportJob = {
  id: string;
  sourceType: "url" | "text" | "images";
  aiProvider: RecipeAiProvider;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourcePlatform: string | null;
  imagePaths: string[];
  status: RecipeImportStatus;
  draft: RecipeImportDraft | null;
  warnings: string[];
  errorCode: string | null;
  recipeId: string | null;
  expiresAt: string;
};

export type SourceDocument = {
  platform: string;
  title: string | null;
  author: string | null;
  canonicalUrl: string | null;
  text: string;
  imageUrls: string[];
  videoUrls?: string[];
};

export interface RecipeDraftExtractor {
  extract(input: { document: SourceDocument; imageUrls: string[] }): Promise<RecipeImportDraft>;
}
