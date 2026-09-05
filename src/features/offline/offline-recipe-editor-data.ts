import type { RecipeSaveInput } from "@/features/recipes/schemas";
import { recipeDetailToSaveInput } from "@/features/recipes/editor-value";

import type { LocalRecipeMediaRecord } from "./local-db";
import type { OfflineRecipeSnapshot } from "./types";

export type OfflineTaxonomyOption = { id: string; name: string };

export function buildOfflineTaxonomy(snapshots: OfflineRecipeSnapshot[]): {
  categories: OfflineTaxonomyOption[];
  tags: OfflineTaxonomyOption[];
} {
  const categories = new Map<string, OfflineTaxonomyOption>();
  const tags = new Map<string, OfflineTaxonomyOption>();
  for (const snapshot of snapshots) {
    if (snapshot.recipe.category) categories.set(snapshot.recipe.category.id, { ...snapshot.recipe.category });
    for (const tag of snapshot.recipe.tags) tags.set(tag.id, { ...tag });
  }
  const byName = (a: OfflineTaxonomyOption, b: OfflineTaxonomyOption) => a.name.localeCompare(b.name, "zh-CN");
  return {
    categories: [...categories.values()].sort(byName),
    tags: [...tags.values()].sort(byName),
  };
}

export function buildOfflineEditInput(
  snapshot: OfflineRecipeSnapshot,
  media: LocalRecipeMediaRecord[],
): RecipeSaveInput {
  const input = recipeDetailToSaveInput(snapshot.recipe);
  const paths = new Map(media.map((record) => [record.mediaId, record.sourceKey]));
  return {
    ...input,
    coverPath: paths.get("cover") ?? input.coverPath,
    steps: input.steps.map((step) => ({
      ...step,
      imagePath: paths.get(`step:${step.stepId}`) ?? step.imagePath,
    })),
  };
}
