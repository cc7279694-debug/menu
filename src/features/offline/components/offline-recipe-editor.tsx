"use client";

import { RecipeEditor } from "@/features/recipes/components/recipe-editor";

import { buildOfflineEditInput, buildOfflineTaxonomy } from "../offline-recipe-editor-data";
import type { LocalRecipeMediaRecord } from "../local-db";
import type { OfflineRecipeSnapshot } from "../types";

type OfflineRecipeEditorProps = {
  userId: string;
  mode: "create" | "edit";
  snapshots: OfflineRecipeSnapshot[];
  snapshot?: OfflineRecipeSnapshot | null;
  media: LocalRecipeMediaRecord[];
};

export function OfflineRecipeEditor({ userId, mode, snapshots, snapshot = null, media }: OfflineRecipeEditorProps) {
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
      tags={taxonomy.tags}
      userId={userId}
    />
  );
}
