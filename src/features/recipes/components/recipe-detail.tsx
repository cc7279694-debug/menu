import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CookingEntry } from "@/features/cooking/components/cooking-entry";
import { RecipeActions } from "@/features/recipes/components/recipe-actions";
import type { RecipeDetail as RecipeDetailValue } from "@/features/recipes/types";
import { RecipePreparationList } from "@/features/recipes/components/recipe-preparation-list";

function formatQuantity(quantity: number | null, text: string | null, unit: string | null) {
  const amount = text ?? (quantity === null ? "适量" : String(quantity));
  return `${amount}${unit ? ` ${unit}` : ""}`;
}

function formatDuration(prep: number | null, cook: number | null) {
  const values = [prep ? `准备 ${prep} 分钟` : null, cook ? `烹饪 ${cook} 分钟` : null].filter(Boolean);
  return values.length ? values.join(" · ") : "时间未设置";
}

function formatTimer(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${String(seconds % 60).padStart(2, "0")} 秒`;
}

export function RecipeDetailView({ recipe }: { recipe: RecipeDetailValue }) {
  const ingredients = new Map(recipe.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm text-muted-foreground underline" href="/recipes">返回菜谱</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{recipe.title}</h1>
            {recipe.category && <Badge variant="secondary">{recipe.category.name}</Badge>}
          </div>
          {recipe.description && <p className="mt-2 max-w-2xl text-muted-foreground">{recipe.description}</p>}
          <p className="mt-3 text-sm text-muted-foreground">{recipe.baseServings} 人份 · {formatDuration(recipe.prepMinutes, recipe.cookMinutes)}</p>
          <div className="mt-3 flex flex-wrap gap-1">{recipe.tags.map((tag) => <Badge key={tag.id} variant="outline">{tag.name}</Badge>)}</div>
        </div>
        <div className="space-y-3">
          <RecipeActions isFavorite={recipe.isFavorite} recipeId={recipe.id} />
          <CookingEntry recipe={recipe} />
        </div>
      </div>

      {recipe.coverUrl && <img alt={`${recipe.title}封面`} className="max-h-[28rem] w-full rounded-2xl object-cover" decoding="async" height={800} loading="eager" src={recipe.coverUrl} width={1200} />}

      <RecipePreparationList preparations={recipe.preparations} />

      <section className="grid gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-semibold">食材清单</h2>
          <div className="mt-4 space-y-5">{(["main", "seasoning", "other"] as const).map((group) => { const items = recipe.ingredients.filter((ingredient) => (ingredient.groupType ?? "main") === group); if (!items.length) return null; const label = group === "main" ? "主料" : group === "seasoning" ? "调料" : "其他"; return <div key={group}><h3 className="text-sm font-medium text-muted-foreground">{label}</h3><ul className="mt-2 space-y-3">{items.map((ingredient) => <li className="flex items-baseline justify-between gap-4 border-b pb-2 text-sm last:border-0" key={ingredient.id}><span>{ingredient.name}{ingredient.preparationNote && <span className="text-muted-foreground">（{ingredient.preparationNote}）</span>}</span><span className="shrink-0 text-muted-foreground">{formatQuantity(ingredient.quantity, ingredient.quantityText, ingredient.unit)}</span></li>)}</ul></div>; })}</div>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">步骤</h2>
          {recipe.steps.map((step, index) => (
            <article className="rounded-2xl border bg-card p-5" key={step.id}>
              <div className="flex items-start gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="whitespace-pre-wrap leading-7">{step.instruction}</p>
                  {step.heatLevel && <p className="text-sm text-muted-foreground">火候：{step.heatLevel}</p>}
                  {step.timerSeconds && <p className="text-sm text-muted-foreground">计时 {formatTimer(step.timerSeconds)}</p>}
                  {step.ingredientLinks.length > 0 && <div className="flex flex-wrap gap-2">{step.ingredientLinks.map((link) => { const ingredient = ingredients.get(link.recipeIngredientId); return ingredient ? <Badge key={link.recipeIngredientId} variant="outline">{ingredient.name}{link.note ? ` · ${link.note}` : ""}</Badge> : null; })}</div>}
                  {step.imageUrl && <img alt={`步骤 ${index + 1}`} className="max-h-80 w-full rounded-xl object-cover" decoding="async" height={800} loading="lazy" src={step.imageUrl} width={1200} />}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {recipe.personalNotes && <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">我的备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{recipe.personalNotes}</p></section>}
      {recipe.source && <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">来源</h2><p className="mt-2 text-sm text-muted-foreground">{recipe.source.sourceTitle || recipe.source.sourcePlatform || "导入来源"}{recipe.source.sourceAuthor ? ` · ${recipe.source.sourceAuthor}` : ""}</p>{recipe.source.sourceUrl && <a className="mt-2 inline-block text-sm text-primary underline" href={recipe.source.sourceUrl} rel="noreferrer" target="_blank">查看原始来源</a>}</section>}
    </main>
  );
}
