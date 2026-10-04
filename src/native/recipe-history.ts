import {
  recipeDetailsSchema,
  type RecipeDetails,
  type RecipeDetailsInput,
} from "./recipe-model";
import { sourceSnapshotSchema } from "./backup/references";
/** Stored/history values are validated without editor trimming or defaults. */
export const storedDetailsSchema =
  sourceSnapshotSchema.shape.changes.element.shape.after;
export function toHistorySnapshot(recipe: RecipeDetails): RecipeDetails {
  return sourceSnapshotSchema.shape.changes.element.shape.before.parse({
    id: recipe.id,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    title: recipe.title,
    totalMinutes: recipe.totalMinutes,
    servings: recipe.servings,
    caloriesPerServing: recipe.caloriesPerServing,
    coverPath: recipe.coverPath,
    notes: recipe.notes,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    preparations: recipe.preparations,
    keyTips: recipe.keyTips,
  });
}
export function sameEditableDetails(
  before: RecipeDetailsInput,
  after: RecipeDetailsInput,
): boolean {
  return (
    JSON.stringify(recipeDetailsSchema.parse(before)) ===
    JSON.stringify(recipeDetailsSchema.parse(after))
  );
}
