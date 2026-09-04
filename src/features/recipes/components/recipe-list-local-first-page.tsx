"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { InstallAppButton } from "@/features/pwa/components/install-app-button";
import {
  getLastOfflineProfile,
  listRecipeSnapshots,
  listRecipeSummaryPage,
  putRecipeSummaryPage,
} from "@/features/offline/database";
import { toOfflineRecipeSummary } from "@/features/offline/recipe-snapshot";
import { loadRecipeListAction } from "@/features/recipes/actions";
import { parseRecipeListQuery, type RecipeListQuery } from "@/features/recipes/query-params";
import type { RecipeSummary } from "@/features/recipes/types";

import { RecipeGrid } from "./recipe-grid";
import { RecipeListEmpty } from "./recipe-list-empty";
import { RecipePagination } from "./recipe-pagination";
import { RecipeSearchFilters } from "./recipe-search-filters";

type LocalFirstState = {
  items: RecipeSummary[];
  totalCount: number;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  loading: boolean;
  notice: string | null;
};

const initialState: LocalFirstState = {
  items: [],
  totalCount: 0,
  categories: [],
  tags: [],
  loading: true,
  notice: null,
};

function supportsLocalList(query: RecipeListQuery) {
  return query.page === 1 && !query.query && !query.categoryId && !query.tagId && !query.favoriteOnly;
}

export function RecipeListLocalFirstPage({ title, favoriteOnly = false }: { title: string; favoriteOnly?: boolean }) {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const query = useMemo(() => {
    const parsed = parseRecipeListQuery(new URLSearchParams(searchKey));
    return { ...parsed, favoriteOnly: favoriteOnly || parsed.favoriteOnly, deletedOnly: favoriteOnly ? false : parsed.deletedOnly };
  }, [favoriteOnly, searchKey]);
  const [state, setState] = useState<LocalFirstState>(initialState);

  useEffect(() => {
    let cancelled = false;
    const useLocal = supportsLocalList(query);
    setState({ ...initialState });

    const localPromise = useLocal
      ? getLastOfflineProfile()
        .then(async (profile) => {
          if (!profile) return [];
          const summaries = await listRecipeSummaryPage(profile.userId, query.deletedOnly);
          if (summaries.length > 0) return summaries;
          if (query.deletedOnly) return [];
          const snapshots = await listRecipeSnapshots(profile.userId);
          return snapshots.map(toOfflineRecipeSummary);
        })
        .catch(() => [])
      : Promise.resolve([] as RecipeSummary[]);

    localPromise.then((items) => {
      if (cancelled || items.length === 0) return;
      setState((current) => ({ ...current, items, totalCount: items.length, loading: false, notice: "已使用本机缓存，正在同步云端…" }));
    });

    void loadRecipeListAction(query).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        if (useLocal) void putRecipeSummaryPage(result.data.userId, result.data.items, query.deletedOnly).catch(() => undefined);
        setState({ ...result.data, loading: false, notice: null });
        return;
      }
      void localPromise.then((items) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          items,
          totalCount: items.length,
          loading: false,
          notice: items.length ? "云端暂时不可用，当前显示本机缓存。" : result.message,
        }));
      });
    }).catch(() => {
      void localPromise.then((items) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          items,
          totalCount: items.length,
          loading: false,
          notice: items.length ? "云端暂时不可用，当前显示本机缓存。" : "菜谱列表暂时无法加载",
        }));
      });
    });

    return () => { cancelled = true; };
  }, [query]);

  const isFiltered = Boolean(query.query || query.categoryId || query.tagId || query.favoriteOnly);
  const emptyMode = query.deletedOnly ? "trash" : isFiltered ? "filtered" : "all";

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">把做过的菜，整理成下一次能照着做的步骤。</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!favoriteOnly && <InstallAppButton />}
          {!favoriteOnly && <Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes?view=trash">回收站</Link>}
          {!favoriteOnly && <Link className="rounded-lg border px-3 py-2 text-sm" href="/recipes/import">从来源生成</Link>}
          <Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" href="/recipes/new">新建菜谱</Link>
        </div>
      </header>

      <RecipeSearchFilters current={query} categories={state.categories} tags={state.tags} />
      {state.items.length ? <RecipeGrid deleted={query.deletedOnly} recipes={state.items} /> : state.loading ? <p aria-live="polite" className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground" role="status">正在读取菜谱…</p> : <RecipeListEmpty mode={emptyMode} />}
      {state.notice && <p aria-live="polite" className="text-sm text-muted-foreground" role="status">{state.notice}</p>}
      <RecipePagination basePath={favoriteOnly ? "/favorites" : "/recipes"} query={query} totalCount={state.totalCount} />
    </main>
  );
}
