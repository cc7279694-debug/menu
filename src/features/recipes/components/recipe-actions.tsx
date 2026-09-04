"use client";

import Link from "next/link";
import { MoveToTrashButton } from "@/features/recipes/components/move-to-trash-button";

export function RecipeActions({ recipeId }: { recipeId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className="rounded-lg border px-3 py-2 text-sm" href={`/recipes/${recipeId}/edit`}>编辑</Link>
      <MoveToTrashButton recipeId={recipeId} />
    </div>
  );
}
