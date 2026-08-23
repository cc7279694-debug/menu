"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recipeSaveInputSchema } from "@/features/recipes/schemas";
import type { ActionResult } from "@/features/recipes/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const nameSchema = z.string().trim().min(1, "名称不能为空").max(40, "名称不能超过 40 个字");
const uuidSchema = z.string().uuid();

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

function invalidId(): ActionResult<null> {
  return { ok: false, message: "请求参数无效" };
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

export function createCategoryAction(name: string) {
  return createCategoryOrTag("categories", name);
}

export function createTagAction(name: string) {
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

export function setRecipeFavoriteAction(recipeId: string, favorite: boolean) {
  return updateRecipe(recipeId, { is_favorite: favorite }, (query) => query.is("deleted_at", null));
}

export function moveRecipeToTrashAction(recipeId: string) {
  return updateRecipe(recipeId, { deleted_at: new Date().toISOString() }, (query) => query.is("deleted_at", null));
}

export function restoreRecipeAction(recipeId: string) {
  return updateRecipe(recipeId, { deleted_at: null }, (query) => query.not("deleted_at", "is", null));
}
