"use client";

import { useEffect } from "react";

import type { RecipeDetail } from "@/features/recipes/types";

import { rememberOfflineProfile, putRecipeSnapshot } from "../database";
import { toOfflineRecipeSnapshot } from "../recipe-snapshot";

type OfflineRecipeCacheProps = {
  userId: string;
  recipe: RecipeDetail;
  onCacheError?: () => void;
};

export function OfflineRecipeCache({ userId, recipe, onCacheError }: OfflineRecipeCacheProps) {
  useEffect(() => {
    const now = new Date().toISOString();
    void rememberOfflineProfile(userId, now)
      .then(() => putRecipeSnapshot(toOfflineRecipeSnapshot(userId, recipe, now)))
      .catch(() => onCacheError?.());
  }, [userId, recipe, onCacheError]);

  return null;
}
