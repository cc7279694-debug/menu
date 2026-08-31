import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/features/recipes/components/favorite-button";
import { RestoreButton } from "@/features/recipes/components/restore-button";
import type { RecipeSummary } from "@/features/recipes/types";
import { formatPreparationLeadTime } from "@/features/recipes/preparation-time";

export function RecipeCard({ recipe, deleted = false }: { recipe: RecipeSummary; deleted?: boolean }) {
  const content = (
    <>
      {recipe.coverUrl ? (
        <img alt={`${recipe.title}封面`} className="aspect-[4/3] w-full object-cover" decoding="async" height={600} loading="lazy" src={recipe.coverUrl} width={800} />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">暂无封面</div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3"><h2 className="line-clamp-2 font-semibold">{recipe.title}</h2>{recipe.category && <Badge variant="secondary">{recipe.category.name}</Badge>}</div>
        {recipe.description && <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
        <p className="text-sm text-muted-foreground">{`${recipe.baseServings} 人份 · ${formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}`}</p>
        {recipe.preparationCount > 0 && <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{recipe.maxLeadTimeMinutes ? `${formatPreparationLeadTime(recipe.maxLeadTimeMinutes, null).replace("提前 ", "需提前 ")}准备` : "有提前准备事项"}</p>}
        <div className="flex flex-wrap gap-1">{recipe.tags.map((tag) => <Badge key={tag.id} variant="outline">{tag.name}</Badge>)}</div>
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-sm">
      {deleted ? <div>{content}</div> : <Link className="block" href={`/recipes/${recipe.id}`}>{content}</Link>}
      <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
        {deleted ? <RestoreButton recipeId={recipe.id} /> : <FavoriteButton initialFavorite={recipe.isFavorite} recipeId={recipe.id} />}
        {!deleted && <Link className="text-sm text-muted-foreground underline" href={`/recipes/${recipe.id}/edit`}>编辑</Link>}
      </div>
    </article>
  );
}

function formatMinutes(prep: number | null, cook: number | null) {
  const total = (prep ?? 0) + (cook ?? 0);
  return total > 0 ? `${total} 分钟` : "时间未设置";
}
