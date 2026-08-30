"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { attachRecipeImportImagesSchema, createRecipeImportSchema } from "@/features/recipe-imports/schemas";
import { getOwnedRecipeImport, mapRecipeImportJob, RECIPE_IMPORT_BUCKET } from "@/features/recipe-imports/queries";
import type { ActionResult } from "@/features/recipes/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

async function getUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function createRecipeImportAction(input: unknown): Promise<ActionResult<{ importId: string; uploadFolder: string }>> {
  const parsed = createRecipeImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请提供有效的菜谱来源" };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, message: "请先登录后再导入菜谱" };

  const importId = randomUUID();
  const insert = await supabase.from("recipe_import_jobs").insert({
    id: importId,
    user_id: user.id,
    source_type: parsed.data.sourceType,
    ai_provider: parsed.data.aiProvider,
    source_url: parsed.data.sourceType === "url" ? parsed.data.sourceUrl : null,
    source_text: parsed.data.sourceType === "text" ? parsed.data.sourceText : null,
    status: "queued",
  }).select("id").single();
  if (insert.error || !insert.data) return { ok: false, message: "导入任务创建失败，请稍后重试" };
  return { ok: true, data: { importId, uploadFolder: `${user.id}/${importId}` } };
}

export async function attachRecipeImportImagesAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = attachRecipeImportImagesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "图片路径无效" };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, message: "请先登录后再导入菜谱" };
  const folder = `${user.id}/${parsed.data.importId}/`;
  const paths = [...new Set(parsed.data.imagePaths)];
  if (paths.length !== parsed.data.imagePaths.length || paths.some((path) => !path.startsWith(folder))) {
    return { ok: false, message: "图片路径无效" };
  }
  const job = await supabase.from("recipe_import_jobs").select("id").eq("id", parsed.data.importId).eq("user_id", user.id).maybeSingle();
  if (job.error || !job.data) return { ok: false, message: "导入任务不存在" };
  const updated = await supabase.from("recipe_import_jobs").update({ image_paths: paths as unknown as Json }).eq("id", parsed.data.importId).eq("user_id", user.id).select("id").maybeSingle();
  if (updated.error || !updated.data) return { ok: false, message: "图片关联失败，请重试" };
  return { ok: true, data: null };
}

export async function finalizeRecipeImportAction(importId: string, recipeId: string): Promise<ActionResult<null>> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, message: "请先登录后再保存菜谱" };
  const [jobResult, recipeResult] = await Promise.all([
    supabase.from("recipe_import_jobs").select("*").eq("id", importId).eq("user_id", user.id).maybeSingle(),
    supabase.from("recipes").select("id").eq("id", recipeId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (recipeResult.error || !recipeResult.data) return { ok: false, message: "菜谱不存在" };
  if (jobResult.error || !jobResult.data) return { ok: false, message: "导入任务不存在" };
  const job = mapRecipeImportJob(jobResult.data as unknown as Record<string, unknown>);
  if (job.status === "saved" && job.recipeId === recipeId) return { ok: true, data: null };
  const source = await supabase.from("recipe_sources").upsert({
    user_id: user.id,
    recipe_id: recipeId,
    source_type: job.sourceType,
    source_url: job.sourceUrl,
    source_title: job.sourceTitle,
    source_author: job.sourceAuthor,
    source_platform: job.sourcePlatform,
  }, { onConflict: "user_id,recipe_id" });
  if (source.error) return { ok: false, message: "来源保存失败，请重试" };
  const updated = await supabase.from("recipe_import_jobs").update({ status: "saved", recipe_id: recipeId, source_text: null, draft: null }).eq("id", importId).eq("user_id", user.id).select("id").maybeSingle();
  if (updated.error) return { ok: false, message: "导入任务更新失败，请重试" };
  if (job.imagePaths.length) await supabase.storage.from(RECIPE_IMPORT_BUCKET).remove(job.imagePaths);
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true, data: null };
}

export async function discardRecipeImportAction(importId: string): Promise<ActionResult<null>> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, message: "请先登录后再操作" };
  const result = await supabase.from("recipe_import_jobs").select("id, image_paths").eq("id", importId).eq("user_id", user.id).maybeSingle();
  if (result.error) return { ok: false, message: "导入任务删除失败" };
  if (!result.data) return { ok: true, data: null };
  const paths = Array.isArray(result.data.image_paths) ? result.data.image_paths.filter((path): path is string => typeof path === "string" && path.startsWith(`${user.id}/${importId}/`)) : [];
  if (paths.length) {
    const removed = await supabase.storage.from(RECIPE_IMPORT_BUCKET).remove(paths);
    if (removed.error) return { ok: false, message: "临时图片清理失败" };
  }
  const deleted = await supabase.from("recipe_import_jobs").delete().eq("id", importId).eq("user_id", user.id);
  if (deleted.error) return { ok: false, message: "导入任务删除失败" };
  return { ok: true, data: null };
}

export { getOwnedRecipeImport };
