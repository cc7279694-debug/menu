import { RecipeCard } from "@/features/recipes/components/recipe-card";
import type { RecipeSummary } from "@/features/recipes/types";

export function RecipeGrid({ recipes, deleted = false }: { recipes: RecipeSummary[]; deleted?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recipes.map((recipe) => <RecipeCard deleted={deleted} key={recipe.id} recipe={recipe} />)}</div>;
}
