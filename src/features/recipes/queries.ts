import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/supabase/server-auth";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  RecipeDetail,
  RecipeListResult,
  RecipeNutrition,
  RecipeSelectionSummary,
  RecipeSummary,
} from "@/features/recipes/types";
import type { RecipeListQuery } from "@/features/recipes/query-params";
import { createSignedImageUrlMap } from "@/features/media/signed-urls";

type SearchRow = Database["public"]["Functions"]["search_recipe_summaries"]["Returns"][number];
type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export function parseRecipeSearchTags(value: Json): Array<{ id: string; name: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((tag) => {
    if (
      typeof tag === "object" &&
      tag !== null &&
      "id" in tag &&
      typeof tag.id === "string" &&
      "name" in tag &&
      typeof tag.name === "string"
    ) {
      return [{ id: tag.id, name: tag.name }];
    }
    return [];
  });
}

function parseNullableNutritionNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseRecipeSearchNutrition(value: Json | null | undefined): RecipeNutrition | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const nutrition = value as Record<string, Json | undefined>;
  const result: RecipeNutrition = {
    caloriesKcal: parseNullableNutritionNumber(nutrition.caloriesKcal),
    proteinGrams: parseNullableNutritionNumber(nutrition.proteinGrams),
    fatGrams: parseNullableNutritionNumber(nutrition.fatGrams),
    carbsGrams: parseNullableNutritionNumber(nutrition.carbsGrams),
    isEstimated: typeof nutrition.isEstimated === "boolean" ? nutrition.isEstimated : true,
  };

  return result.caloriesKcal === null &&
    result.proteinGrams === null &&
    result.fatGrams === null &&
    result.carbsGrams === null
    ? null
    : result;
}

