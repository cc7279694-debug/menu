import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import {
  getActiveShoppingList,
  getShoppingGenerationRecipes,
  searchShoppingRecipeOptions,
} from "@/features/shopping/queries";

type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;

function createThenableQuery<T>(result: Awaited<QueryResult<T>>) {
  const promise = Promise.resolve(result);
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return builder;
}

function createSupabase(options: {
  auth?: { data: { user: { id: string } | null }; error: { message: string } | null };
  rpcResult?: { data: unknown; error: { message: string } | null };
  tables?: Record<string, () => unknown>;
  signedUrls?: Record<string, string | null>;
}) {
  const storage = {
    createSignedUrls: vi.fn((paths: string[]) =>
      Promise.resolve({
        data: paths.map((path) => ({ path, signedUrl: options.signedUrls?.[path] ?? null })),
        error: null,
      }),
    ),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        options.auth ?? {
          data: { user: { id: USER_ID } },
          error: null,
        },
      ),
    },
    rpc: vi.fn().mockResolvedValue(
      options.rpcResult ?? {
        data: [],
        error: null,
      },
    ),
    from: vi.fn((table: string) => {
      const factory = options.tables?.[table];
      if (!factory) {
        throw new Error(`unexpected table: ${table}`);
      }
      return factory();
    }),
    storage: {
      from: vi.fn(() => storage),
    },
  };
}

