import { z } from "zod";

const modelNullableText = (max: number) => z.string().trim().max(max).nullable();
const modelNullableInteger = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

export const ingredientGroupSchema = z.enum(["main", "seasoning", "other"]);

export const recipeImportDraftModelSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: modelNullableText(500),
  baseServings: z.number().positive().max(1000),
  prepMinutes: modelNullableInteger(0, 10080),
  cookMinutes: modelNullableInteger(0, 10080),
  personalNotes: modelNullableText(4000),
  suggestedCategoryName: modelNullableText(40),
  suggestedTagNames: z.array(z.string().trim().min(1).max(40)).max(12),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    groupType: ingredientGroupSchema,
    quantity: z.number().positive().nullable(),
    quantityText: modelNullableText(40),
    unit: modelNullableText(20),
    preparationNote: modelNullableText(120),
  })).min(1).max(100),
  steps: z.array(z.object({
    instruction: z.string().trim().min(1).max(2000),
    heatLevel: modelNullableText(60),
    timerSeconds: z.number().int().min(1).max(86400).nullable(),
    ingredientNames: z.array(z.string().trim().min(1).max(80)).max(30),
  })).min(1).max(100),
  preparations: z.array(z.object({
    ingredientName: modelNullableText(80),
    instruction: z.string().trim().min(1).max(500),
    leadTimeMinutes: modelNullableInteger(1, 43200),
    timingText: modelNullableText(60),
  }).refine((item) => item.leadTimeMinutes !== null || item.timingText !== null, {
    message: "提前准备必须包含精确时间或文字时间",
  })).max(30).default([]),
  warnings: z.array(z.string().trim().min(1).max(200)).max(20),
});

export const recipeImportDraftSchema = recipeImportDraftModelSchema;
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
