"use client";

import { useEffect } from "react";

import type { RecipeDetail } from "@/features/recipes/types";

import { rememberOfflineProfile, putRecipeSnapshot } from "../database";
import { cacheRecipeMediaFromUrl } from "../media-cache";
import { toOfflineRecipeSnapshot } from "../recipe-snapshot";

type OfflineRecipeCacheProps = {
  userId: string;
  recipe: RecipeDetail;
  onCacheError?: () => void;
};

export function OfflineRecipeCache({ userId, recipe, onCacheError }: OfflineRecipeCacheProps) {
  useEffect(() => {
    const now = new Date().toISOString();
    if (recipe.coverUrl && recipe.coverPath) {
      void cacheRecipeMediaFromUrl({
        userId,
        recipeId: recipe.id,
        mediaId: "cover",
        sourceKey: recipe.coverPath,
        url: recipe.coverUrl,
      }).catch(() => undefined);
    }
    for (const step of recipe.steps) {
      if (!step.imageUrl || !step.imagePath) continue;
      void cacheRecipeMediaFromUrl({
        userId,
        recipeId: recipe.id,
        mediaId: `step:${step.id}`,
        sourceKey: step.imagePath,
        url: step.imageUrl,
      }).catch(() => undefined);
    }
    void rememberOfflineProfile(userId, now)
      .then(() => putRecipeSnapshot(toOfflineRecipeSnapshot(userId, recipe, now)))
      .catch(() => onCacheError?.());
  }, [userId, recipe, onCacheError]);

  return null;
}
