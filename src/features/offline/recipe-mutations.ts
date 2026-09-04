import {
  deleteRecipeSnapshot,
  deleteRecipeSummaryCache,
  getLastOfflineProfile,
  getRecipeSnapshot,
  putRecipeSnapshot,
  queueRecipeMutation,
  updateRecipeSummaryCache,
} from "./database";

export type LocalRecipeMutationInput =
  | { recipeId: string; kind: "set-favorite"; favorite: boolean }
  | { recipeId: string; kind: "move-to-trash" | "restore" | "permanently-delete" };

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
