import {
  deleteRecipeSnapshot,
  deleteRecipeDraft,
  deleteRecipeSummaryCache,
  getLastOfflineProfile,
  getRecipeSnapshot,
  putRecipeDraft,
  putRecipeSummaryPage,
  putRecipeSnapshot,
  queueRecipeMutation,
  rememberOfflineProfile,
  updateRecipeSummaryCache,
} from "./database";
import type { OfflineRecipeDetail, OfflineRecipeSnapshot } from "./types";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

export type LocalRecipeMutationInput =
  | { recipeId: string; kind: "set-favorite"; favorite: boolean }
  | { recipeId: string; kind: "move-to-trash" | "restore" | "permanently-delete" };

function snapshotFromSaveInput(
  userId: string,
  input: RecipeSaveInput,
  timestamp: string,
  previous: OfflineRecipeSnapshot | null,
): OfflineRecipeSnapshot {
  const previousRecipe = previous?.recipe;
  const summary = {
    id: input.recipeId,
    title: input.title,
    description: input.description,
    coverUrl: null,
    baseServings: input.baseServings,
    prepMinutes: input.prepMinutes,
    cookMinutes: input.cookMinutes,
    isFavorite: previousRecipe?.isFavorite ?? false,
    category: previousRecipe?.category ?? null,
    tags: previousRecipe?.tags.map((tag) => ({ ...tag })) ?? [],
    preparationCount: input.preparations.length,
    maxLeadTimeMinutes: input.preparations.reduce<number | null>((max, preparation) => (
      preparation.leadTimeMinutes === null ? max : Math.max(max ?? 0, preparation.leadTimeMinutes)
    ), null),
    nutrition: input.nutrition ?? null,
    updatedAt: timestamp,
  };
  const recipe: OfflineRecipeDetail = {
    ...summary,
    personalNotes: input.personalNotes,
    coverPath: null,
    ingredients: input.ingredients.map((ingredient) => ({
      id: ingredient.recipeIngredientId,
      name: ingredient.name,
      quantity: ingredient.quantity,
      quantityText: ingredient.quantityText,
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
      sortOrder: ingredient.sortOrder,
      groupType: ingredient.groupType,
    })),
    steps: input.steps.map((step) => ({
      id: step.stepId,
      instruction: step.instruction,
      imagePath: null,
      imageUrl: null,
      timerSeconds: step.timerSeconds,
      heatLevel: step.heatLevel,
      sortOrder: step.sortOrder,
      ingredientLinks: step.ingredientLinks.map((link) => ({ ...link })),
    })),
    preparations: input.preparations.map((preparation) => ({
      id: preparation.preparationId,
      recipeIngredientId: preparation.recipeIngredientId,
      ingredientName: input.ingredients.find((ingredient) => ingredient.recipeIngredientId === preparation.recipeIngredientId)?.name ?? null,
      instruction: preparation.instruction,
      leadTimeMinutes: preparation.leadTimeMinutes,
      timingText: preparation.timingText,
      sortOrder: preparation.sortOrder,
    })),
  };
  return {
    userId,
    recipeId: input.recipeId,
    cachedAt: timestamp,
    lastOpenedAt: timestamp,
    dataVersion: 3,
    deleted: false,
    recipe,
  };
}

export async function saveRecipeLocally({ userId, input, draftId = input.recipeId }: { userId: string; input: RecipeSaveInput; draftId?: string }): Promise<{ recipeId: string }> {
  const timestamp = new Date().toISOString();
  await rememberOfflineProfile(userId, timestamp);
  const previous = await getRecipeSnapshot(userId, input.recipeId);
  const snapshot = snapshotFromSaveInput(userId, input, timestamp, previous);
  await putRecipeDraft({ userId, draftId, updatedAt: timestamp, payload: input });
  await putRecipeSnapshot(snapshot);
  await putRecipeSummaryPage(userId, [snapshot.recipe], false);
  await queueRecipeMutation({ userId, recipeId: input.recipeId, kind: "save", input, draftId });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("recipio:sync-requested"));
  return { recipeId: input.recipeId };
}

/** Apply a small recipe status change locally before asking the server to persist it. */
export async function applyRecipeMutationLocally(input: LocalRecipeMutationInput): Promise<{ userId: string } | null> {
  const profile = await getLastOfflineProfile();
  if (!profile) return null;

  if (input.kind === "set-favorite") {
    await updateRecipeSummaryCache(profile.userId, input.recipeId, { isFavorite: input.favorite });
    const snapshot = await getRecipeSnapshot(profile.userId, input.recipeId);
    if (snapshot) {
      await putRecipeSnapshot({
        ...snapshot,
        recipe: { ...snapshot.recipe, isFavorite: input.favorite },
      });
    }
  } else if (input.kind === "move-to-trash") {
    await updateRecipeSummaryCache(profile.userId, input.recipeId, { deleted: true });
    const snapshot = await getRecipeSnapshot(profile.userId, input.recipeId);
    if (snapshot) await putRecipeSnapshot({ ...snapshot, deleted: true });
  } else if (input.kind === "restore") {
    await updateRecipeSummaryCache(profile.userId, input.recipeId, { deleted: false });
    const snapshot = await getRecipeSnapshot(profile.userId, input.recipeId);
    if (snapshot) await putRecipeSnapshot({ ...snapshot, deleted: false });
  } else {
    await deleteRecipeSummaryCache(profile.userId, input.recipeId);
    await deleteRecipeSnapshot(profile.userId, input.recipeId);
    await deleteRecipeDraft(profile.userId, input.recipeId);
  }

  await queueRecipeMutation({
    userId: profile.userId,
    recipeId: input.recipeId,
    kind: input.kind,
    ...(input.kind === "set-favorite" ? { favorite: input.favorite } : {}),
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("recipio:sync-requested"));
  }
  return { userId: profile.userId };
}
