import { getServerAuthContext } from "@/lib/supabase/server-auth";
import { createSignedImageUrlMap } from "@/features/media/signed-urls";
import { mealPlanCookingQuerySchema } from "@/features/cooking-history/schemas";
import type {
  CookingHistoryStats,
  CookingRecordSummary,
  MealPlanCookingContext,
  RecipeCookingHistory,
} from "@/features/cooking-history/types";
import { z } from "zod";

const HISTORY_ERROR = "烹饪历史暂时无法加载";
const uuidSchema = z.string().uuid();

export async function resolveMealPlanCookingContext(
  recipeId: string,
  mealPlanEntryId: string | null | undefined,
): Promise<MealPlanCookingContext | null> {
  const parsedRecipeId = uuidSchema.safeParse(recipeId);
  const parsed = mealPlanCookingQuerySchema.safeParse({ mealPlanEntryId });
  if (!parsedRecipeId.success || !parsed.success || !parsed.data.mealPlanEntryId) return null;

  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) return null;
  const result = await supabase
    .from("meal_plan_entries")
    .select("id, recipe_id, target_servings")
    .eq("id", parsed.data.mealPlanEntryId)
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return {
    mealPlanEntryId: result.data.id,
    targetServings: Number(result.data.target_servings),
  };
}

type CookingRecordRow = {
  id: string;
  recipe_id: string | null;
  recipe_title_snapshot: string;
  meal_plan_entry_id: string | null;
  started_at: string;
  completed_at: string;
  actual_servings: number;
  rating: number | null;
  improvement_notes: string | null;
  cooking_record_photos?: Array<{
    id: string;
    storage_path: string;
    sort_order: number;
  }> | null;
};

function mapStats(row: {
  total_count?: number | null;
  rated_count?: number | null;
  average_rating?: number | null;
  latest_improvement_notes?: string | null;
} | null | undefined): CookingHistoryStats {
  return {
    totalCount: Number(row?.total_count ?? 0),
    ratedCount: Number(row?.rated_count ?? 0),
    averageRating: row?.average_rating === null || row?.average_rating === undefined ? null : Number(row.average_rating),
    latestImprovementNotes: row?.latest_improvement_notes ?? null,
  };
}

export async function getRecipeCookingHistory(recipeId: string): Promise<RecipeCookingHistory> {
  const recipeIdResult = uuidSchema.safeParse(recipeId);
  if (!recipeIdResult.success) throw new Error(HISTORY_ERROR);
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) throw new Error("请先登录后查看烹饪历史");

  const [statsResult, recordsResult] = await Promise.all([
    supabase.rpc("get_recipe_cooking_history_stats", { p_recipe_id: recipeId }),
    supabase
      .from("cooking_records")
      .select("id, recipe_id, recipe_title_snapshot, meal_plan_entry_id, started_at, completed_at, actual_servings, rating, improvement_notes, cooking_record_photos(id, storage_path, sort_order)")
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId)
      .order("completed_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(3),
  ]);

  if (statsResult.error || recordsResult.error) throw new Error(HISTORY_ERROR);
  const rows = (recordsResult.data ?? []) as unknown as CookingRecordRow[];
  const paths = rows.flatMap((row) => (row.cooking_record_photos ?? []).map((photo) => photo.storage_path));
  const signedUrls = await createSignedImageUrlMap(supabase.storage.from("recipe-media"), paths);
  const recentRecords: CookingRecordSummary[] = rows.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    recipeTitleSnapshot: row.recipe_title_snapshot,
    mealPlanEntryId: row.meal_plan_entry_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    actualServings: Number(row.actual_servings),
    rating: row.rating === null ? null : Number(row.rating),
    improvementNotes: row.improvement_notes,
    photos: (row.cooking_record_photos ?? [])
      .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
      .map((photo) => ({ id: photo.id, imageUrl: signedUrls[photo.storage_path] ?? null, sortOrder: photo.sort_order })),
  }));

  return {
    stats: mapStats(statsResult.data?.[0]),
    recentRecords,
  };
}
