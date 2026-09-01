import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  listRecipePageData,
  listRecipeSummaries,
  mapRecipeSearchRow,
  parseRecipeSearchNutrition,
  parseRecipeSearchTags,
} from "@/features/recipes/queries";

function createSupabaseForList(options?: {
  authUser?: { id: string } | null;
  rpcResult?: { data: unknown; error: { message: string } | null };
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.authUser ?? { id: "11111111-1111-4111-8111-111111111111" } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue(options?.rpcResult ?? { data: [], error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  };
}

function createSupabaseForPageData() {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
    error: null,
  });
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  const from = vi.fn((table: string) => {
    const rows = table === "categories"
      ? [{ id: "category-1", name: "家常菜" }]
      : [{ id: "tag-1", name: "快手" }];
    const result = Promise.resolve({ data: rows, error: null });
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: result.then.bind(result),
      catch: result.catch.bind(result),
      finally: result.finally.bind(result),
    };
    return builder;
  });

  return {
    client: {
      auth: { getUser },
      rpc,
      from,
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      },
    },
    getUser,
  };
}

describe("recipe query view mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps numeric servings usable and maps private cover paths to signed URLs", () => {
    const summary = mapRecipeSearchRow(
      {
        recipe_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "番茄炒蛋",
        description: null,
        cover_path: "111/recipes/a/cover.webp",
        base_servings: 2,
        prep_minutes: null,
        cook_minutes: 10,
        is_favorite: true,
        category_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        category_name: "家常菜",
        tags: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "快手" }],
        nutrition: {
          caloriesKcal: 320,
          proteinGrams: 28,
          fatGrams: null,
          carbsGrams: null,
          isEstimated: true,
        },
        preparation_count: 0,
        max_lead_time_minutes: null,
        updated_at: "2026-08-23T00:00:00.000Z",
        total_count: 1,
      },
      { "111/recipes/a/cover.webp": "https://signed.test/cover" },
    );

    expect(summary).toMatchObject({
      title: "番茄炒蛋",
      baseServings: 2,
      coverUrl: "https://signed.test/cover",
      category: { name: "家常菜" },
      tags: [{ name: "快手" }],
      nutrition: { caloriesKcal: 320, proteinGrams: 28, isEstimated: true },
    });
  });

  it("ignores malformed nutrition JSON and keeps partial values", () => {
    const summary = mapRecipeSearchRow(
      {
        recipe_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "番茄炒蛋",
        description: null,
        cover_path: null,
        base_servings: 2,
        prep_minutes: null,
        cook_minutes: null,
        is_favorite: false,
        category_id: null,
        category_name: null,
        tags: [],
        nutrition: { caloriesKcal: "320", proteinGrams: 28, isEstimated: true },
        preparation_count: 0,
        max_lead_time_minutes: null,
        updated_at: "2026-08-23T00:00:00.000Z",
        total_count: 1,
      },
      {},
    );

    expect(summary.nutrition).toMatchObject({ caloriesKcal: null, proteinGrams: 28, isEstimated: true });
    expect(parseRecipeSearchNutrition({ caloriesKcal: 120, proteinGrams: null, fatGrams: null, carbsGrams: null, isEstimated: false })).toMatchObject({
      caloriesKcal: 120,
      isEstimated: false,
    });
  });

  it("ignores malformed JSON tags instead of exposing arbitrary values", () => {
    expect(parseRecipeSearchTags(["invalid", { id: 1, name: "bad" }])).toEqual([]);
  });

  it("keeps the existing recipe list failure message stable", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      createSupabaseForList({
        rpcResult: {
          data: null,
          error: { message: "search exploded" },
        },
      }),
    );

    await expect(
      listRecipeSummaries({
        page: 1,
        query: "",
        categoryId: null,
        tagId: null,
        favoriteOnly: false,
        deletedOnly: false,
      }),
    ).rejects.toThrow("菜谱列表暂时无法加载");
  });

  it("loads list results and taxonomy through one authenticated client", async () => {
    const { client, getUser } = createSupabaseForPageData();
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      listRecipePageData({
        page: 1,
        query: "",
        categoryId: null,
        tagId: null,
        favoriteOnly: false,
        deletedOnly: false,
      }),
    ).resolves.toEqual({
      items: [],
      totalCount: 0,
      categories: [{ id: "category-1", name: "家常菜" }],
      tags: [{ id: "tag-1", name: "快手" }],
    });

    expect(getUser).toHaveBeenCalledTimes(1);
  });
});
