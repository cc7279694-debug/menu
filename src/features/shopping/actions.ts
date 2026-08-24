"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildShoppingContributions, mergeShoppingContributions } from "@/features/shopping/merge";
import {
  getShoppingGenerationRecipes,
  searchShoppingRecipeOptions,
} from "@/features/shopping/queries";
import {
  shoppingClearCompletedInputSchema,
  shoppingGenerationInputSchema,
  shoppingItemCheckedInputSchema,
  shoppingItemDeleteInputSchema,
  shoppingItemInputSchema,
  shoppingReorderInputSchema,
} from "@/features/shopping/schemas";
import type { ActionResult } from "@/features/recipes/types";
import type {
  ShoppingContribution,
  ShoppingDraftItem,
  ShoppingGenerationInput,
  ShoppingGenerationRecipe,
  ShoppingRecipeOption,
} from "@/features/shopping/types";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const INVALID_REQUEST_MESSAGE = "请求参数无效";
const MUTATION_AUTH_MESSAGE = "请先登录后再操作购物清单";
const ACTIVE_LIST_INVALID_MESSAGE = "购物清单已失效，请刷新后重试";

const searchQuerySchema = z
  .string()
  .transform((value) => value.trim().slice(0, 80));

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type ShoppingPreviewResult = {
  contributions: ShoppingContribution[];
  items: ShoppingDraftItem[];
};

type ShoppingListSnapshot = {
  listId: string;
  name: string;
  sources: Array<{
    id: string;
    recipeId: string;
    recipeTitleSnapshot: string;
    selectedServings: number;
  }>;
  items: Array<{
    id: string;
    ingredientId: string | null;
    nameSnapshot: string;
    quantity: number | null;
    quantityText: string | null;
    unit: string | null;
    aisle: string | null;
    isChecked: boolean;
    isManual: boolean;
    sortOrder: number;
  }>;
  itemSources: Array<{
    id: string;
    shoppingListItemId: string;
    shoppingListSourceId: string;
    recipeIngredientId: string | null;
    quantityContribution: number | null;
    quantityTextContribution: string | null;
    unitSnapshot: string | null;
  }>;
};

function invalidRequest<T>(): ActionResult<T> {
  return { ok: false, message: INVALID_REQUEST_MESSAGE };
}

function isAuthError(error: unknown) {
  return error instanceof Error && (
    error.message === "需要登录后才能访问菜谱"
    || error.message === "请先登录后再查看购物清单"
  );
}

async function getMutationClient(): Promise<{
  supabase: SupabaseClient;
  userId: string;
} | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, userId: user.id };
}

async function ensureOwnedActiveList(
  supabase: SupabaseClient,
  userId: string,
  shoppingListId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("id", shoppingListId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return !error && Boolean(data);
}

async function loadDraft(input: ShoppingGenerationInput): Promise<ShoppingPreviewResult> {
  const recipes = await getShoppingGenerationRecipes(
    input.selections.map((selection) => selection.recipeId),
  );
  const contributions = buildShoppingContributions(recipes, input.selections);
  const items = mergeShoppingContributions(
    contributions,
    new Set(input.excludedRecipeIngredientIds),
  );

  return { contributions, items };
}

function buildSnapshot(
  input: ShoppingGenerationInput,
  recipes: ShoppingGenerationRecipe[],
  items: ShoppingDraftItem[],
): ShoppingListSnapshot {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const listId = crypto.randomUUID();
  const sources = input.selections.map((selection) => {
    const recipe = recipeMap.get(selection.recipeId);
    return {
      id: crypto.randomUUID(),
      recipeId: selection.recipeId,
      recipeTitleSnapshot: recipe?.title ?? "未命名菜谱",
      selectedServings: selection.selectedServings,
    };
  });
  const sourceIdsByRecipeId = new Map(sources.map((source) => [source.recipeId, source.id]));
  const snapshotItems = items.map((item) => ({
    id: crypto.randomUUID(),
    ingredientId: item.ingredientId,
    nameSnapshot: item.nameSnapshot,
    quantity: item.quantity,
    quantityText: item.quantityText,
    unit: item.unit,
    aisle: item.aisle,
    isChecked: false,
    isManual: item.isManual,
    sortOrder: item.sortOrder,
  }));
  const itemSources = items.flatMap((item, itemIndex) =>
    item.sources.map((source) => ({
      id: crypto.randomUUID(),
      shoppingListItemId: snapshotItems[itemIndex].id,
      shoppingListSourceId: sourceIdsByRecipeId.get(source.recipeId) ?? "",
      recipeIngredientId: source.recipeIngredientId,
      quantityContribution: source.quantityContribution,
      quantityTextContribution: source.quantityTextContribution,
      unitSnapshot: source.unitSnapshot,
    })));

  return {
    listId,
    name: "当前购物清单",
    sources,
    items: snapshotItems,
    itemSources,
  };
}

export async function searchShoppingRecipesAction(
  input: unknown,
): Promise<ActionResult<ShoppingRecipeOption[]>> {
  const parsed = searchQuerySchema.safeParse(input);
  if (!parsed.success) {
    return invalidRequest();
  }

  try {
    const options = await searchShoppingRecipeOptions(parsed.data);
    return { ok: true, data: options };
  } catch (error) {
    return {
      ok: false,
      message: isAuthError(error) ? "请先登录后再搜索菜谱" : "菜谱选项暂时无法加载",
    };
  }
}

export async function previewShoppingListAction(
  input: unknown,
): Promise<ActionResult<ShoppingPreviewResult>> {
  const parsed = shoppingGenerationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "请检查购物清单生成信息" };
  }

  try {
    const preview = await loadDraft(parsed.data);
    return { ok: true, data: preview };
  } catch (error) {
    return {
      ok: false,
      message: isAuthError(error) ? "请先登录后再生成购物清单" : "购物清单预览暂时无法生成",
    };
  }
}

