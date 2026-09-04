import { RecipeDetailLocalFirstPage } from "@/features/recipes/components/recipe-detail-local-first-page";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: Promise<{ recipeId: string }> }) {
  const { recipeId } = await params;
  return <RecipeDetailLocalFirstPage recipeId={recipeId} />;
}
