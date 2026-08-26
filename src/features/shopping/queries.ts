import { searchOwnedRecipeSelectionSummaries } from "@/features/recipes/queries";
import type {
  ShoppingActiveList,
  ShoppingGenerationRecipe,
  ShoppingListItemSourceSummary,
  ShoppingListItemSummary,
  ShoppingRecipeOption,
} from "@/features/shopping/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

const INVALID_RECIPE_SELECTION_MESSAGE = "所选菜谱已失效，请重新选择";
const GENERATION_QUERY_ERROR_MESSAGE = "所选菜谱暂时无法加载";
const ACTIVE_LIST_QUERY_ERROR_MESSAGE = "购物清单暂时无法加载";
const AUTH_REQUIRED_MESSAGE = "请先登录后再查看购物清单";

type AuthenticatedClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function getAuthenticatedShoppingClient(): Promise<{
  supabase: AuthenticatedClient;
  userId: string;
}> {
  const { supabase, user, error } = await getServerAuthContext();

  if (error || !user) {
    throw new Error(AUTH_REQUIRED_MESSAGE);
  }

  return {
    supabase,
    userId: user.id,
  };
}

function compareBySortOrderAndId(
  left: { sort_order: number; id: string },
  right: { sort_order: number; id: string },
) {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }
  return left.id.localeCompare(right.id, "en-US");
}

function compareByCreatedAtAndId(
  left: { created_at: string; id: string },
  right: { created_at: string; id: string },
) {
  if (left.created_at !== right.created_at) {
    return left.created_at.localeCompare(right.created_at, "en-US");
  }
  return left.id.localeCompare(right.id, "en-US");
}

export async function searchShoppingRecipeOptions(query: string): Promise<ShoppingRecipeOption[]> {
  try {
    return await searchOwnedRecipeSelectionSummaries(query, 24);
  } catch (error) {
    if (error instanceof Error && error.message === "需要登录后才能访问菜谱") {
      throw error;
    }
    throw new Error("菜谱选项暂时无法加载");
  }
}

export async function getShoppingGenerationRecipes(
  recipeIds: string[],
): Promise<ShoppingGenerationRecipe[]> {
  const distinctRecipeIds = [...new Set(recipeIds)];
  if (distinctRecipeIds.length !== recipeIds.length) {
    throw new Error(INVALID_RECIPE_SELECTION_MESSAGE);
  }

  const { supabase, userId } = await getAuthenticatedShoppingClient();
  const recipesResult = await supabase
    .from("recipes")
    .select("id, title, base_servings")
    .in("id", distinctRecipeIds)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (recipesResult.error) {
    throw new Error(GENERATION_QUERY_ERROR_MESSAGE);
  }

  const recipes = recipesResult.data ?? [];
  if (recipes.length !== distinctRecipeIds.length) {
    throw new Error(INVALID_RECIPE_SELECTION_MESSAGE);
  }

  const recipeIngredientsResult = await supabase
    .from("recipe_ingredients")
    .select("id, recipe_id, ingredient_id, quantity, quantity_text, unit, sort_order")
    .in("recipe_id", distinctRecipeIds)
    .eq("user_id", userId);

  if (recipeIngredientsResult.error) {
    throw new Error(GENERATION_QUERY_ERROR_MESSAGE);
  }

  const recipeIngredients = [...(recipeIngredientsResult.data ?? [])].sort(compareBySortOrderAndId);
  const ingredientIds = [...new Set(recipeIngredients.map((row) => row.ingredient_id))];
  const ingredientsResult = ingredientIds.length === 0
    ? { data: [], error: null }
    : await supabase
      .from("ingredients")
      .select("id, display_name, default_aisle")
      .in("id", ingredientIds)
      .eq("user_id", userId);

  if (ingredientsResult.error) {
    throw new Error(GENERATION_QUERY_ERROR_MESSAGE);
  }

  const ingredientMap = new Map(
    (ingredientsResult.data ?? []).map((row) => [
      row.id,
      { name: row.display_name, aisle: row.default_aisle },
    ]),
  );
  const ingredientsByRecipeId = new Map<string, ShoppingGenerationRecipe["ingredients"]>();

  for (const recipeIngredient of recipeIngredients) {
    const current = ingredientsByRecipeId.get(recipeIngredient.recipe_id) ?? [];
    const ingredient = ingredientMap.get(recipeIngredient.ingredient_id);

    current.push({
      recipeIngredientId: recipeIngredient.id,
      ingredientId: recipeIngredient.ingredient_id,
      name: ingredient?.name ?? "未命名食材",
      quantity: recipeIngredient.quantity,
      quantityText: recipeIngredient.quantity_text,
      unit: recipeIngredient.unit,
      aisle: ingredient?.aisle ?? null,
      sortOrder: recipeIngredient.sort_order,
    });
    ingredientsByRecipeId.set(recipeIngredient.recipe_id, current);
  }

  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return recipeIds.map((recipeId) => {
    const recipe = recipeMap.get(recipeId);
    if (!recipe) {
      throw new Error(INVALID_RECIPE_SELECTION_MESSAGE);
    }

    return {
      id: recipe.id,
      title: recipe.title,
      baseServings: Number(recipe.base_servings),
      ingredients: ingredientsByRecipeId.get(recipe.id) ?? [],
    };
  });
}