describe("shopping queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches active owned recipe options through the shared RPC and caps results at 24", async () => {
    const supabase = createSupabase({
      rpcResult: {
        data: [
          {
            recipe_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            title: "番茄炒蛋",
            description: null,
            cover_path: "covers/recipe-a.webp",
            base_servings: 2,
            prep_minutes: null,
            cook_minutes: 10,
            is_favorite: false,
            category_id: null,
            category_name: null,
            tags: [],
            updated_at: "2026-08-24T00:00:00.000Z",
            total_count: 1,
          },
        ],
        error: null,
      },
      signedUrls: {
        "covers/recipe-a.webp": "https://signed.test/recipe-a",
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(searchShoppingRecipeOptions("番茄")).resolves.toEqual([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "番茄炒蛋",
        coverUrl: "https://signed.test/recipe-a",
        baseServings: 2,
      },
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith("search_recipe_summaries", {
      p_query: "番茄",
      p_category_id: null,
      p_tag_id: null,
      p_favorite_only: false,
      p_deleted_only: false,
      p_limit: 24,
      p_offset: 0,
    });
  });

  it("maps generation recipes in caller order with ingredient snapshots and source sort orders", async () => {
    const recipesQuery = createThenableQuery({
      data: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          title: "青椒土豆丝",
          base_servings: 3,
        },
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "番茄炒蛋",
          base_servings: 2,
        },
      ],
      error: null,
    });
    const recipeIngredientsQuery = createThenableQuery({
      data: [
        {
          id: "ri-2",
          recipe_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          ingredient_id: "ing-2",
          quantity: 2,
          quantity_text: null,
          unit: "个",
          sort_order: 1,
        },
        {
          id: "ri-3",
          recipe_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          ingredient_id: "ing-3",
          quantity: null,
          quantity_text: "少许",
          unit: null,
          sort_order: 1,
        },
        {
          id: "ri-1",
          recipe_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          ingredient_id: "ing-1",
          quantity: 3,
          quantity_text: null,
          unit: "个",
          sort_order: 0,
        },
      ],
      error: null,
    });
    const ingredientsQuery = createThenableQuery({
      data: [
        { id: "ing-1", display_name: "鸡蛋", default_aisle: "蛋奶" },
        { id: "ing-2", display_name: "土豆", default_aisle: "蔬菜" },
        { id: "ing-3", display_name: "盐", default_aisle: "调料" },
      ],
      error: null,
    });
    const supabase = createSupabase({
      tables: {
        recipes: () => recipesQuery,
        recipe_ingredients: () => recipeIngredientsQuery,
        ingredients: () => ingredientsQuery,
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(
      getShoppingGenerationRecipes([
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ]),
    ).resolves.toEqual([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "青椒土豆丝",
        baseServings: 3,
        ingredients: [
          {
            recipeIngredientId: "ri-2",
            ingredientId: "ing-2",
            name: "土豆",
            quantity: 2,
            quantityText: null,
            unit: "个",
            aisle: "蔬菜",
            sortOrder: 1,
          },
        ],
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "番茄炒蛋",
        baseServings: 2,
        ingredients: [
          {
            recipeIngredientId: "ri-1",
            ingredientId: "ing-1",
            name: "鸡蛋",
            quantity: 3,
            quantityText: null,
            unit: "个",
            aisle: "蛋奶",
            sortOrder: 0,
          },
          {
            recipeIngredientId: "ri-3",
            ingredientId: "ing-3",
            name: "盐",
            quantity: null,
            quantityText: "少许",
            unit: null,
            aisle: "调料",
            sortOrder: 1,
          },
        ],
      },
    ]);
  });

  it.each([
    {
      name: "missing recipe ids",
      recipeIds: [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ],
      recipes: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "番茄炒蛋",
          base_servings: 2,
        },
      ],
    },
    {
      name: "duplicate recipe ids",
      recipeIds: [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ],
      recipes: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "番茄炒蛋",
          base_servings: 2,
        },
      ],
    },
    {
      name: "foreign or deleted recipe ids",
      recipeIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      recipes: [],
    },
  ])("rejects $name with a stable invalid-selection message", async ({ recipeIds, recipes }) => {
    const supabase = createSupabase({
      tables: {
        recipes: () =>
          createThenableQuery({
            data: recipes,
            error: null,
          }),
        recipe_ingredients: () =>
          createThenableQuery({
            data: [],
            error: null,
          }),
        ingredients: () =>
          createThenableQuery({
            data: [],
            error: null,
          }),
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(getShoppingGenerationRecipes(recipeIds)).rejects.toThrow(
      "所选菜谱已失效，请重新选择",
    );
  });

  it("maps the active list with deterministic source, item, and contribution ordering", async () => {
    const supabase = createSupabase({
      tables: {
        shopping_lists: () =>
          createThenableQuery({
            data: {
              id: "list-1",
              name: "本周采购",
              is_active: true,
              updated_at: "2026-08-24T09:00:00.000Z",
            },
            error: null,
          }),
        shopping_list_sources: () =>
          createThenableQuery({
            data: [
              {
                id: "source-b",
                shopping_list_id: "list-1",
                recipe_id: null,
                recipe_title_snapshot: "失效菜谱快照",
                selected_servings: 4,
                created_at: "2026-08-24T08:00:01.000Z",
              },
              {
                id: "source-a",
                shopping_list_id: "list-1",
                recipe_id: "recipe-a",
                recipe_title_snapshot: "番茄炒蛋",
                selected_servings: 2,
                created_at: "2026-08-24T08:00:00.000Z",
              },
            ],
            error: null,
          }),
        shopping_list_items: () =>
          createThenableQuery({
            data: [
              {
                id: "item-b",
                shopping_list_id: "list-1",
                ingredient_id: null,
                name_snapshot: "手写备注",
                quantity: null,
                quantity_text: "适量",
                unit: null,
                aisle: null,
                is_checked: true,
                is_manual: true,
                sort_order: 1,
              },
              {
                id: "item-a",
                shopping_list_id: "list-1",
                ingredient_id: "ing-1",
                name_snapshot: "鸡蛋",
                quantity: 4,
                quantity_text: null,
                unit: "个",
                aisle: "蛋奶",
                is_checked: false,
                is_manual: false,
                sort_order: 0,
              },
            ],
            error: null,
          }),
        shopping_list_item_sources: () =>
          createThenableQuery({
            data: [
              {
                id: "item-source-b",
                shopping_list_item_id: "item-a",
                shopping_list_source_id: "source-b",
                recipe_ingredient_id: null,
                quantity_contribution: 1,
                quantity_text_contribution: null,
                unit_snapshot: "个",
                created_at: "2026-08-24T08:00:02.000Z",
              },
              {
                id: "item-source-a",
                shopping_list_item_id: "item-a",
                shopping_list_source_id: "source-a",
                recipe_ingredient_id: "ri-1",
                quantity_contribution: 3,
                quantity_text_contribution: null,
                unit_snapshot: "个",
                created_at: "2026-08-24T08:00:00.000Z",
              },
            ],
            error: null,
          }),
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(getActiveShoppingList()).resolves.toEqual({
      id: "list-1",
      name: "本周采购",
      updatedAt: "2026-08-24T09:00:00.000Z",
      sources: [
        {
          id: "source-a",
          recipeId: "recipe-a",
          recipeTitleSnapshot: "番茄炒蛋",
          selectedServings: 2,
        },
        {
          id: "source-b",
          recipeId: null,
          recipeTitleSnapshot: "失效菜谱快照",
          selectedServings: 4,
        },
      ],
      items: [
        {
          id: "item-a",
          ingredientId: "ing-1",
          nameSnapshot: "鸡蛋",
          quantity: 4,
          quantityText: null,
          unit: "个",
          aisle: "蛋奶",
          isChecked: false,
          isManual: false,
          sortOrder: 0,
          sources: [
            {
              id: "item-source-a",
              shoppingListSourceId: "source-a",
              recipeId: "recipe-a",
              recipeTitleSnapshot: "番茄炒蛋",
              selectedServings: 2,
              recipeIngredientId: "ri-1",
              quantityContribution: 3,
              quantityTextContribution: null,
              unitSnapshot: "个",
            },
            {
              id: "item-source-b",
              shoppingListSourceId: "source-b",
              recipeId: null,
              recipeTitleSnapshot: "失效菜谱快照",
              selectedServings: 4,
              recipeIngredientId: null,
              quantityContribution: 1,
              quantityTextContribution: null,
              unitSnapshot: "个",
            },
          ],
        },
        {
          id: "item-b",
          ingredientId: null,
          nameSnapshot: "手写备注",
          quantity: null,
          quantityText: "适量",
          unit: null,
          aisle: null,
          isChecked: true,
          isManual: true,
          sortOrder: 1,
          sources: [],
        },
      ],
    });
  });

  it("returns null when the current user has no active shopping list", async () => {
    const supabase = createSupabase({
      tables: {
        shopping_lists: () =>
          createThenableQuery({
            data: null,
            error: null,
          }),
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(getActiveShoppingList()).resolves.toBeNull();
  });

  it("returns stable Chinese messages for raw query failures", async () => {
    mocks.createServerSupabaseClient
      .mockResolvedValueOnce(
        createSupabase({
          rpcResult: {
            data: null,
            error: { message: "search_recipe_summaries exploded" },
          },
        }),
      )
      .mockResolvedValueOnce(
        createSupabase({
          tables: {
            recipes: () =>
              createThenableQuery({
                data: null,
                error: { message: "recipes select exploded" },
              }),
          },
        }),
      )
      .mockResolvedValueOnce(
        createSupabase({
          tables: {
            shopping_lists: () =>
              createThenableQuery({
                data: null,
                error: { message: "shopping_lists select exploded" },
              }),
          },
        }),
      );

    await expect(searchShoppingRecipeOptions("蛋")).rejects.toThrow("菜谱选项暂时无法加载");
    await expect(
      getShoppingGenerationRecipes(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]),
    ).rejects.toThrow("所选菜谱暂时无法加载");
    await expect(getActiveShoppingList()).rejects.toThrow("购物清单暂时无法加载");
  });
});
