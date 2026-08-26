import { notFound, redirect } from "next/navigation";

import { RecipeEditorPage } from "@/features/recipes/components/recipe-editor-page";
import { recipeDetailToSaveInput } from "@/features/recipes/editor-value";
import { getRecipeDetail, listRecipeTaxonomy } from "@/features/recipes/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const { user } = await getServerAuthContext();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/recipes/${recipeId}/edit`)}`);

  const [detail, taxonomy] = await Promise.all([
    getRecipeDetail(recipeId),
    listRecipeTaxonomy(),
  ]);
  if (!detail) notFound();

  return (
    <RecipeEditorPage
      categories={taxonomy.categories}
      coverPreviewUrl={detail.coverUrl}
      initialValue={recipeDetailToSaveInput(detail)}
      mode="edit"
      stepPreviewUrls={Object.fromEntries(detail.steps.map((step) => [step.id, step.imageUrl]))}
      tags={taxonomy.tags}
      userId={user.id}
    />
  );
}
