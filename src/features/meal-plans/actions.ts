"use server";

import { revalidatePath } from "next/cache";

import { aggregateMealPlanShoppingSelections } from "@/features/meal-plans/shopping";
import { listMealPlanEntries } from "@/features/meal-plans/queries";
import {
  mealPlanDeleteInputSchema,
  mealPlanEntryInputSchema,
  mealPlanRangeInputSchema,
  mealPlanStatusInputSchema,
} from "@/features/meal-plans/schemas";
import type { MealPlanActionResult, MealPlanEntry } from "@/features/meal-plans/types";
import { generateShoppingListAction } from "@/features/shopping/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getMutationContext() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, userId: user.id };
}

export async function loadMealPlanWeekAction(input: unknown): Promise<MealPlanActionResult<MealPlanEntry[]>> {
  const parsed = mealPlanRangeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "日期范围无效" };
  try {
    return { ok: true, data: await listMealPlanEntries(parsed.data.startAt, parsed.data.endAt) };
  } catch {
    return { ok: false, message: "周菜单暂时无法加载，请稍后重试" };
  }
}

export async function saveMealPlanEntryAction(input: unknown): Promise<MealPlanActionResult<{ entryId: string }>> {
  const parsed = mealPlanEntryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请检查菜单安排信息" };
  const context = await getMutationContext();
  if (!context) return { ok: false, message: "请先登录后再安排菜单" };

  const recipe = await context.supabase
    .from("recipes")
    .select("id")
    .eq("id", parsed.data.recipeId)
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (recipe.error || !recipe.data) return { ok: false, message: "所选菜谱已失效，请重新选择" };

  const values = {
    user_id: context.userId,
    recipe_id: parsed.data.recipeId,
    meal_slot: parsed.data.mealSlot,
    planned_at: parsed.data.plannedAt,
    target_servings: parsed.data.targetServings,
    note: parsed.data.note,
  };

  const result = parsed.data.entryId
    ? await context.supabase
      .from("meal_plan_entries")
      .update(values)
      .eq("id", parsed.data.entryId)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle()
    : await context.supabase
      .from("meal_plan_entries")
      .insert({ ...values, status: "planned" })
      .select("id")
      .maybeSingle();

  if (result.error || !result.data) return { ok: false, message: "菜单安排保存失败，请稍后重试" };
  revalidatePath("/plan");
  return { ok: true, data: { entryId: result.data.id } };
}

export async function setMealPlanStatusAction(input: unknown): Promise<MealPlanActionResult<null>> {
  const parsed = mealPlanStatusInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请求参数无效" };
  const context = await getMutationContext();
  if (!context) return { ok: false, message: "请先登录后再更新菜单" };

  const result = await context.supabase
    .from("meal_plan_entries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.entryId)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) return { ok: false, message: "菜单状态更新失败，请刷新后重试" };
  revalidatePath("/plan");
  return { ok: true, data: null };
}

export async function deleteMealPlanEntryAction(input: unknown): Promise<MealPlanActionResult<null>> {
  const parsed = mealPlanDeleteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请求参数无效" };
  const context = await getMutationContext();
  if (!context) return { ok: false, message: "请先登录后再删除菜单" };
  const result = await context.supabase
    .from("meal_plan_entries")
    .delete()
    .eq("id", parsed.data.entryId)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) return { ok: false, message: "菜单安排删除失败，请刷新后重试" };
  revalidatePath("/plan");
  return { ok: true, data: null };
}

export async function generateMealPlanShoppingListAction(input: unknown): Promise<MealPlanActionResult<{ shoppingListId: string }>> {
  const parsed = mealPlanRangeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "日期范围无效" };
  let entries: MealPlanEntry[];
  try {
    entries = await listMealPlanEntries(parsed.data.startAt, parsed.data.endAt);
  } catch {
    return { ok: false, message: "本周菜单暂时无法读取" };
  }
  const selections = aggregateMealPlanShoppingSelections(entries);
  if (selections.length === 0) return { ok: false, message: "本周还没有待做菜谱" };
  return generateShoppingListAction({ selections, excludedRecipeIngredientIds: [] });
}
