import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerAuthContext: vi.fn(),
  listRecipePageData: vi.fn(),
  getRecipeDetail: vi.fn(),
  getRecipeCookingHistory: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server-auth", () => ({ getServerAuthContext: mocks.getServerAuthContext }));
vi.mock("@/features/recipes/queries", () => ({
  listRecipePageData: mocks.listRecipePageData,
  getRecipeDetail: mocks.getRecipeDetail,
}));
vi.mock("@/features/cooking-history/queries", () => ({ getRecipeCookingHistory: mocks.getRecipeCookingHistory }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }));

import { loadRecipeDetailAction, loadRecipeListAction } from "./actions";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECIPE_ID = "22222222-2222-4222-8222-222222222222";
const query = { query: "", categoryId: null, tagId: null, favoriteOnly: false, deletedOnly: false, page: 1 } as const;

describe("recipe read actions", () => {
  it("returns list data with the authenticated owner for local caching", async () => {
    mocks.getServerAuthContext.mockResolvedValue({ user: { id: USER_ID }, error: null });
    const pageData = { items: [], totalCount: 0, categories: [], tags: [] };
    mocks.listRecipePageData.mockResolvedValue(pageData);

    await expect(loadRecipeListAction(query)).resolves.toEqual({
      ok: true,
      data: { ...pageData, userId: USER_ID },
    });
  });

  it("returns a recoverable error instead of leaking server failures", async () => {
    mocks.getServerAuthContext.mockResolvedValue({ user: { id: USER_ID }, error: null });
    mocks.listRecipePageData.mockRejectedValue(new Error("database unavailable"));

    await expect(loadRecipeListAction(query)).resolves.toEqual({
      ok: false,
      message: "菜谱列表暂时无法加载",
    });
  });

  it("combines detail and cooking history for the background refresh", async () => {
    mocks.getServerAuthContext.mockResolvedValue({ user: { id: USER_ID }, error: null });
    const recipe = { id: RECIPE_ID, title: "番茄炒蛋" };
    const cookingHistory = { stats: { totalCount: 0, ratedCount: 0, averageRating: null, latestImprovementNotes: null }, recentRecords: [] };
    mocks.getRecipeDetail.mockResolvedValue(recipe);
    mocks.getRecipeCookingHistory.mockResolvedValue(cookingHistory);

    await expect(loadRecipeDetailAction(RECIPE_ID)).resolves.toEqual({
      ok: true,
      data: { recipe, cookingHistory, userId: USER_ID },
    });
  });
});
