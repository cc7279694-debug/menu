import { z } from "zod";
import type { RecipeDetailsInput } from "../recipe-model";

export const AI_CONTRACT_VERSION = 1;
export const AI_LIMITS = Object.freeze({ textCodePoints: 30000, imageCount: 6, originalImageBytes: 15 * 1024 * 1024, originalPixels: 32000000, decodedPixels: 4194304, imageEdge: 2048, imageBytes: 1024 * 1024, totalImageBytes: 6 * 1024 * 1024, requestBytes: 10 * 1024 * 1024, responseBytes: 2 * 1024 * 1024, errorBytes: 64 * 1024, connectMillis: 15000, readMillis: 60000, overallMillis: 90000 });
const instruction = z.string().trim().min(1).max(10000);
const minutes = z.number().int().min(1).max(525600).nullable();
const rawRecipe = z.strictObject({
  title: z.string().trim().min(1).max(120), totalMinutes: minutes,
  servings: z.number().min(0.1).max(10000).nullable(),
  caloriesPerServing: z.number().min(0).max(100000).nullable(),
  coverPath: z.null(), notes: z.string().trim().max(20000),
  ingredients: z.array(z.strictObject({ name: instruction, amount: z.string().trim().max(500) })).max(300),
  steps: z.array(z.strictObject({ instruction, imagePath: z.null() })).max(300),
  preparations: z.array(z.strictObject({ instruction, minutes, timingText: z.string().trim().max(500).nullable() })).max(100),
  keyTips: z.array(z.strictObject({ instruction, stepNumber: z.number().int().min(1).nullable() })).max(100),
});
export const aiFieldCheckSchema = z.strictObject({ path: z.string().min(1).max(100), status: z.enum(["explicit", "inferred", "missing"]), label: z.string().max(120), message: z.string().max(240).nullable() });
const rawOutput = z.strictObject({ recipe: rawRecipe, fieldChecks: z.array(aiFieldCheckSchema).max(1600), warnings: z.array(z.string().max(500)).max(20) });
export const aiModelOutputSchema = rawOutput.superRefine(({ recipe }, ctx) => {
  recipe.keyTips.forEach((tip, index) => {
    if (tip.stepNumber !== null && tip.stepNumber > recipe.steps.length) ctx.addIssue({ code: "custom", path: ["recipe", "keyTips", index, "stepNumber"], message: "关键事项关联的步骤不存在" });
  });
});
// Cross-record step references are enforced locally, not claimed as JSON Schema semantics.
export const AI_JSON_SCHEMA = z.toJSONSchema(rawOutput, { target: "draft-7" });
export type AiFieldCheck = z.infer<typeof aiFieldCheckSchema>;
export type AiModelOutput = z.infer<typeof aiModelOutputSchema>;
export type AiSourceContext = { text: string; hasImages: boolean };
export type AiReviewDraft = { recipe: RecipeDetailsInput; review: { fieldChecks: AiFieldCheck[]; requiresConfirmation: boolean }; warnings: string[] };
export function requiresAiReview(draft:AiReviewDraft):boolean{return draft.review.fieldChecks.some(check=>check.status!=="explicit");}
