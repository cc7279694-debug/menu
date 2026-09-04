"use client";

import Link from "next/link";
import { FavoriteButton } from "@/features/recipes/components/favorite-button";
import { MoveToTrashButton } from "@/features/recipes/components/move-to-trash-button";

export function RecipeActions({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FavoriteButton initialFavorite={isFavorite} recipeId={recipeId} />
      <Link className="rounded-lg border px-3 py-2 text-sm" href={`/recipes/${recipeId}/edit`}>编辑</Link>
      <MoveToTrashButton recipeId={recipeId} />
    </div>
  );
}
