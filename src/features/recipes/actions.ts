"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recipeListQuerySchema, recipeSaveInputSchema } from "@/features/recipes/schemas";
import { getRecipeDetail, listRecipePageData } from "@/features/recipes/queries";
import { getRecipeCookingHistory } from "@/features/cooking-history/queries";
import type { RecipeListQuery } from "@/features/recipes/query-params";
import type { ActionResult, RecipeDetail } from "@/features/recipes/types";
import type { RecipeCookingHistory } from "@/features/cooking-history/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/supabase/server-auth";
import type { Json } from "@/lib/supabase/database.types";

const nameSchema = z.string().trim().min(1, "名称不能为空").max(40, "名称不能超过 40 个字");
const uuidSchema = z.string().uuid();

type RecipeListPageData = Awaited<ReturnType<typeof listRecipePageData>> & { userId: string };
type RecipeDetailPageData = { recipe: RecipeDetail; cookingHistory: RecipeCookingHistory; userId: string };

function validationErrors(error: z.ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
    return result;
  }, {});
}

async function getUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

function invalidId<T = null>(): ActionResult<T> {
  return { ok: false, message: "请求参数无效" };
}

export async function loadRecipeListAction(input: RecipeListQuery): Promise<ActionResult<RecipeListPageData>> {
  const parsed = recipeListQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请求参数无效" };

  const { user, error } = await getServerAuthContext();
  if (error || !user) return { ok: false, message: "请先登录后查看菜谱" };

  try {
    const pageData = await listRecipePageData(parsed.data);
    return { ok: true, data: { ...pageData, userId: user.id } };
  } catch {
    return { ok: false, message: "菜谱列表暂时无法加载" };
  }
}

export async function loadRecipeDetailAction(recipeId: string): Promise<ActionResult<RecipeDetailPageData>> {
  if (!uuidSchema.safeParse(recipeId).success) return invalidId();

  const { user, error } = await getServerAuthContext();
  if (error || !user) return { ok: false, message: "请先登录后查看菜谱" };

  try {
    const [recipe, cookingHistory] = await Promise.all([
      getRecipeDetail(recipeId),
      getRecipeCookingHistory(recipeId),
    ]);
    if (!recipe) return { ok: false, message: "菜谱不存在或已删除" };
    return { ok: true, data: { recipe, cookingHistory, userId: user.id } };
  } catch {
    return { ok: false, message: "菜谱暂时无法加载" };
  }
}

export async function saveRecipeAction(input: unknown): Promise<ActionResult<{ recipeId: string }>> {
  const parsed = recipeSaveInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查菜谱信息后再保存",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const { supabase, user } = await getUser();
  if (!user) {
    return { ok: false, message: "请先登录后再保存菜谱" };
  }

  const { data, error } = await supabase.rpc("save_recipe", {
    p_payload: parsed.data as unknown as Json,
  });
  if (error || !data) {
    return { ok: false, message: "菜谱保存失败，请稍后重试" };
  }

  revalidatePath("/recipes");
  revalidatePath("/favorites");
  revalidatePath(`/recipes/${data}`);
  return { ok: true, data: { recipeId: data } };
}

async function createCategoryOrTag(
  table: "categories" | "tags",
  nameInput: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = nameSchema.safeParse(nameInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "名称无效" };
  }

  const { supabase, user } = await getUser();
  if (!user) {
    return { ok: false, message: "请先登录后再创建" };
  }

  const insertPayload = table === "categories"
    ? { user_id: user.id, name: parsed.data, sort_order: 0 }
    : { user_id: user.id, name: parsed.data };
  const inserted = await supabase
    .from(table)
    .insert(insertPayload as never)
    .select("id, name")
    .single();

  if (!inserted.error && inserted.data) {
    revalidatePath("/recipes");
    return { ok: true, data: inserted.data };
  }

  if (inserted.error?.code === "23505") {
    const existing = await supabase
      .from(table)
      .select("id, name")
      .eq("user_id", user.id)
      .ilike("name", parsed.data)
      .maybeSingle();
    if (!existing.error && existing.data) {
      return { ok: true, data: existing.data };
    }
  }

  return { ok: false, message: "名称创建失败，请稍后重试" };
}

export async function createCategoryAction(name: string) {
  return createCategoryOrTag("categories", name);
}

export async function createTagAction(name: string) {
  return createCategoryOrTag("tags", name);
}

async function updateRecipe(
  recipeId: string,
  update: { is_favorite?: boolean; deleted_at?: string | null },
  predicate: (query: ReturnType<Awaited<ReturnType<typeof getUser>>["supabase"]["from"]>) => unknown,
): Promise<ActionResult<null>> {
  if (!uuidSchema.safeParse(recipeId).success) {
    return invalidId();
  }

  const { supabase, user } = await getUser();
  if (!user) {
    return { ok: false, message: "请先登录后再操作" };
  }

  let query = supabase
    .from("recipes")
    .update(update)
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .select("id");
  query = predicate(query) as typeof query;
  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return { ok: false, message: "菜谱状态更新失败，请刷新后重试" };
  }

  revalidatePath("/recipes");
  revalidatePath("/favorites");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true, data: null };
}

export async function setRecipeFavoriteAction(recipeId: string, favorite: boolean) {
  return updateRecipe(recipeId, { is_favorite: favorite }, (query) => query.is("deleted_at", null));
}

export async function moveRecipeToTrashAction(recipeId: string) {
  return updateRecipe(recipeId, { deleted_at: new Date().toISOString() }, (query) => query.is("deleted_at", null));
}

export async function restoreRecipeAction(recipeId: string) {
  return updateRecipe(recipeId, { deleted_at: null }, (query) => query.not("deleted_at", "is", null));
}

export async function permanentlyDeleteRecipeAction(recipeId: string): Promise<ActionResult<null>> {
  if (!uuidSchema.safeParse(recipeId).success) {
    return invalidId();
  }

  const { supabase, user } = await getUser();
  if (!user) {
    return { ok: false, message: "请先登录后再操作" };
  }

  const recipeResult = await supabase
    .from("recipes")
    .select("cover_path")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .maybeSingle();
  if (recipeResult.error || !recipeResult.data) {
    return { ok: false, message: "只能永久删除回收站中的菜谱" };
  }

  const stepResult = await supabase
    .from("recipe_steps")
    .select("image_path")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);
  const mediaPaths = [
    recipeResult.data.cover_path,
    ...(stepResult.data ?? []).map((step) => step.image_path),
  ].filter((path): path is string => Boolean(path));

  const deleted = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (deleted.error || !deleted.data) {
    return { ok: false, message: "菜谱永久删除失败，请稍后重试" };
  }

  if (mediaPaths.length) {
    await supabase.storage.from("recipe-media").remove(mediaPaths);
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true, data: null };
}
