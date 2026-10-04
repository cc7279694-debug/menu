import { z } from "zod";
import {
  localImagePath,
  type RecipeDetails,
  type RecipeDetailsInput,
} from "./recipe-model";
import { entityIdSchema, utcTimeSchema } from "./record-validation";
export const cookingEvaluationSchema = z.enum([
  "tasty",
  "okay",
  "adjust_next_time",
]);
export const cookingRecordExtrasSchema = z.strictObject({
  finishedPhotoPath: localImagePath.nullable(),
  evaluation: cookingEvaluationSchema.nullable(),
  note: z.string().max(2000).nullable(),
});
export const cookingRecordSchema = cookingRecordExtrasSchema.extend({
  id: entityIdSchema,
  recipeId: entityIdSchema,
  cookedAt: utcTimeSchema,
});
export const cookingCursorSchema = z.strictObject({
  cookedAt: utcTimeSchema,
  id: entityIdSchema,
});
export const changeCursorSchema = z.strictObject({
  changedAt: utcTimeSchema,
  id: entityIdSchema,
});
export type CookingEvaluation = z.infer<typeof cookingEvaluationSchema>;
export type CookingRecordExtras = z.infer<typeof cookingRecordExtrasSchema>;
export type CookingRecord = z.infer<typeof cookingRecordSchema>;
export type CookingCursor = z.infer<typeof cookingCursorSchema>;
export type ChangeCursor = z.infer<typeof changeCursorSchema>;
export type CookingSummary = { count: number; lastCookedAt: string | null };
export type RecipeChange = {
  id: string;
  recipeId: string;
  changedAt: string;
  before: RecipeDetails;
  after: RecipeDetailsInput;
};
export type LibraryCleanupResult = { cleanupWarning: string | null };
export function historyLimit(limit = 20) {
  return Math.min(
    100,
    Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 20),
  );
}
