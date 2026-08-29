import { notFound, redirect } from "next/navigation";

import { ImportProgress } from "@/features/recipe-imports/components/import-progress";
import { mapImportDraftToRecipeSaveInput } from "@/features/recipe-imports/draft-mapping";
import { getOwnedRecipeImport } from "@/features/recipe-imports/queries";
import { RecipeEditorPage } from "@/features/recipes/components/recipe-editor-page";
import { listRecipeTaxonomy } from "@/features/recipes/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export default async function RecipeImportDetailPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  const job = await getOwnedRecipeImport(importId);
  if (!job) notFound();
  if (job.status === "saved" && job.recipeId) redirect(`/recipes/${job.recipeId}`);
  if (job.status === "review" && job.draft) {
    const { user } = await getServerAuthContext();
    if (!user) redirect(`/login?next=/recipes/import/${importId}`);
    const taxonomy = await listRecipeTaxonomy();
    const mapped = mapImportDraftToRecipeSaveInput({ draft: job.draft, ...taxonomy });
    return <main className="space-y-5"><div className="rounded-xl border bg-muted/30 p-4 text-sm">AI 已整理完成，请检查食材、火候和时间后再保存。</div><RecipeEditorPage mode="create" userId={user.id} categories={taxonomy.categories} tags={taxonomy.tags} initialValue={mapped.value} importId={importId} /></main>;
  }
  return <main className="mx-auto max-w-2xl"><ImportProgress importId={importId} initialStatus={job.status} initialErrorCode={job.errorCode} /></main>;
}
