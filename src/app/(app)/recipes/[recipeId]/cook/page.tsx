import { notFound } from "next/navigation";

import { CookingScreen } from "@/features/cooking/components/cooking-screen";
import { parseTargetServings } from "@/features/cooking/servings";
import { OfflineRecipeCache } from "@/features/offline/components/offline-recipe-cache";
import { getRecipeDetail } from "@/features/recipes/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function CookRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ servings?: string | string[]; restart?: string | string[] }>;
}) {
  const [{ recipeId }, query] = await Promise.all([params, searchParams]);
  const [recipe, { user }] = await Promise.all([
    getRecipeDetail(recipeId),
    getServerAuthContext(),
  ]);
  if (!recipe) notFound();

  const servings = typeof query.servings === "string" ? query.servings : "";
  return (
    <>
      {user ? <OfflineRecipeCache recipe={recipe} userId={user.id} /> : null}
      <CookingScreen
        recipe={recipe}
        requestedServings={parseTargetServings(servings, recipe.baseServings)}
        restart={query.restart === "1"}
      />
    </>
  );
}
