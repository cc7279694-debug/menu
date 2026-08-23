import { notFound } from "next/navigation";

import { CookingScreen } from "@/features/cooking/components/cooking-screen";
import { parseTargetServings } from "@/features/cooking/servings";
import { getRecipeDetail } from "@/features/recipes/queries";

export const dynamic = "force-dynamic";

export default async function CookRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ servings?: string | string[]; restart?: string | string[] }>;
}) {
  const [{ recipeId }, query] = await Promise.all([params, searchParams]);
  const recipe = await getRecipeDetail(recipeId);
  if (!recipe) notFound();

  const servings = typeof query.servings === "string" ? query.servings : "";
  return (
    <CookingScreen
      recipe={recipe}
      requestedServings={parseTargetServings(servings, recipe.baseServings)}
      restart={query.restart === "1"}
    />
  );
}
