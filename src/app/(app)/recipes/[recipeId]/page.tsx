import { notFound } from "next/navigation";

import { RecipeDetailView } from "@/features/recipes/components/recipe-detail";
import { getRecipeDetail } from "@/features/recipes/queries";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: Promise<{ recipeId: string }> }) {
  const { recipeId } = await params;
  const recipe = await getRecipeDetail(recipeId);
  if (!recipe) notFound();
  return <RecipeDetailView recipe={recipe} />;
}
