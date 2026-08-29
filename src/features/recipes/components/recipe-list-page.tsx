import Link from "next/link";

import { RecipeGrid } from "@/features/recipes/components/recipe-grid";
import { RecipeListEmpty } from "@/features/recipes/components/recipe-list-empty";
import { RecipePagination } from "@/features/recipes/components/recipe-pagination";
import { RecipeSearchFilters } from "@/features/recipes/components/recipe-search-filters";
import { parseRecipeListQuery, type RecipeListQuery } from "@/features/recipes/query-params";
import { listRecipePageData } from "@/features/recipes/queries";

type SearchParams = Record<string, string | string[] | undefined>;

function toSearchParams(input: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  return params;
}

export async function RecipeListPage({ searchParams, favoriteOnly = false, title }: { searchParams: Promise<SearchParams>; favoriteOnly?: boolean; title: string }) {
  const parsed = parseRecipeListQuery(toSearchParams(await searchParams));
  const query: RecipeListQuery = { ...parsed, favoriteOnly: favoriteOnly || parsed.favoriteOnly, deletedOnly: favoriteOnly ? false : parsed.deletedOnly };
  const { items, totalCount, categories, tags } = await listRecipePageData(query);
  const isFiltered = Boolean(query.query || query.categoryId || query.tagId || query.favoriteOnly);
  const emptyMode = query.deletedOnly ? "trash" : isFiltered ? "filtered" : "all";

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">把做过的菜，整理成下一次能照着做的步骤。</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex gap-2">
          {!favoriteOnly && <Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes?view=trash">回收站</Link>}
          {!favoriteOnly && <Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes/import">从来源生成</Link>}
          <Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" href="/recipes/new">新建菜谱</Link>
        </div>
      </header>
      <RecipeSearchFilters current={query} categories={categories} tags={tags} />
      {items.length ? <RecipeGrid deleted={query.deletedOnly} recipes={items} /> : <RecipeListEmpty mode={emptyMode} />}
      <RecipePagination basePath={favoriteOnly ? "/favorites" : "/recipes"} query={query} totalCount={totalCount} />
    </main>
  );
}
