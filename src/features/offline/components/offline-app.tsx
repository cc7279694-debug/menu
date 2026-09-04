"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { CookingScreen } from "@/features/cooking/components/cooking-screen";
import {
  getLastOfflineProfile,
  getRecipeSnapshot,
  getShoppingSnapshot,
  listRecipeSnapshots,
} from "@/features/offline/database";
import { OfflineRecipeDetail } from "@/features/offline/components/offline-recipe-detail";
import { OfflineRecipeList } from "@/features/offline/components/offline-recipe-list";
import { OfflineShoppingList } from "@/features/offline/components/offline-shopping-list";
import type { OfflineProfile, OfflineRecipeSnapshot, OfflineShoppingSnapshot } from "@/features/offline/types";

export type OfflineTarget =
  | { kind: "recipe-list" }
  | { kind: "recipe-detail"; recipeId: string }
  | { kind: "cooking"; recipeId: string; servings: number | null; restart: boolean }
  | { kind: "shopping" }
  | { kind: "unsupported" };

export function parseOfflineTarget(rawPath: string): OfflineTarget {
  try {
    const url = new URL(rawPath || "/recipes", window.location.origin);
    if (url.origin !== window.location.origin) return { kind: "unsupported" };
    if (url.pathname === "/recipes") return { kind: "recipe-list" };
    if (url.pathname === "/shopping") return { kind: "shopping" };
    const recipeMatch = url.pathname.match(/^\/recipes\/([^/]+)(\/cook)?$/);
    if (!recipeMatch || !recipeMatch[1]) return { kind: "unsupported" };
    const recipeId = decodeURIComponent(recipeMatch[1]);
    if (recipeMatch[2] !== "/cook") return { kind: "recipe-detail", recipeId };
    const servingsValue = url.searchParams.get("servings");
    const servings = servingsValue && Number.isFinite(Number(servingsValue)) ? Number(servingsValue) : null;
    return { kind: "cooking", recipeId, servings, restart: url.searchParams.get("restart") === "1" };
  } catch {
    return { kind: "unsupported" };
  }
}

function targetHref(target: OfflineTarget) {
  if (target.kind === "recipe-list") return "/recipes";
  if (target.kind === "shopping") return "/shopping";
  if (target.kind === "recipe-detail") return `/recipes/${encodeURIComponent(target.recipeId)}`;
  if (target.kind === "cooking") {
    const query = target.servings === null ? "" : `?servings=${encodeURIComponent(String(target.servings))}`;
    return `/recipes/${encodeURIComponent(target.recipeId)}/cook${query}`;
  }
  return "/recipes";
}

type OfflineData = { profile: OfflineProfile; recipes: OfflineRecipeSnapshot[]; recipe: OfflineRecipeSnapshot | null; shopping: OfflineShoppingSnapshot | null };

function sanitizeOfflineRecipe(recipe: OfflineRecipeSnapshot["recipe"]): OfflineRecipeSnapshot["recipe"] {
  return {
    ...recipe,
    coverUrl: null,
    coverPath: null,
    steps: recipe.steps.map((step) => ({
      ...step,
      imageUrl: null,
      imagePath: null,
      ingredientLinks: step.ingredientLinks.map((link) => ({ ...link })),
    })),
  };
}

export function OfflineApp() {
  const searchParams = useSearchParams();
  const rawPath = searchParams.get("path") ?? "/recipes";
  const [target, setTarget] = useState<OfflineTarget | null>(null);
  const [data, setData] = useState<OfflineData | null>(null);
  const [error, setError] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const nextTarget = parseOfflineTarget(rawPath);
    setTarget(nextTarget);
    setData(null);
    setError(false);
    setEmpty(false);
    if (nextTarget.kind === "unsupported") return;

    let cancelled = false;
    void getLastOfflineProfile()
      .then(async (profile) => {
        if (!profile) {
          if (!cancelled) setEmpty(true);
          return null;
        }
        const [recipes, recipe, shopping] = await Promise.all([
          listRecipeSnapshots(profile.userId),
          nextTarget.kind === "recipe-detail" || nextTarget.kind === "cooking" ? getRecipeSnapshot(profile.userId, nextTarget.recipeId) : Promise.resolve(null),
          nextTarget.kind === "shopping" ? getShoppingSnapshot(profile.userId) : Promise.resolve(null),
        ]);
        return { profile, recipes, recipe, shopping };
      })
      .then((nextData) => { if (!cancelled && nextData) setData(nextData); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [rawPath]);

  if (!target) return <main className="mx-auto max-w-3xl space-y-4 px-4 py-8"><p className="text-sm text-muted-foreground">正在读取本机离线数据…</p></main>;
  if (target.kind === "unsupported") return <OfflineMessage title="该页面暂不支持离线使用" />;
  if (error) return <OfflineMessage href={targetHref(target)} title="此设备暂时无法使用离线数据" />;
  if (empty) return <OfflineMessage href={targetHref(target)} title="没有可用的离线数据" />;
  if (!data) return <main className="mx-auto max-w-3xl space-y-4 px-4 py-8"><p className="text-sm text-muted-foreground">正在读取本机离线数据…</p></main>;
  if (target.kind === "recipe-list") {
    return <OfflineFrame target={target}><OfflineRecipeList snapshots={data.recipes} userId={data.profile.userId} /></OfflineFrame>;
  }
  if (target.kind === "shopping") {
    return <OfflineFrame target={target}>{data.shopping ? <OfflineShoppingList snapshot={data.shopping} userId={data.profile.userId} /> : <OfflineMessage href={targetHref(target)} title="没有可用的离线购物清单" />}</OfflineFrame>;
  }
  if (!data.recipe) return <OfflineFrame target={target}><OfflineMessage href={targetHref(target)} title="这道菜还没有保存到本机" /></OfflineFrame>;
  const safeRecipe = sanitizeOfflineRecipe(data.recipe.recipe);
  if (target.kind === "cooking") {
    return <OfflineFrame target={target}><CookingScreen recipe={safeRecipe} requestedServings={target.servings ?? safeRecipe.baseServings} restart={target.restart} /></OfflineFrame>;
  }
  return <OfflineFrame target={target}><OfflineRecipeDetail recipe={safeRecipe} userId={data.profile.userId} /></OfflineFrame>;
}

function OfflineFrame({ target, children }: { target: OfflineTarget; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 border-b pb-4">
        <span className="font-semibold tracking-tight">谱序 RECIPIO</span>
        <a className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm" href={targetHref(target)}>返回在线页面</a>
      </div>
      <div className="mx-auto max-w-5xl py-6">{children}</div>
    </div>
  );
}

function OfflineMessage({ href = "/recipes", title }: { href?: string; title: string }) {
  return <main aria-live="polite" className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center" role="status"><h1 className="text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">恢复网络后可继续使用完整功能。</p><a className="mt-4 inline-flex min-h-11 items-center rounded-lg border px-3 text-sm" href={href}>返回在线页面</a></main>;
}
