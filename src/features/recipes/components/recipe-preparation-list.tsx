import type { RecipeDetail } from "@/features/recipes/types";
import { formatPreparationLeadTime, sortRecipePreparations } from "@/features/recipes/preparation-time";

type RecipePreparationListProps = {
  preparations: RecipeDetail["preparations"];
  className?: string;
};

export function RecipePreparationList({ preparations, className }: RecipePreparationListProps) {
  if (preparations.length === 0) return null;

  return (
    <section aria-labelledby="recipe-preparations-heading" className={className ?? "rounded-2xl border bg-card p-5"}>
      <h2 className="text-xl font-semibold" id="recipe-preparations-heading">提前准备</h2>
      <ol className="mt-4 space-y-3">
        {sortRecipePreparations(preparations).map((preparation) => (
          <li className="rounded-xl border p-4" key={preparation.id}>
            <p className="leading-7">
              {preparation.ingredientName ? `${preparation.ingredientName} · ` : ""}
              {preparation.timingText && !preparation.leadTimeMinutes ? `${preparation.timingText} · ` : ""}
              {preparation.instruction}
            </p>
            {preparation.leadTimeMinutes !== null && (
              <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                {formatPreparationLeadTime(preparation.leadTimeMinutes, null)}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
