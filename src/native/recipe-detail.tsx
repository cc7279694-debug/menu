import { Button } from "@/components/ui/button";
import type { RecipeDetails } from "./recipe-model";
import { LocalImage } from "./local-image";
import { RecipeStepContent } from "./recipe-step-content";
export function RecipeDetail({
  recipe,
  onEdit,
  onBack,
  onDelete,
  onFocus,
  onGuided,
  onComplete,
  completing = false,
}: {
  recipe: RecipeDetails;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  onFocus?: (index: number, trigger: HTMLElement) => void;
  onGuided?: (trigger: HTMLElement) => void;
  onComplete?: () => void;
  completing?: boolean;
}) {
  return (
    <article className="space-y-6">
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          返回菜谱库
        </Button>
        <Button variant="outline" onClick={onEdit}>
          编辑菜谱
        </Button>
      </div>
      {recipe.coverPath && (
        <LocalImage
          path={recipe.coverPath}
          alt={`${recipe.title} 封面`}
          className="max-h-80 w-full rounded-2xl object-cover"
        />
      )}
      <header>
        <h2 className="text-3xl font-semibold break-words">{recipe.title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {recipe.servings !== null
            ? `约 ${recipe.servings} 人份`
            : "份数未记录"}
        </p>
        {recipe.caloriesPerServing !== null && (
          <p className="mt-2 text-sm text-muted-foreground">
            每份约 {recipe.caloriesPerServing} kcal
            {recipe.servings !== null
              ? ` · 整道约 ${Math.round(recipe.caloriesPerServing * recipe.servings)} kcal（按 ${recipe.servings} 份）`
              : " · 尚未填写份数，无法推算整道热量"}
          </p>
        )}
      </header>
      <section>
        <h3 className="mb-3 text-lg font-semibold">食材</h3>
        {recipe.ingredients.length ? (
          <ul className="divide-y rounded-xl border px-4">
            {recipe.ingredients.map((r, i) => (
              <li key={i} className="flex justify-between gap-4 py-3">
                <span className="break-words">{r.name}</span>
                <span className="text-muted-foreground break-words">
                  {r.amount || "用量未记录"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">还没有食材，可以随时补充。</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-lg font-semibold">总耗时</h3>
        <p>
          {recipe.totalMinutes === null
            ? "耗时未记录"
            : `${recipe.totalMinutes} 分钟`}
        </p>
      </section>
      {!!recipe.preparations.length && (
        <section className="rounded-xl bg-muted p-4">
          <h3 className="mb-3 font-semibold">提前准备</h3>
          <ul className="space-y-3">
            {recipe.preparations.map((r, i) => (
              <li key={i}>
                <p className="whitespace-pre-wrap">{r.instruction}</p>
                <p className="text-sm text-muted-foreground">
                  {r.minutes !== null ? `约 ${r.minutes} 分钟` : ""}
                  {r.timingText
                    ? `${r.minutes !== null ? " · " : ""}${r.timingText}`
                    : ""}
                  {r.minutes === null && !r.timingText ? "时间未记录" : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!recipe.keyTips.length && (
        <section className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">做菜前先看</h3>
          <ul className="list-inside list-disc space-y-2">
            {recipe.keyTips.map((r, i) => (
              <li key={i} className="whitespace-pre-wrap">
                {r.instruction}
                {r.stepNumber !== null ? `（步骤 ${r.stepNumber}）` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3 className="mb-3 text-lg font-semibold">完整步骤</h3>
        <Button
          variant="outline"
          className="mb-4 min-h-11"
          disabled={!recipe.steps.length || !onGuided}
          onClick={(e) => onGuided?.(e.currentTarget)}
        >
          开始引导烹饪
        </Button>
        {recipe.steps.length ? (
          <ol className="space-y-4">
            {recipe.steps.map((_, i) => (
              <li key={i} className="rounded-xl border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">{i + 1}.</h4>
                  {onFocus && (
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      aria-label={`放大步骤 ${i + 1}`}
                      onClick={(e) => onFocus(i, e.currentTarget)}
                    >
                      放大查看
                    </Button>
                  )}
                </div>
                <RecipeStepContent recipe={recipe} stepIndex={i} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">
            只记菜名也没关系，需要时再补充做法。
          </p>
        )}
      </section>
      {recipe.notes && (
        <section>
          <h3 className="mb-2 font-semibold">个人备注</h3>
          <p className="whitespace-pre-wrap break-words">{recipe.notes}</p>
        </section>
      )}
      <Button
        className="min-h-11"
        disabled={!onComplete || completing}
        onClick={onComplete}
      >
        完成这道菜
      </Button>
      <Button
        variant="ghost"
        className="min-h-11 text-destructive"
        onClick={onDelete}
      >
        删除这道菜
      </Button>
    </article>
  );
}
