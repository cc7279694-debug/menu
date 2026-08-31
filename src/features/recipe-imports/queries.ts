import { getServerAuthContext } from "@/lib/supabase/server-auth";
import { recipeAiProviderSchema, type RecipeAiProvider, type RecipeImportDraft, type RecipeImportJob, type RecipeImportStatus } from "@/features/recipe-imports/schemas";
import { parseStoredRecipeImportDraft } from "@/features/recipe-imports/quality-review";

export const RECIPE_IMPORT_BUCKET = "recipe-imports";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function aiProvider(value: unknown): RecipeAiProvider {
  const parsed = recipeAiProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : "auto";
}

export function mapRecipeImportJob(row: Record<string, unknown>): RecipeImportJob {
  const draft = row.draft ? parseStoredRecipeImportDraft(row.draft) : null;
  return {
    id: String(row.id),
    sourceType: row.source_type as RecipeImportJob["sourceType"],
    aiProvider: aiProvider(row.ai_provider),
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    sourceTitle: typeof row.source_title === "string" ? row.source_title : null,
    sourceAuthor: typeof row.source_author === "string" ? row.source_author : null,
    sourcePlatform: typeof row.source_platform === "string" ? row.source_platform : null,
    imagePaths: stringArray(row.image_paths),
    status: row.status as RecipeImportStatus,
    draft,
    warnings: stringArray(row.warnings),
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    recipeId: typeof row.recipe_id === "string" ? row.recipe_id : null,
    expiresAt: String(row.expires_at),
  };
}

export async function getOwnedRecipeImport(importId: string): Promise<RecipeImportJob | null> {
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) return null;
  const result = await supabase
    .from("recipe_import_jobs")
    .select("id, source_type, ai_provider, source_url, source_title, source_author, source_platform, image_paths, status, draft, warnings, error_code, recipe_id, expires_at")
    .eq("id", importId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return mapRecipeImportJob(result.data as unknown as Record<string, unknown>);
}

export async function cleanupExpiredRecipeImports(): Promise<void> {
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) return;
  const result = await supabase
    .from("recipe_import_jobs")
    .select("id, image_paths")
    .eq("user_id", user.id)
    .lt("expires_at", new Date().toISOString())
    .neq("status", "saved");
  if (result.error) throw new Error("导入临时数据清理失败");

  for (const row of result.data ?? []) {
    const paths = stringArray((row as { image_paths?: unknown }).image_paths)
      .filter((path) => path.startsWith(`${user.id}/`));
    if (paths.length) {
      const removed = await supabase.storage.from(RECIPE_IMPORT_BUCKET).remove(paths);
      if (removed.error) throw new Error("导入临时数据清理失败");
    }
  }
  const ids = (result.data ?? []).map((row) => (row as { id: string }).id);
  if (ids.length) {
    const deleted = await supabase.from("recipe_import_jobs").delete().eq("user_id", user.id).in("id", ids);
    if (deleted.error) throw new Error("导入临时数据清理失败");
  }
}

export type { RecipeImportDraft };
