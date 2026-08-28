import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { OfflineRecipeDetail } from "@/features/offline/types";

function quantity(quantity: number | null, text: string | null, unit: string | null) {
  return `${text ?? (quantity === null ? "适量" : quantity)}${unit ? ` ${unit}` : ""}`;
}

export function OfflineRecipeDetail({ recipe }: { recipe: OfflineRecipeDetail }) {
  return (
    <main className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline" href={`/offline/app?path=${encodeURIComponent("/recipes")}`}>
          返回离线菜谱
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" href={`/offline/app?path=${encodeURIComponent(`/recipes/${recipe.id}/cook`)}`}>
          开始烹饪
        </Link>
      </div>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{recipe.title}</h1>
          {recipe.category && <Badge variant="secondary">{recipe.category.name}</Badge>}
        </div>
        {recipe.description && <p className="mt-2 max-w-2xl text-muted-foreground">{recipe.description}</p>}
        <p className="mt-3 text-sm text-muted-foreground">{recipe.baseServings} 人份 · {recipe.prepMinutes ?? 0} 分钟准备 · {recipe.cookMinutes ?? 0} 分钟烹饪</p>
      </header>
      <div aria-label="菜谱图片离线不可用" className="flex aspect-[4/3] items-center justify-center rounded-2xl border bg-muted/30 text-sm text-muted-foreground">图片离线不可用</div>

      <section className="grid gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-semibold">食材清单</h2>
          <ul className="mt-4 space-y-3">
            {recipe.ingredients.map((ingredient) => (
              <li className="flex items-baseline justify-between gap-4 border-b pb-2 text-sm last:border-0" key={ingredient.id}>
                <span>{ingredient.name}{ingredient.preparationNote && <span className="text-muted-foreground">（{ingredient.preparationNote}）</span>}</span>
                <span className="shrink-0 text-muted-foreground">{quantity(ingredient.quantity, ingredient.quantityText, ingredient.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">步骤</h2>
          {recipe.steps.map((step, index) => (
            <article className="rounded-2xl border bg-card p-5" key={step.id}>
              <div className="flex items-start gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
                <div className="min-w-0 space-y-3">
                  <p className="whitespace-pre-wrap leading-7">{step.instruction}</p>
                  {step.timerSeconds && <p className="text-sm text-muted-foreground">计时 {Math.ceil(step.timerSeconds / 60)} 分钟</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {recipe.personalNotes && <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">我的备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{recipe.personalNotes}</p></section>}
    </main>
  );
}
