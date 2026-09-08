"use client";

import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import { localRecipeService, type LocalRecipeService } from "@/features/local-data/local-recipe-service";

import { buildOfflineEditInput, buildOfflineTaxonomy } from "../offline-recipe-editor-data";
import type { LocalRecipeMediaRecord } from "../local-db";
import type { OfflineRecipeSnapshot } from "../types";

type OfflineRecipeEditorProps = {
  userId: string;
  mode: "create" | "edit";
  snapshots: OfflineRecipeSnapshot[];
  snapshot?: OfflineRecipeSnapshot | null;
  media: LocalRecipeMediaRecord[];
  recipeService?: LocalRecipeService | null;
};

export function OfflineRecipeEditor({ userId, mode, snapshots, snapshot = null, media, recipeService = localRecipeService }: OfflineRecipeEditorProps) {
  const taxonomy = buildOfflineTaxonomy(snapshots);

  return (
    <RecipeEditor
      availability="offline"
      categories={taxonomy.categories}
      initialValue={snapshot ? buildOfflineEditInput(snapshot, media) : undefined}
      localFirstUserId={userId}
      mode={mode}
      onSaved={(recipeId) => {
        window.location.assign(`/offline/app?path=${encodeURIComponent(`/recipes/${recipeId}`)}`);
      }}
      saveLocalRecipe={recipeService ? async (input) => {
        const record = await recipeService.save(input, taxonomy);
        return { recipeId: record.id };
      } : undefined}
      tags={taxonomy.tags}
      userId={userId}
    />
  );
}