export async function generateShoppingListAction(
  input: unknown,
): Promise<ActionResult<{ shoppingListId: string }>> {
  const parsed = shoppingGenerationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "请检查购物清单生成信息" };
  }

  let recipes: ShoppingGenerationRecipe[];
  let items: ShoppingDraftItem[];
  try {
    recipes = await getShoppingGenerationRecipes(
      parsed.data.selections.map((selection) => selection.recipeId),
    );
    const contributions = buildShoppingContributions(recipes, parsed.data.selections);
    items = mergeShoppingContributions(
      contributions,
      new Set(parsed.data.excludedRecipeIngredientIds),
    );
  } catch (error) {
    return {
      ok: false,
      message: isAuthError(error) ? "请先登录后再生成购物清单" : "购物清单生成失败，请稍后重试",
    };
  }

  if (items.length === 0) {
    return { ok: false, message: "请至少保留一项需要购买的食材" };
  }

  const client = await getMutationClient();
  if (!client) {
    return { ok: false, message: "请先登录后再生成购物清单" };
  }

  const snapshot = buildSnapshot(parsed.data, recipes, items);
  const { data, error } = await client.supabase.rpc("replace_active_shopping_list", {
    p_payload: snapshot as unknown as Json,
  });

  if (error || !data) {
    return { ok: false, message: "购物清单生成失败，请稍后重试" };
  }

  revalidatePath("/shopping");
  return { ok: true, data: { shoppingListId: data } };
}

export async function saveShoppingItemAction(
  input: unknown,
): Promise<ActionResult<{ itemId: string }>> {
  const parsed = shoppingItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidRequest();
  }

  const client = await getMutationClient();
  if (!client) {
    return { ok: false, message: MUTATION_AUTH_MESSAGE };
  }

  const { supabase, userId } = client;
  const active = await ensureOwnedActiveList(supabase, userId, parsed.data.shoppingListId);
  if (!active) {
    return { ok: false, message: ACTIVE_LIST_INVALID_MESSAGE };
  }

  if (parsed.data.itemId) {
    const { data, error } = await supabase
      .from("shopping_list_items")
      .update({
        name_snapshot: parsed.data.nameSnapshot,
        quantity: parsed.data.quantity,
        quantity_text: parsed.data.quantityText,
        unit: parsed.data.unit,
        aisle: parsed.data.aisle,
      })
      .eq("id", parsed.data.itemId)
      .eq("shopping_list_id", parsed.data.shoppingListId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, message: "购物清单保存失败，请刷新后重试" };
    }

    revalidatePath("/shopping");
    return { ok: true, data: { itemId: data.id } };
  }

  const lastSortResult = await supabase
    .from("shopping_list_items")
    .select("sort_order")
    .eq("shopping_list_id", parsed.data.shoppingListId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastSortResult.error) {
    return { ok: false, message: "购物清单保存失败，请刷新后重试" };
  }

  const itemId = crypto.randomUUID();
  const nextSortOrder = Number(lastSortResult.data?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("shopping_list_items")
    .insert({
      id: itemId,
      user_id: userId,
      shopping_list_id: parsed.data.shoppingListId,
      ingredient_id: null,
      name_snapshot: parsed.data.nameSnapshot,
      quantity: parsed.data.quantity,
      quantity_text: parsed.data.quantityText,
      unit: parsed.data.unit,
      aisle: parsed.data.aisle,
      is_checked: false,
      is_manual: true,
      sort_order: nextSortOrder,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "购物清单保存失败，请刷新后重试" };
  }

  revalidatePath("/shopping");
  return { ok: true, data: { itemId: data.id } };
}

