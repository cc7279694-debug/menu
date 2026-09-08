import type { OfflineRecipeSnapshot } from "@/features/offline/types";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

import type { LocalRecipeRecord, LocalRecipeWriteInput } from "./types";

export const LOCAL_DEVICE_OWNER_ID = "local-device";

export type LocalRecipeTaxonomy = {
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
};

export function recipeSaveInputToLocalWriteInput(
  input: RecipeSaveInput,
  taxonomy: LocalRecipeTaxonomy,
  previous: LocalRecipeRecord | null = null,
): LocalRecipeWriteInput {
  const ingredientNames = new Map(
    input.ingredients.map((ingredient) => [ingredient.recipeIngredientId, ingredient.name]),
  );
  const previousTags = new Map((previous?.tags ?? []).map((tag) => [tag.id, tag.name]));
  const taxonomyTags = new Map(taxonomy.tags.map((tag) => [tag.id, tag.name]));

  return {
    id: input.recipeId,
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    categoryName: input.categoryId === null
      ? null
      : taxonomy.categories.find((category) => category.id === input.categoryId)?.name
        ?? (previous?.categoryId === input.categoryId ? previous.categoryName : null)
        ?? null,
    tagIds: [...input.tagIds],
    tags: input.tagIds.map((id) => ({ id, name: taxonomyTags.get(id) ?? previousTags.get(id) ?? id })),
    isFavorite: previous?.isFavorite ?? false,
    coverPath: input.coverPath,
    baseServings: input.baseServings,
    prepMinutes: input.prepMinutes,
    cookMinutes: input.cookMinutes,
    personalNotes: input.personalNotes,
    nutrition: input.nutrition ? { ...input.nutrition } : null,
    ingredients: input.ingredients.map((ingredient) => ({
      id: ingredient.recipeIngredientId,
      name: ingredient.name,
      quantity: ingredient.quantity,
      quantityText: ingredient.quantityText,
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
      groupType: ingredient.groupType,
      sortOrder: ingredient.sortOrder,
    })),
    steps: input.steps.map((step) => ({
      id: step.stepId,
      instruction: step.instruction,
      imagePath: step.imagePath,
      imageUrl: null,
      timerSeconds: step.timerSeconds,
      heatLevel: step.heatLevel,
      sortOrder: step.sortOrder,
      ingredientLinks: step.ingredientLinks.map((link) => ({ ...link })),
    })),
    preparations: input.preparations.map((preparation) => ({
      id: preparation.preparationId,
      recipeIngredientId: preparation.recipeIngredientId,
      ingredientName: preparation.recipeIngredientId
        ? ingredientNames.get(preparation.recipeIngredientId) ?? null
        : null,
      instruction: preparation.instruction,
      leadTimeMinutes: preparation.leadTimeMinutes,
      timingText: preparation.timingText,
      sortOrder: preparation.sortOrder,
    })),
    source: previous?.source ? { ...previous.source } : null,
  };
}

export function localRecipeRecordToOfflineSnapshot(record: LocalRecipeRecord): OfflineRecipeSnapshot {
  const leadTimes = record.preparations
    .map((preparation) => preparation.leadTimeMinutes)
    .filter((minutes): minutes is number => minutes !== null);

  return {
    userId: LOCAL_DEVICE_OWNER_ID,
    recipeId: record.id,
    cachedAt: record.updatedAt,
    lastOpenedAt: record.updatedAt,
    dataVersion: 3,
    deleted: record.deletedAt !== null,
    recipe: {
      id: record.id,
      title: record.title,
      description: record.description,
      coverUrl: null,
      coverPath: null,
      baseServings: record.baseServings,
      prepMinutes: record.prepMinutes,
      cookMinutes: record.cookMinutes,
      isFavorite: record.isFavorite ?? false,
      category: record.categoryId
        ? { id: record.categoryId, name: record.categoryName ?? record.categoryId }
        : null,
      tags: (record.tags ?? record.tagIds.map((id) => ({ id, name: id }))).map((tag) => ({ ...tag })),
      preparationCount: record.preparations.length,
      maxLeadTimeMinutes: leadTimes.length > 0 ? Math.max(...leadTimes) : null,
      nutrition: record.nutrition ? { ...record.nutrition } : null,
      updatedAt: record.updatedAt,
      personalNotes: record.personalNotes,
      ingredients: record.ingredients.map((ingredient) => ({ ...ingredient })),
      steps: record.steps.map((step) => ({
        ...step,
        imagePath: null,
        imageUrl: null,
        ingredientLinks: step.ingredientLinks.map((link) => ({ ...link })),
      })),
      preparations: record.preparations.map((preparation) => ({ ...preparation })),
      source: record.source ? { ...record.source } : null,
    },
  };
}
