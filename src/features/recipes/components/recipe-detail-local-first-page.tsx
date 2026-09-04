"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getLastOfflineProfile, getRecipeSnapshot } from "@/features/offline/database";
import { OfflineRecipeCache } from "@/features/offline/components/offline-recipe-cache";
import { OfflineRecipeDetail } from "@/features/offline/components/offline-recipe-detail";
import type { OfflineRecipeDetail as OfflineRecipeDetailValue } from "@/features/offline/types";
import { loadRecipeDetailAction } from "@/features/recipes/actions";
import type { RecipeDetail } from "@/features/recipes/types";
import type { RecipeCookingHistory } from "@/features/cooking-history/types";

import { RecipeDetailView } from "./recipe-detail";

type LocalDetailState = {
  userId: string | null;
  localRecipe: OfflineRecipeDetailValue | null;
  remoteRecipe: RecipeDetail | null;
  cookingHistory: RecipeCookingHistory | null;
  loading: boolean;
  notice: string | null;
};

const emptyState: LocalDetailState = {
  userId: null,
  localRecipe: null,
  remoteRecipe: null,
  cookingHistory: null,
  loading: true,
  notice: null,
};

export function RecipeDetailLocalFirstPage({ recipeId }: { recipeId: string }) {
  const [state, setState] = useState<LocalDetailState>(emptyState);

  useEffect(() => {
    let cancelled = false;
    setState({ ...emptyState });

    const localPromise = getLastOfflineProfile()
      .then(async (profile): Promise<{ userId: string | null; recipe: OfflineRecipeDetailValue | null }> => {
        if (!profile) return { userId: null, recipe: null };
        const snapshot = await getRecipeSnapshot(profile.userId, recipeId);
        return {
          userId: profile.userId,
          recipe: snapshot?.recipe ?? null,
        };
      })
      .catch(() => ({ userId: null, recipe: null }));

    localPromise.then(({ userId, recipe }) => {
      if (cancelled || !recipe) return;
      setState((current) => ({
        ...current,
        userId,
        localRecipe: recipe,
        loading: false,
        notice: "正在后台同步最新内容…",
      }));
    });

    void loadRecipeDetailAction(recipeId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({
          userId: result.data.userId,
          localRecipe: null,
          remoteRecipe: result.data.recipe,
          cookingHistory: result.data.cookingHistory,
          loading: false,
          notice: null,
        });
        return;
      }
      void localPromise.then(({ userId, recipe }) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          userId,
          localRecipe: recipe,
          loading: false,
          notice: recipe ? "云端暂时不可用，当前显示本机缓存。" : result.message,
        }));
      });
    }).catch(() => {
      void localPromise.then(({ userId, recipe }) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          userId,
          localRecipe: recipe,
          loading: false,
          notice: recipe ? "云端暂时不可用，当前显示本机缓存。" : "菜谱暂时无法加载",
        }));
      });
    });

    return () => { cancelled = true; };
  }, [recipeId]);

  if (state.remoteRecipe && state.userId) {
    return (
      <>
        <OfflineRecipeCache recipe={state.remoteRecipe} userId={state.userId} />
        <RecipeDetailView cookingHistory={state.cookingHistory ?? undefined} recipe={state.remoteRecipe} />
      </>
    );
  }

  if (state.localRecipe && state.userId) {
    return (
      <main className="space-y-4">
        {state.notice && <p aria-live="polite" className="text-sm text-muted-foreground" role="status">{state.notice}</p>}
        <OfflineRecipeDetail recipe={state.localRecipe} userId={state.userId} />
      </main>
    );
  }

  if (state.loading) return <main aria-live="polite" className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground" role="status">正在读取菜谱…</main>;

  return (
    <main aria-live="polite" className="space-y-4 rounded-2xl border bg-card p-6" role="status">
      <h1 className="text-xl font-semibold">{state.notice ?? "菜谱暂时无法加载"}</h1>
      <p className="text-sm text-muted-foreground">恢复网络后可重试，或返回菜谱列表。</p>
      <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm" href="/recipes">返回菜谱</Link>
    </main>
  );
}