export async function getActiveShoppingList(): Promise<ShoppingActiveList | null> {
  const { supabase, userId } = await getAuthenticatedShoppingClient();
  const activeListResult = await supabase
    .from("shopping_lists")
    .select("id, name, updated_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (activeListResult.error) {
    throw new Error(ACTIVE_LIST_QUERY_ERROR_MESSAGE);
  }

  const activeList = activeListResult.data;
  if (!activeList) {
    return null;
  }

  const [sourcesResult, itemsResult, itemSourcesResult] = await Promise.all([
    supabase
      .from("shopping_list_sources")
      .select("id, shopping_list_id, recipe_id, recipe_title_snapshot, selected_servings, created_at")
      .eq("shopping_list_id", activeList.id)
      .eq("user_id", userId),
    supabase
      .from("shopping_list_items")
      .select(
        "id, shopping_list_id, ingredient_id, name_snapshot, quantity, quantity_text, unit, aisle, is_checked, is_manual, sort_order",
      )
      .eq("shopping_list_id", activeList.id)
      .eq("user_id", userId),
    supabase
      .from("shopping_list_item_sources")
      .select(
        "id, shopping_list_item_id, shopping_list_source_id, recipe_ingredient_id, quantity_contribution, quantity_text_contribution, unit_snapshot, created_at",
      )
      .eq("shopping_list_id", activeList.id)
      .eq("user_id", userId),
  ]);

  if (sourcesResult.error || itemsResult.error || itemSourcesResult.error) {
    throw new Error(ACTIVE_LIST_QUERY_ERROR_MESSAGE);
  }

  const sortedSources = [...(sourcesResult.data ?? [])].sort(compareByCreatedAtAndId);
  const sourceMap = new Map(
    sortedSources.map((source, index) => [
      source.id,
      {
        index,
        data: {
          id: source.id,
          recipeId: source.recipe_id,
          recipeTitleSnapshot: source.recipe_title_snapshot,
          selectedServings: Number(source.selected_servings),
        },
      },
    ]),
  );
  const sortedItems = [...(itemsResult.data ?? [])].sort(compareBySortOrderAndId);
  const itemMap = new Map<string, ShoppingListItemSummary>(
    sortedItems.map((item) => [
      item.id,
      {
        id: item.id,
        ingredientId: item.ingredient_id,
        nameSnapshot: item.name_snapshot,
        quantity: item.quantity,
        quantityText: item.quantity_text,
        unit: item.unit,
        aisle: item.aisle,
        isChecked: item.is_checked,
        isManual: item.is_manual,
        sortOrder: item.sort_order,
        sources: [] as ShoppingListItemSourceSummary[],
      },
    ]),
  );
  const sortedItemSources = [...(itemSourcesResult.data ?? [])].sort(compareByCreatedAtAndId);

  for (const itemSource of sortedItemSources) {
    const item = itemMap.get(itemSource.shopping_list_item_id);
    const source = sourceMap.get(itemSource.shopping_list_source_id);
    if (!item || !source) {
      continue;
    }

    const mappedSource: ShoppingListItemSourceSummary = {
      id: itemSource.id,
      shoppingListSourceId: source.data.id,
      recipeId: source.data.recipeId,
      recipeTitleSnapshot: source.data.recipeTitleSnapshot,
      selectedServings: source.data.selectedServings,
      recipeIngredientId: itemSource.recipe_ingredient_id,
      quantityContribution: itemSource.quantity_contribution,
      quantityTextContribution: itemSource.quantity_text_contribution,
      unitSnapshot: itemSource.unit_snapshot,
    };

    item.sources.push(mappedSource);
  }

  for (const item of itemMap.values()) {
    item.sources.sort((left, right) => {
      const leftIndex = sourceMap.get(left.shoppingListSourceId)?.index ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = sourceMap.get(right.shoppingListSourceId)?.index ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return left.id.localeCompare(right.id, "en-US");
    });
  }

  return {
    id: activeList.id,
    name: activeList.name,
    updatedAt: activeList.updated_at,
    sources: sortedSources.map((source) => ({
      id: source.id,
      recipeId: source.recipe_id,
      recipeTitleSnapshot: source.recipe_title_snapshot,
      selectedServings: Number(source.selected_servings),
    })),
    items: sortedItems.map((item) => {
      const mapped = itemMap.get(item.id);
      if (!mapped) {
        throw new Error(ACTIVE_LIST_QUERY_ERROR_MESSAGE);
      }
      return mapped;
    }),
  };
}
