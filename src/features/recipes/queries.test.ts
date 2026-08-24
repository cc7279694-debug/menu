import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  listRecipeSummaries,
  mapRecipeSearchRow,
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
});
