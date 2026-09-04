"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { restoreRecipeAction } from "@/features/recipes/actions";
import { applyRecipeMutationLocally } from "@/features/offline/recipe-mutations";

export function RestoreButton({ recipeId }: { recipeId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      className="rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        const local = await applyRecipeMutationLocally({ recipeId, kind: "restore" }).catch(() => null);
        if (local) {
          router.refresh();
          return;
        }

        const result = await restoreRecipeAction(recipeId);
        if (result.ok) router.refresh();
      })}
      type="button"
    >
      {isPending ? "恢复中…" : "恢复"}
    </button>
  );
}
