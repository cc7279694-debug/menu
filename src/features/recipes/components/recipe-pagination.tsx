import Link from "next/link";

import type { RecipeListQuery } from "@/features/recipes/query-params";

const PAGE_SIZE = 24;

function buildPageHref(basePath: string, query: RecipeListQuery, page: number) {
  const params = new URLSearchParams();
  if (query.query) params.set("q", query.query);
  if (query.categoryId) params.set("category", query.categoryId);
  if (query.tagId) params.set("tag", query.tagId);
  if (query.favoriteOnly) params.set("favorite", "1");
  if (query.deletedOnly) params.set("view", "trash");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `${basePath}${search ? `?${search}` : ""}`;
}

export function RecipePagination({ basePath = "/recipes", query, totalCount }: { basePath?: "/recipes" | "/favorites"; query: RecipeListQuery; totalCount: number }) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="菜谱分页" className="flex items-center justify-center gap-3 pt-2">
      {query.page > 1 && <Link className="rounded-lg border px-3 py-2 text-sm" href={buildPageHref(basePath, query, query.page - 1)}>上一页</Link>}
      <span className="text-sm text-muted-foreground">第 {query.page} / {totalPages} 页</span>
      {query.page < totalPages && <Link className="rounded-lg border px-3 py-2 text-sm" href={buildPageHref(basePath, query, query.page + 1)}>下一页</Link>}
    </nav>
  );
}
