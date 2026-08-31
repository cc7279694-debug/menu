import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerAuthContext = vi.hoisted(() => vi.fn());
const createSignedImageUrlMap = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server-auth", () => ({ getServerAuthContext }));
vi.mock("@/features/media/signed-urls", () => ({ createSignedImageUrlMap }));

import { getRecipeCookingHistory, resolveMealPlanCookingContext } from "@/features/cooking-history/queries";

const recipeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const mealPlanEntryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function chain(result: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

describe("cooking history queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSignedImageUrlMap.mockResolvedValue({ "user/record/photo.webp": "https://signed/photo" });
  });

  it("resolves only an owned menu entry for the requested recipe", async () => {
    const mealQuery = chain({ data: { id: mealPlanEntryId, recipe_id: recipeId, target_servings: 4 }, error: null });
    getServerAuthContext.mockResolvedValue({ user: { id: "user" }, error: null, supabase: { from: vi.fn(() => mealQuery) } });
    await expect(resolveMealPlanCookingContext(recipeId, mealPlanEntryId)).resolves.toEqual({ mealPlanEntryId, targetServings: 4 });
    expect(resolveMealPlanCookingContext("bad", mealPlanEntryId)).resolves.toBeNull();
  });

  it("maps stats, limits recent records, sorts photos, and signs paths once", async () => {
    const records = [{
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      recipe_id: recipeId,
      recipe_title_snapshot: "番茄炒蛋",
      meal_plan_entry_id: null,
      started_at: "2026-08-31T10:00:00Z",
      completed_at: "2026-08-31T11:00:00Z",
      actual_servings: 2,
      rating: 5,
      improvement_notes: "少盐",
      cooking_record_photos: [
        { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", storage_path: "user/record/photo.webp", sort_order: 1 },
        { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", storage_path: "user/record/missing.webp", sort_order: 0 },
      ],
    }];
    const recordQuery = chain({ data: records, error: null });
    const storage = { from: vi.fn(() => ({}) ) };
    const rpc = vi.fn().mockResolvedValue({ data: [{ total_count: 4, rated_count: 3, average_rating: 4.5, latest_improvement_notes: "少盐" }], error: null });
    getServerAuthContext.mockResolvedValue({ user: { id: "user" }, error: null, supabase: { rpc, from: vi.fn(() => recordQuery), storage } });
    await expect(getRecipeCookingHistory(recipeId)).resolves.toEqual({
      stats: { totalCount: 4, ratedCount: 3, averageRating: 4.5, latestImprovementNotes: "少盐" },
      recentRecords: [{
        id: records[0].id, recipeId, recipeTitleSnapshot: "番茄炒蛋", mealPlanEntryId: null,
        startedAt: records[0].started_at, completedAt: records[0].completed_at, actualServings: 2, rating: 5, improvementNotes: "少盐",
        photos: [{ id: records[0].cooking_record_photos[1].id, imageUrl: null, sortOrder: 0 }, { id: records[0].cooking_record_photos[0].id, imageUrl: "https://signed/photo", sortOrder: 1 }],
      }],
    });
    expect(recordQuery.limit).toHaveBeenCalledWith(3);
    expect(createSignedImageUrlMap).toHaveBeenCalledWith(expect.anything(), ["user/record/photo.webp", "user/record/missing.webp"]);
  });
});
