import { searchOwnedRecipeSelectionSummaries } from "@/features/recipes/queries";
import type { RecipeSelectionSummary } from "@/features/recipes/types";
import type { MealPlanEntry, MealPlanStatus, MealSlot } from "@/features/meal-plans/types";
import { getServerAuthContext } from "@/lib/supabase/server-auth";

const LOAD_ERROR = "周菜单暂时无法加载";

function asMealSlot(value: string): MealSlot {
  if (value === "breakfast" || value === "lunch" || value === "dinner") return value;
  throw new Error(LOAD_ERROR);
}

function asMealPlanStatus(value: string): MealPlanStatus {
  if (value === "planned" || value === "completed" || value === "skipped") return value;
  throw new Error(LOAD_ERROR);
}

export async function listMealPlanRecipeOptions(): Promise<RecipeSelectionSummary[]> {
  return searchOwnedRecipeSelectionSummaries("", 100);
}

export async function listMealPlanEntries(startAt: string, endAt: string): Promise<MealPlanEntry[]> {
  const { supabase, user, error } = await getServerAuthContext();
  if (error || !user) throw new Error("请先登录后再查看周菜单");

  const entriesResult = await supabase
    .from("meal_plan_entries")
    .select("id, recipe_id, meal_slot, planned_at, target_servings, status, note")
    .eq("user_id", user.id)
    .gte("planned_at", startAt)
    .lt("planned_at", endAt)
    .order("planned_at", { ascending: true });

  if (entriesResult.error) throw new Error(LOAD_ERROR);
  const rows = entriesResult.data ?? [];
  if (rows.length === 0) return [];

  const recipeIds = [...new Set(rows.map((row) => row.recipe_id))];
  const [recipesResult, preparationsResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, base_servings")
      .eq("user_id", user.id)
      .in("id", recipeIds),
    supabase
      .from("recipe_preparations")
      .select("id, recipe_id, instruction, lead_time_minutes, timing_text, sort_order")
      .eq("user_id", user.id)
      .in("recipe_id", recipeIds)
      .order("sort_order", { ascending: true }),
  ]);

  if (recipesResult.error || preparationsResult.error) throw new Error(LOAD_ERROR);
  const recipeMap = new Map((recipesResult.data ?? []).map((recipe) => [recipe.id, recipe]));
  const preparationsByRecipe = new Map<string, MealPlanEntry["preparations"]>();
  for (const preparation of preparationsResult.data ?? []) {
    const current = preparationsByRecipe.get(preparation.recipe_id) ?? [];
    current.push({
      id: preparation.id,
      instruction: preparation.instruction,
      leadTimeMinutes: preparation.lead_time_minutes,
      timingText: preparation.timing_text,
    });
    preparationsByRecipe.set(preparation.recipe_id, current);
  }

  return rows.flatMap((row) => {
    const recipe = recipeMap.get(row.recipe_id);
    if (!recipe) return [];
    return [{
      id: row.id,
      recipeId: row.recipe_id,
      recipeTitle: recipe.title,
      recipeBaseServings: Number(recipe.base_servings),
      mealSlot: asMealSlot(row.meal_slot),
      plannedAt: row.planned_at,
      targetServings: Number(row.target_servings),
      status: asMealPlanStatus(row.status),
      note: row.note,
      preparations: preparationsByRecipe.get(row.recipe_id) ?? [],
    }];
  });
}
