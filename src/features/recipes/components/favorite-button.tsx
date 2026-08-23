"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setRecipeFavoriteAction } from "@/features/recipes/actions";

type FavoriteButtonProps = { recipeId: string; initialFavorite: boolean };

export function FavoriteButton({ recipeId, initialFavorite }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      const result = await setRecipeFavoriteAction(recipeId, next);
      if (!result.ok) setFavorite(!next);
      else router.refresh();
    });
  };

  return (
    <button
      aria-label={favorite ? "取消收藏" : "收藏"}
      aria-pressed={favorite}
      className="rounded-full border px-3 py-1 text-sm transition hover:bg-accent disabled:opacity-60"
      disabled={isPending}
      onClick={toggle}
      type="button"
    >
      {favorite ? "已收藏" : "收藏"}
    </button>
  );
}
