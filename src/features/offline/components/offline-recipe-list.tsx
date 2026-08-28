import Link from "next/link";

import type { OfflineRecipeSnapshot } from "@/features/offline/types";

export function OfflineRecipeList({ snapshots }: { snapshots: OfflineRecipeSnapshot[] }) {
  return (
    <section aria-labelledby="offline-recipe-list-heading" className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold" id="offline-recipe-list-heading">最近离线菜谱</h1>
        <p className="mt-1 text-sm text-muted-foreground">这些菜谱已保存在本机，可在断网时查看和烹饪。</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {snapshots.map((snapshot) => (
          <Link
            className="block min-h-11 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href={`/offline/app?path=${encodeURIComponent(`/recipes/${snapshot.recipeId}`)}`}
            key={snapshot.recipeId}
          >
            <h2 className="font-semibold">{snapshot.recipe.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{snapshot.recipe.description ?? "暂无简介"}</p>
            <p className="mt-3 text-xs text-muted-foreground">{snapshot.recipe.ingredients.length} 项食材 · {snapshot.recipe.steps.length} 个步骤</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