export async function setShoppingItemCheckedAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = shoppingItemCheckedInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidRequest();
  }

  const client = await getMutationClient();
  if (!client) {
    return { ok: false, message: MUTATION_AUTH_MESSAGE };
  }

  const active = await ensureOwnedActiveList(client.supabase, client.userId, parsed.data.shoppingListId);
  if (!active) {
    return { ok: false, message: ACTIVE_LIST_INVALID_MESSAGE };
  }

  const { data, error } = await client.supabase
    .from("shopping_list_items")
    .update({ is_checked: parsed.data.isChecked })
    .eq("id", parsed.data.itemId)
    .eq("shopping_list_id", parsed.data.shoppingListId)
    .eq("user_id", client.userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "购物清单状态更新失败，请刷新后重试" };
  }

  revalidatePath("/shopping");
  return { ok: true, data: null };
}

export async function deleteShoppingItemAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = shoppingItemDeleteInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidRequest();
  }

  const client = await getMutationClient();
  if (!client) {
    return { ok: false, message: MUTATION_AUTH_MESSAGE };
  }

  const active = await ensureOwnedActiveList(client.supabase, client.userId, parsed.data.shoppingListId);
  if (!active) {
    return { ok: false, message: ACTIVE_LIST_INVALID_MESSAGE };
  }

  const { data, error } = await client.supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", parsed.data.itemId)
    .eq("shopping_list_id", parsed.data.shoppingListId)
    .eq("user_id", client.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: "购物清单删除失败，请刷新后重试" };
  }

  revalidatePath("/shopping");
  return { ok: true, data: null };
}

export async function clearCompletedShoppingItemsAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = shoppingClearCompletedInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidRequest();
  }

  const client = await getMutationClient();
  if (!client) {
    return { ok: false, message: MUTATION_AUTH_MESSAGE };
  }

  const active = await ensureOwnedActiveList(client.supabase, client.userId, parsed.data.shoppingListId);
  if (!active) {
    return { ok: false, message: ACTIVE_LIST_INVALID_MESSAGE };
  }

  const { error } = await client.supabase
    .from("shopping_list_items")
    .delete()
    .eq("shopping_list_id", parsed.data.shoppingListId)
    .eq("user_id", client.userId)
    .eq("is_checked", true);
  if (error) {
    return { ok: false, message: "清理已完成食材失败，请刷新后重试" };
  }

  revalidatePath("/shopping");
  return { ok: true, data: null };
}

export async function reorderShoppingItemsAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = shoppingReorderInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidRequest();
  }

  const client = await getMutationClient();
  if (!client) {
    return { ok: false, message: MUTATION_AUTH_MESSAGE };
  }

  const active = await ensureOwnedActiveList(client.supabase, client.userId, parsed.data.shoppingListId);
  if (!active) {
    return { ok: false, message: ACTIVE_LIST_INVALID_MESSAGE };
  }

  const { error } = await client.supabase.rpc("reorder_shopping_items", {
    p_shopping_list_id: parsed.data.shoppingListId,
    p_item_ids: parsed.data.itemIds,
  });

  if (error) {
    return { ok: false, message: "购物清单排序失败，请刷新后重试" };
  }

  revalidatePath("/shopping");
  return { ok: true, data: null };
}
