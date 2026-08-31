import { notFound, redirect } from "next/navigation";

import { CookingScreen } from "@/features/cooking/components/cooking-screen";
import { parseTargetServings } from "@/features/cooking/servings";
import { OfflineRecipeCache } from "@/features/offline/components/offline-recipe-cache";
import { getRecipeDetail } from "@/features/recipes/queries";
import { resolveMealPlanCookingContext } from "@/features/cooking-history/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function CookRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ servings?: string | string[]; restart?: string | string[]; mealPlanEntryId?: string | string[] }>;
}) {
  const [{ recipeId }, query] = await Promise.all([params, searchParams]);
  const [recipe, { user }] = await Promise.all([
    getRecipeDetail(recipeId),
    getServerAuthContext(),
  ]);
  if (!recipe) notFound();
  if (!user) redirect(`/login?next=/recipes/${recipeId}/cook`);

  const servings = typeof query.servings === "string" ? query.servings : "";
  const mealPlanEntryId = typeof query.mealPlanEntryId === "string" ? query.mealPlanEntryId : null;
  const mealPlanContext = mealPlanEntryId
    ? await resolveMealPlanCookingContext(recipe.id, mealPlanEntryId)
    : null;
  return (
    <>
      {user ? <OfflineRecipeCache recipe={recipe} userId={user.id} /> : null}
      <CookingScreen
        mealPlanEntryId={mealPlanContext?.mealPlanEntryId ?? null}
        recipe={recipe}
        requestedServings={mealPlanContext?.targetServings ?? parseTargetServings(servings, recipe.baseServings)}
        restart={query.restart === "1"}
        userId={user.id}
      />
    </>
  );
}