export function mapRecipeSearchRow(
  row: SearchRow,
  signedUrls: Record<string, string | null>,
): RecipeSummary {
  return {
    id: row.recipe_id,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_path ? signedUrls[row.cover_path] ?? null : null,
    baseServings: Number(row.base_servings),
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    isFavorite: row.is_favorite,
    category: row.category_id && row.category_name
      ? { id: row.category_id, name: row.category_name }
      : null,
    tags: parseRecipeSearchTags(row.tags),
    preparationCount: Number(row.preparation_count ?? 0),
    maxLeadTimeMinutes: row.max_lead_time_minutes,
    nutrition: parseRecipeSearchNutrition(row.nutrition),
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedClient() {
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) {
    throw new Error("需要登录后才能访问菜谱");
  }
  return { supabase, user };
}

async function loadRecipeSearchRowsForClient(
  supabase: ServerSupabaseClient,
  input: {
    query?: string | null;
    categoryId?: string | null;
    tagId?: string | null;
    favoriteOnly?: boolean;
    deletedOnly?: boolean;
    limit: number;
    offset: number;
    errorMessage: string;
  },
) {
  const { data, error } = await supabase.rpc("search_recipe_summaries", {
    p_query: input.query || null,
    p_category_id: input.categoryId ?? null,
    p_tag_id: input.tagId ?? null,
    p_favorite_only: input.favoriteOnly ?? false,
    p_deleted_only: input.deletedOnly ?? false,
    p_limit: input.limit,
    p_offset: input.offset,
  });

  if (error) {
    console.error("[recipes] search RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(input.errorMessage);
  }

  const rows = (data ?? []) as SearchRow[];
  const paths = rows.flatMap((row) => (row.cover_path ? [row.cover_path] : []));
  const signedUrls = await createSignedImageUrlMap(
    supabase.storage.from("recipe-media"),
    paths,
  );

  return { rows, signedUrls };
}

async function loadRecipeSearchRows(input: {
  query?: string | null;
  categoryId?: string | null;
  tagId?: string | null;
  favoriteOnly?: boolean;
  deletedOnly?: boolean;
  limit: number;
  offset: number;
  errorMessage: string;
}) {
  const { supabase } = await getAuthenticatedClient();
  return loadRecipeSearchRowsForClient(supabase, input);
}

export async function listRecipeSummaries(input: RecipeListQuery): Promise<RecipeListResult> {
  const { rows, signedUrls } = await loadRecipeSearchRows({
    query: input.query,
    categoryId: input.categoryId,
    tagId: input.tagId,
    favoriteOnly: input.favoriteOnly,
    deletedOnly: input.deletedOnly,
    limit: 24,
    offset: (input.page - 1) * 24,
    errorMessage: "菜谱列表暂时无法加载",
  });

  return {
    items: rows.map((row) => mapRecipeSearchRow(row, signedUrls)),
    totalCount: Number(rows[0]?.total_count ?? 0),
  };
}

async function listRecipeTaxonomyForClient(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<{
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}> {
  const [categoriesResult, tagsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error || tagsResult.error) {
    throw new Error("分类和标签暂时无法加载");
  }

  return {
    categories: categoriesResult.data ?? [],
    tags: tagsResult.data ?? [],
  };
}

export async function listRecipePageData(input: RecipeListQuery): Promise<RecipeListResult & {
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}> {
  const { supabase, user } = await getAuthenticatedClient();
  const [searchResult, taxonomy] = await Promise.all([
    loadRecipeSearchRowsForClient(supabase, {
      query: input.query,
      categoryId: input.categoryId,
      tagId: input.tagId,
      favoriteOnly: input.favoriteOnly,
      deletedOnly: input.deletedOnly,
      limit: 24,
      offset: (input.page - 1) * 24,
      errorMessage: "菜谱列表暂时无法加载",
    }),
    listRecipeTaxonomyForClient(supabase, user.id),
  ]);

  return {
    items: searchResult.rows.map((row) => mapRecipeSearchRow(row, searchResult.signedUrls)),
    totalCount: Number(searchResult.rows[0]?.total_count ?? 0),
    ...taxonomy,
  };
}

export async function searchOwnedRecipeSelectionSummaries(
  query: string,
  limit: number = 24,
): Promise<RecipeSelectionSummary[]> {
  const { rows, signedUrls } = await loadRecipeSearchRows({
    query,
    limit: Math.min(limit, 100),
    offset: 0,
    errorMessage: "菜谱查询暂时无法加载",
  });

  return rows.map((row) => {
    const summary = mapRecipeSearchRow(row, signedUrls);
    return {
      id: summary.id,
      title: summary.title,
      coverUrl: summary.coverUrl,
      baseServings: summary.baseServings,
    };
  });
}

export async function listRecipeTaxonomy(): Promise<{
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}> {
  const { supabase, user } = await getAuthenticatedClient();
  return listRecipeTaxonomyForClient(supabase, user.id);
}

export async function getRecipeDetail(recipeId: string): Promise<RecipeDetail | null> {
  const { supabase, user } = await getAuthenticatedClient();
  const recipeResult = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (recipeResult.error) {
    throw new Error("菜谱暂时无法加载");
  }
  if (!recipeResult.data) {
    return null;
  }

  const [categoryResult, recipeTagsResult, recipeIngredientsResult, stepsResult, preparationsResult, sourceResult, nutritionResult] = await Promise.all([
    recipeResult.data.category_id
      ? supabase.from("categories").select("id, name").eq("id", recipeResult.data.category_id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("recipe_tags").select("tag_id").eq("recipe_id", recipeId).eq("user_id", user.id),
    supabase
      .from("recipe_ingredients")
      .select("id, ingredient_id, quantity, quantity_text, unit, preparation_note, group_type, sort_order")
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("recipe_steps")
      .select("id, instruction, image_path, timer_seconds, heat_level, sort_order")
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("recipe_preparations")
      .select("id, recipe_ingredient_id, instruction, lead_time_minutes, timing_text, sort_order")
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase.from("recipe_sources").select("source_type, source_url, source_title, source_author, source_platform").eq("recipe_id", recipeId).eq("user_id", user.id).maybeSingle(),
    supabase.from("recipe_nutrition").select("calories_kcal, protein_grams, fat_grams, carbs_grams, is_estimated").eq("recipe_id", recipeId).eq("user_id", user.id).maybeSingle(),
  ]);

  if (categoryResult.error || recipeTagsResult.error || recipeIngredientsResult.error || stepsResult.error || preparationsResult.error || sourceResult.error || nutritionResult.error) {
    throw new Error("菜谱内容暂时无法加载");
  }

  const tagIds = recipeTagsResult.data?.map((row) => row.tag_id) ?? [];
  const ingredientIds = recipeIngredientsResult.data?.map((row) => row.ingredient_id) ?? [];
  const stepIds = stepsResult.data?.map((row) => row.id) ?? [];
  const [tagsResult, ingredientsResult, linksResult] = await Promise.all([
    tagIds.length
      ? supabase.from("tags").select("id, name").in("id", tagIds).eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    ingredientIds.length
      ? supabase.from("ingredients").select("id, display_name").in("id", ingredientIds).eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    stepIds.length
      ? supabase
        .from("step_ingredients")
        .select("step_id, recipe_ingredient_id, quantity_override, quantity_text_override, note")
        .in("step_id", stepIds)
        .eq("recipe_id", recipeId)
        .eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (tagsResult.error || ingredientsResult.error || linksResult.error) {
    throw new Error("菜谱关联内容暂时无法加载");
  }

  const ingredientNames = new Map((ingredientsResult.data ?? []).map((row) => [row.id, row.display_name]));
  const linksByStep = new Map<string, Array<{
    recipeIngredientId: string;
    quantityOverride: number | null;
    quantityTextOverride: string | null;
    note: string | null;
  }>>();
  for (const link of linksResult.data ?? []) {
    const current = linksByStep.get(link.step_id) ?? [];
    current.push({
      recipeIngredientId: link.recipe_ingredient_id,
      quantityOverride: link.quantity_override,
      quantityTextOverride: link.quantity_text_override,
      note: link.note,
    });
    linksByStep.set(link.step_id, current);
  }

  const imagePaths = [
    ...(recipeResult.data.cover_path ? [recipeResult.data.cover_path] : []),
    ...(stepsResult.data ?? []).flatMap((step) => (step.image_path ? [step.image_path] : [])),
  ];
  const signedUrls = await createSignedImageUrlMap(
    supabase.storage.from("recipe-media"),
    imagePaths,
  );
  const tags = (tagsResult.data ?? []).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const recipeIngredientNameById = new Map(
    (recipeIngredientsResult.data ?? []).map((ingredient) => [ingredient.id, ingredientNames.get(ingredient.ingredient_id) ?? "未命名食材"]),
  );

  return {
    id: recipeResult.data.id,
    title: recipeResult.data.title,
    description: recipeResult.data.description,
    coverUrl: recipeResult.data.cover_path ? signedUrls[recipeResult.data.cover_path] ?? null : null,
    coverPath: recipeResult.data.cover_path,
    baseServings: Number(recipeResult.data.base_servings),
    prepMinutes: recipeResult.data.prep_minutes,
    cookMinutes: recipeResult.data.cook_minutes,
    isFavorite: recipeResult.data.is_favorite,
    category: categoryResult.data ? { id: categoryResult.data.id, name: categoryResult.data.name } : null,
    tags,
    preparationCount: (preparationsResult.data ?? []).length,
    maxLeadTimeMinutes: (preparationsResult.data ?? []).reduce<number | null>(
      (max, preparation) => preparation.lead_time_minutes === null ? max : Math.max(max ?? 0, preparation.lead_time_minutes),
      null,
    ),
    personalNotes: recipeResult.data.personal_notes,
    nutrition: nutritionResult.data ? {
      caloriesKcal: nutritionResult.data.calories_kcal === null ? null : Number(nutritionResult.data.calories_kcal),
      proteinGrams: nutritionResult.data.protein_grams === null ? null : Number(nutritionResult.data.protein_grams),
      fatGrams: nutritionResult.data.fat_grams === null ? null : Number(nutritionResult.data.fat_grams),
      carbsGrams: nutritionResult.data.carbs_grams === null ? null : Number(nutritionResult.data.carbs_grams),
      isEstimated: nutritionResult.data.is_estimated,
    } : null,
    updatedAt: recipeResult.data.updated_at,
    ingredients: (recipeIngredientsResult.data ?? []).map((ingredient) => ({
      id: ingredient.id,
      name: ingredientNames.get(ingredient.ingredient_id) ?? "未命名食材",
      quantity: ingredient.quantity,
      quantityText: ingredient.quantity_text,
      unit: ingredient.unit,
      preparationNote: ingredient.preparation_note,
      groupType: ingredient.group_type === "seasoning" || ingredient.group_type === "other" ? ingredient.group_type : "main",
      sortOrder: ingredient.sort_order,
    })),
    steps: (stepsResult.data ?? []).map((step) => ({
      id: step.id,
      instruction: step.instruction,
      imagePath: step.image_path,
      imageUrl: step.image_path ? signedUrls[step.image_path] ?? null : null,
      timerSeconds: step.timer_seconds,
      heatLevel: step.heat_level,
      sortOrder: step.sort_order,
      ingredientLinks: linksByStep.get(step.id) ?? [],
    })),
    preparations: (preparationsResult.data ?? []).map((preparation) => ({
      id: preparation.id,
      recipeIngredientId: preparation.recipe_ingredient_id,
      ingredientName: preparation.recipe_ingredient_id ? recipeIngredientNameById.get(preparation.recipe_ingredient_id) ?? null : null,
      instruction: preparation.instruction,
      leadTimeMinutes: preparation.lead_time_minutes,
      timingText: preparation.timing_text,
      sortOrder: preparation.sort_order,
    })),
    source: sourceResult.data ? {
      sourceType: sourceResult.data.source_type as "url" | "text" | "images",
      sourceUrl: sourceResult.data.source_url,
      sourceTitle: sourceResult.data.source_title,
      sourceAuthor: sourceResult.data.source_author,
      sourcePlatform: sourceResult.data.source_platform,
    } : null,
  };
}
