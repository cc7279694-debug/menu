import { notFound } from "next/navigation";

import { OfflineRecipeCache } from "@/features/offline/components/offline-recipe-cache";
import { RecipeDetailView } from "@/features/recipes/components/recipe-detail";
import { getRecipeDetail } from "@/features/recipes/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: Promise<{ recipeId: string }> }) {
  const { recipeId } = await params;
  const [recipe, { user }] = await Promise.all([
    getRecipeDetail(recipeId),
    getServerAuthContext(),
  ]);
  if (!recipe) notFound();
  return (
    <>
      {user ? <OfflineRecipeCache recipe={recipe} userId={user.id} /> : null}
      <RecipeDetailView recipe={recipe} />
    </>
  );
}
