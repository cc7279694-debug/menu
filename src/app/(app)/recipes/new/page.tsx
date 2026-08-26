import { redirect } from "next/navigation";

import { RecipeEditorPage } from "@/features/recipes/components/recipe-editor-page";
import { listRecipeTaxonomy } from "@/features/recipes/queries";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const { user } = await getServerAuthContext();
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
