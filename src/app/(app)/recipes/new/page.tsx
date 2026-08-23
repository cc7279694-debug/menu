import { redirect } from "next/navigation";

import { RecipeEditorPage } from "@/features/recipes/components/recipe-editor-page";
import { listRecipeTaxonomy } from "@/features/recipes/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Frecipes%2Fnew");

  const taxonomy = await listRecipeTaxonomy();
  return (
    <RecipeEditorPage
      categories={taxonomy.categories}
      mode="create"
      tags={taxonomy.tags}
      userId={user.id}
    />
  );
}
