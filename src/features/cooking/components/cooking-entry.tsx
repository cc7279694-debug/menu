"use client";

import Link from "next/link";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearCookingSession, loadCookingSession } from "@/features/cooking/session-storage";
import { MAX_SERVINGS, MIN_SERVINGS, isValidTargetServings } from "@/features/cooking/servings";
import type { RecipeDetail } from "@/features/recipes/types";

type EntryState = {
  hasSavedSession: boolean;
  servings: string;
};

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getInitialState(recipe: RecipeDetail): EntryState {
  const storage = getStorage();
  const savedSession = storage ? loadCookingSession(storage, recipe) : null;
  return {
    hasSavedSession: savedSession !== null,
    servings: String(savedSession?.targetServings ?? recipe.baseServings),
  };
}

export function CookingEntry({ recipe }: { recipe: RecipeDetail }) {
  const [initial] = useState(() => getInitialState(recipe));
  const [servings, setServings] = useState(initial.servings);
  const validServings = isValidTargetServings(servings);
  const query = `servings=${encodeURIComponent(servings.trim())}`;
  const href = `/recipes/${recipe.id}/cook?${query}`;

  const restart = () => {
    const storage = getStorage();
    if (storage) clearCookingSession(storage, recipe.id);
  };

  return (
    <section aria-labelledby="cooking-entry-heading" className="space-y-3 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold" id="cooking-entry-heading">开始烹饪</h2>
        <p className="mt-1 text-sm text-muted-foreground">选择份数后进入分步厨房模式。</p>
      </div>
      <div className="max-w-48 space-y-1">
        <Label htmlFor={`cooking-servings-${recipe.id}`}>目标份数</Label>
        <Input
          aria-describedby={validServings ? undefined : `cooking-servings-error-${recipe.id}`}
          aria-invalid={!validServings}
          id={`cooking-servings-${recipe.id}`}
          max={MAX_SERVINGS}
          min={MIN_SERVINGS}
          onChange={(event) => setServings(event.target.value)}
          step="0.01"
          type="number"
          value={servings}
        />
        {!validServings && <p className="text-sm text-destructive" id={`cooking-servings-error-${recipe.id}`}>请输入 0.25 到 1000 之间且最多两位小数的份数。</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {validServings ? (
          <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80" href={href}>
            {initial.hasSavedSession ? "继续上次烹饪" : "开始烹饪"}
          </Link>
        ) : (
          <button className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground opacity-50" disabled type="button">
            {initial.hasSavedSession ? "继续上次烹饪" : "开始烹饪"}
          </button>
        )}
        {initial.hasSavedSession && validServings && (
          <Link className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium" href={`${href}&restart=1`} onClick={restart}>
            重新开始
          </Link>
        )}
      </div>
    </section>
  );
}
