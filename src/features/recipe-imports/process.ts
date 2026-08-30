import "server-only";

import { assertSafePublicUrl, fetchPublicDocument } from "@/features/recipe-imports/url-safety";
import { extractPublicWebSource } from "@/features/recipe-imports/web-source";
import { createRecipeAiExtractor } from "@/features/recipe-imports/recipe-ai-extractor";
import { createGeminiRecipeDraftExtractor } from "@/features/recipe-imports/gemini-extractor";
import { createQianwenRecipeDraftExtractor } from "@/features/recipe-imports/qianwen-extractor";
import { recipeImportDraftSchema, type RecipeAiProvider, type RecipeDraftExtractor, type RecipeImportDraft, type SourceDocument } from "@/features/recipe-imports/schemas";
import { getServerAuthContext } from "@/lib/supabase/server-auth";
import { RECIPE_IMPORT_BUCKET, mapRecipeImportJob } from "@/features/recipe-imports/queries";

type ProcessClient = Awaited<ReturnType<typeof getServerAuthContext>>["supabase"];
type ProcessOptions = { extractor?: RecipeDraftExtractor; fetchDocument?: typeof fetchPublicDocument; supabase?: ProcessClient; userId?: string };

export function createRecipeDraftExtractorForProvider(provider: RecipeAiProvider): RecipeDraftExtractor {
  if (provider === "qwen") return createQianwenRecipeDraftExtractor();
  if (provider === "gemini") return createGeminiRecipeDraftExtractor();
  return createRecipeAiExtractor();
}

export class RecipeImportProcessError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export function mapImportErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "不支持访问该地址") return "unsafe_url";
  if (["网页中没有找到可整理的文字", "网页暂时无法访问", "网页格式不受支持", "网页跳转次数过多", "网页请求超时"].includes(message)) return "source_unreadable";
  if (message === "网页内容过大") return "source_too_large";
  if (message === "AI 服务请求过于频繁") return "ai_rate_limited";
  if (message === "AI 服务认证失败") return "ai_unauthorized";
  if (message === "AI 服务暂时不可用") return "ai_unavailable";
  if (message === "菜谱内容整理失败") return "invalid_ai_output";
  return "processing_failed";
}

function errorMessage(code: string, error: unknown): string {
  if (code !== "processing_failed") return error instanceof Error ? error.message : "导入处理失败";
  return "菜谱导入失败，请稍后重试";
}

async function resolveContext(options: ProcessOptions) {
  if (options.supabase && options.userId) return { supabase: options.supabase, userId: options.userId };
  const context = await getServerAuthContext();
  if (context.error || !context.user) throw new RecipeImportProcessError("unauthorized", "请先登录后再导入菜谱");
  return { supabase: context.supabase, userId: context.user.id };
}

async function loadJob(supabase: ProcessClient, importId: string, userId: string) {
  const result = await supabase.from("recipe_import_jobs").select("*").eq("id", importId).eq("user_id", userId).maybeSingle();
  if (result.error || !result.data) throw new RecipeImportProcessError("not_found", "导入任务不存在");
  return { row: result.data as unknown as Record<string, unknown>, job: mapRecipeImportJob(result.data as unknown as Record<string, unknown>) };
}

async function updateJob(supabase: ProcessClient, importId: string, userId: string, values: Record<string, unknown>) {
  const result = await supabase.from("recipe_import_jobs").update(values as never).eq("id", importId).eq("user_id", userId).select("id").maybeSingle();
  if (result.error) throw new Error("processing update failed");
}

async function imageSource(supabase: ProcessClient, job: ReturnType<typeof mapRecipeImportJob>, userId: string): Promise<{ document: SourceDocument; imageUrls: string[] }> {
  const paths = job.imagePaths.filter((path) => path.startsWith(`${userId}/${job.id}/`));
  if (!paths.length) throw new Error("网页中没有找到可整理的文字");
  const signed = await supabase.storage.from(RECIPE_IMPORT_BUCKET).createSignedUrls(paths, 600);
  if (signed.error) throw new Error("网页中没有找到可整理的文字");
  const imageUrls = (signed.data ?? []).flatMap((item) => item.signedUrl ? [item.signedUrl] : []);
  if (!imageUrls.length) throw new Error("网页中没有找到可整理的文字");
  return { document: { platform: "uploaded-images", title: job.sourceTitle, author: job.sourceAuthor, canonicalUrl: null, text: "", imageUrls }, imageUrls };
}

export async function processRecipeImport(importId: string, options: ProcessOptions = {}): Promise<{ status: "review"; draft: RecipeImportDraft }> {
  const { supabase, userId } = await resolveContext(options);
  const loaded = await loadJob(supabase, importId, userId);
  const { job } = loaded;
  if ((job.status === "fetching" || job.status === "extracting")) throw new RecipeImportProcessError("conflict", "导入任务正在处理中");
  if (job.status === "review" && job.draft) return { status: "review", draft: job.draft };
  if (job.status === "saved" && job.draft) return { status: "review", draft: job.draft };
  if (job.status !== "queued" && job.status !== "failed") throw new RecipeImportProcessError("conflict", "导入任务当前不可处理");

  try {
    await updateJob(supabase, importId, userId, { status: "fetching", error_code: null });
    let document: SourceDocument;
    let imageUrls: string[] = [];
    if (job.sourceType === "url" && job.sourceUrl) {
      const fetched = await (options.fetchDocument ?? fetchPublicDocument)(job.sourceUrl);
      document = extractPublicWebSource({ html: fetched.body, finalUrl: fetched.finalUrl });
      for (const candidate of document.imageUrls.slice(0, 12)) {
        if (imageUrls.length >= 6) break;
        try { await assertSafePublicUrl(candidate); imageUrls.push(candidate); } catch { /* discard unsafe image candidates */ }
      }
    } else if (job.sourceType === "text") {
      document = { platform: "pasted-text", title: job.sourceTitle, author: job.sourceAuthor, canonicalUrl: null, text: typeof loaded.row.source_text === "string" ? loaded.row.source_text : "", imageUrls: [] };
    } else {
      const resolved = await imageSource(supabase, job, userId);
      document = resolved.document;
      imageUrls = resolved.imageUrls;
    }

    await updateJob(supabase, importId, userId, { status: "extracting", source_title: document.title, source_author: document.author, source_platform: document.platform, source_url: document.canonicalUrl ?? job.sourceUrl });
    const draft = recipeImportDraftSchema.parse(await (options.extractor ?? createRecipeDraftExtractorForProvider(job.aiProvider)).extract({ document, imageUrls }));
    await updateJob(supabase, importId, userId, { status: "review", draft: draft as unknown as Record<string, unknown>, warnings: draft.warnings, error_code: null });
    return { status: "review", draft };
  } catch (error) {
    const code = mapImportErrorCode(error);
    await updateJob(supabase, importId, userId, { status: "failed", error_code: code });
    if (error instanceof RecipeImportProcessError) throw error;
    throw new RecipeImportProcessError(code, errorMessage(code, error));
  }
}
