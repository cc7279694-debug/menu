import { beforeEach, describe, expect, it, vi } from "vitest";
import * as shoppingActions from "@/features/shopping/actions";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECIPE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RECIPE_INGREDIENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_RECIPE_INGREDIENT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const LIST_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ITEM_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const OTHER_ITEM_ID = "99999999-9999-4999-8999-999999999999";
const INGREDIENT_ID = "88888888-8888-4888-8888-888888888888";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
  searchShoppingRecipeOptions: vi.fn(),
  getShoppingGenerationRecipes: vi.fn(),
  getActiveShoppingList: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/features/shopping/queries", () => ({
  searchShoppingRecipeOptions: mocks.searchShoppingRecipeOptions,
  getShoppingGenerationRecipes: mocks.getShoppingGenerationRecipes,
  getActiveShoppingList: mocks.getActiveShoppingList,
}));

import {
  clearCompletedShoppingItemsAction,
  deleteShoppingItemAction,
  generateShoppingListAction,
  previewShoppingListAction,
  reorderShoppingItemsAction,
  saveShoppingItemAction,
  searchShoppingRecipesAction,
  setShoppingItemCheckedAction,
} from "@/features/shopping/actions";

type QueryResult<T> = { data: T; error: { message: string; code?: string } | null };

function createBuilder<T>(result: QueryResult<T>) {
  const promise = Promise.resolve(result);
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return builder;
}

function createSupabase(options: {
  auth?: { data: { user: { id: string } | null }; error: { message: string } | null };
  rpcResult?: QueryResult<unknown>;
  tables?: Record<string, () => unknown>;
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        options.auth ?? {
          data: { user: { id: USER_ID } },
          error: null,
        },
      ),
    },
    rpc: vi.fn().mockResolvedValue(options.rpcResult ?? { data: LIST_ID, error: null }),
    from: vi.fn((table: string) => {
      const factory = options.tables?.[table];
      if (!factory) {
        throw new Error(`unexpected table: ${table}`);
      }
      return factory();
    }),
  };
}

function generationInput(overrides: Record<string, unknown> = {}) {
  return {
    selections: [{ recipeId: RECIPE_ID, selectedServings: 4 }],
    excludedRecipeIngredientIds: [],
    ...overrides,
  };
}

function itemInput(overrides: Record<string, unknown> = {}) {
  return {
    shoppingListId: LIST_ID,
    itemId: null,
    nameSnapshot: " 番茄 ",
    quantity: 2,
    quantityText: null,
    unit: " 个 ",
    aisle: " 蔬菜 ",
    ...overrides,
  };
}

function generationRecipes() {
  return [
    {
      id: RECIPE_ID,
      title: "番茄炒蛋",
      baseServings: 2,
      ingredients: [
        {
          recipeIngredientId: RECIPE_INGREDIENT_ID,
          ingredientId: INGREDIENT_ID,
          name: "番茄",
          quantity: 2,
          quantityText: null,
          unit: "个",
          aisle: "蔬菜",
          sortOrder: 0,
        },
        {
          recipeIngredientId: OTHER_RECIPE_INGREDIENT_ID,
          ingredientId: null,
          name: "盐",
          quantity: null,
          quantityText: "少许",
          unit: null,
          aisle: "调料",
          sortOrder: 1,
        },
      ],
    },
  ];
}

function activeListBuilder(data: { id: string } | null = { id: LIST_ID }) {
  return createBuilder({ data, error: null });
}

const activeShoppingList = {
  id: LIST_ID,
  name: "本周采购",
  updatedAt: "2026-08-27T08:00:00.000Z",
  sources: [],
  items: [],
};

function getActiveShoppingListForSyncAction() {
  const action = (shoppingActions as unknown as {
    getActiveShoppingListForSyncAction?: () => ReturnType<typeof Promise.resolve>;
  }).getActiveShoppingListForSyncAction;
  if (!action) throw new Error("getActiveShoppingListForSyncAction is missing");
  return action();
}

describe("shopping actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("validates search input before delegation and trims valid queries to 80 characters", async () => {
    await expect(searchShoppingRecipesAction(123)).resolves.toEqual({
      ok: false,
      message: "请求参数无效",
    });
    expect(mocks.searchShoppingRecipeOptions).not.toHaveBeenCalled();
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();

    mocks.searchShoppingRecipeOptions.mockResolvedValue([
      { id: RECIPE_ID, title: "番茄炒蛋", coverUrl: null, baseServings: 2 },
    ]);

    await expect(searchShoppingRecipesAction(`  ${"番".repeat(100)}  `)).resolves.toEqual({
      ok: true,
      data: [{ id: RECIPE_ID, title: "番茄炒蛋", coverUrl: null, baseServings: 2 }],
    });
    expect(mocks.searchShoppingRecipeOptions).toHaveBeenCalledWith("番".repeat(80));
  });

  it("returns stable unauthenticated and query failure messages for recipe search", async () => {
    mocks.searchShoppingRecipeOptions.mockRejectedValueOnce(new Error("需要登录后才能访问菜谱"));
    await expect(searchShoppingRecipesAction("蛋")).resolves.toEqual({
      ok: false,
      message: "请先登录后再搜索菜谱",
    });

    mocks.searchShoppingRecipeOptions.mockRejectedValueOnce(new Error("raw database error"));
    await expect(searchShoppingRecipesAction("蛋")).resolves.toEqual({
      ok: false,
      message: "菜谱选项暂时无法加载",
    });
  });

  it("previews from server-fetched recipes, ignores client drafts, and performs no writes", async () => {
    mocks.getShoppingGenerationRecipes.mockResolvedValue(generationRecipes());

    await expect(
      previewShoppingListAction({
        ...generationInput(),
        contributions: [{ nameSnapshot: "客户端伪造食材" }],
        items: [{ nameSnapshot: "客户端伪造清单项" }],
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        contributions: [
          expect.objectContaining({
            recipeIngredientId: RECIPE_INGREDIENT_ID,
            nameSnapshot: "番茄",
            quantity: 4,
          }),
          expect.objectContaining({
            recipeIngredientId: OTHER_RECIPE_INGREDIENT_ID,
            nameSnapshot: "盐",
            quantityText: "少许",
          }),
        ],
        items: [
          expect.objectContaining({
            ingredientId: null,
            nameSnapshot: "盐",
            quantityText: "少许",
          }),
          expect.objectContaining({
            ingredientId: INGREDIENT_ID,
            nameSnapshot: "番茄",
            quantity: 4,
          }),
        ],
      },
    });
    expect(mocks.getShoppingGenerationRecipes).toHaveBeenCalledWith([RECIPE_ID]);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not load recipes when generation input is invalid", async () => {
    await expect(
      previewShoppingListAction({ selections: [], excludedRecipeIngredientIds: [] }),
    ).resolves.toMatchObject({
      ok: false,
      message: "请检查购物清单生成信息",
    });
    await expect(
      generateShoppingListAction({ selections: [], excludedRecipeIngredientIds: [] }),
    ).resolves.toMatchObject({
      ok: false,
      message: "请检查购物清单生成信息",
    });
    expect(mocks.getShoppingGenerationRecipes).not.toHaveBeenCalled();
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("generates a server-built RPC snapshot with UUIDs and revalidates only after success", async () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce(LIST_ID)
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000000")
      .mockReturnValueOnce("20000000-0000-4000-8000-000000000000")
      .mockReturnValueOnce("30000000-0000-4000-8000-000000000000")
      .mockReturnValueOnce("40000000-0000-4000-8000-000000000000")
      .mockReturnValueOnce("50000000-0000-4000-8000-000000000000");
    const supabase = createSupabase();
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    mocks.getShoppingGenerationRecipes.mockResolvedValue(generationRecipes());

    await expect(
      generateShoppingListAction({
        ...generationInput(),
        items: [{ id: "client-item", nameSnapshot: "客户端伪造食材" }],
      }),
    ).resolves.toEqual({
      ok: true,
      data: { shoppingListId: LIST_ID },
    });

    expect(mocks.getShoppingGenerationRecipes).toHaveBeenCalledWith([RECIPE_ID]);
    expect(supabase.rpc).toHaveBeenCalledWith("replace_active_shopping_list", {
      p_payload: {
        listId: LIST_ID,
        name: "当前购物清单",
        sources: [
          {
            id: "10000000-0000-4000-8000-000000000000",
            recipeId: RECIPE_ID,
            recipeTitleSnapshot: "番茄炒蛋",
            selectedServings: 4,
          },
        ],
        items: [
          {
            id: "20000000-0000-4000-8000-000000000000",
            ingredientId: null,
            nameSnapshot: "盐",
            quantity: null,
            quantityText: "少许",
            unit: null,
            aisle: "调料",
            isChecked: false,
            isManual: false,
            sortOrder: 0,
          },
          {
            id: "30000000-0000-4000-8000-000000000000",
            ingredientId: INGREDIENT_ID,
            nameSnapshot: "番茄",
            quantity: 4,
            quantityText: null,
            unit: "个",
            aisle: "蔬菜",
            isChecked: false,
            isManual: false,
            sortOrder: 1,
          },
        ],
        itemSources: [
          {
            id: "40000000-0000-4000-8000-000000000000",
            shoppingListItemId: "20000000-0000-4000-8000-000000000000",
            shoppingListSourceId: "10000000-0000-4000-8000-000000000000",
            recipeIngredientId: OTHER_RECIPE_INGREDIENT_ID,
            quantityContribution: null,
            quantityTextContribution: "少许",
            unitSnapshot: null,
          },
          {
            id: "50000000-0000-4000-8000-000000000000",
            shoppingListItemId: "30000000-0000-4000-8000-000000000000",
            shoppingListSourceId: "10000000-0000-4000-8000-000000000000",
            recipeIngredientId: RECIPE_INGREDIENT_ID,
            quantityContribution: 4,
            quantityTextContribution: null,
            unitSnapshot: "个",
          },
        ],
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shopping");
    randomUUID.mockRestore();
  });

  it("rejects empty generated results and RPC rollback failures without revalidation", async () => {
    mocks.getShoppingGenerationRecipes.mockResolvedValueOnce(generationRecipes());
    await expect(
      generateShoppingListAction(generationInput({
        excludedRecipeIngredientIds: [RECIPE_INGREDIENT_ID, OTHER_RECIPE_INGREDIENT_ID],
      })),
    ).resolves.toEqual({
      ok: false,
      message: "请至少保留一项需要购买的食材",
    });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();

    const supabase = createSupabase({
      rpcResult: { data: null, error: { message: "violates foreign key" } },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);
    mocks.getShoppingGenerationRecipes.mockResolvedValueOnce(generationRecipes());
    await expect(generateShoppingListAction(generationInput())).resolves.toEqual({
      ok: false,
      message: "购物清单生成失败，请稍后重试",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["save", () => saveShoppingItemAction(itemInput({ shoppingListId: "bad" }))],
    ["delete", () => deleteShoppingItemAction({ shoppingListId: LIST_ID, itemId: "bad" })],
    ["clear", () => clearCompletedShoppingItemsAction({ shoppingListId: "bad" })],
    ["reorder", () => reorderShoppingItemsAction({ shoppingListId: LIST_ID, itemIds: [ITEM_ID, ITEM_ID] })],
  ])("rejects invalid %s mutation input before Supabase", async (_name, action) => {
    await expect(action()).resolves.toEqual({
      ok: false,
      message: "请求参数无效",
    });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns a machine-readable invalid-input result for a shopping toggle", async () => {
    await expect(
      setShoppingItemCheckedAction({ shoppingListId: LIST_ID, itemId: "bad", isChecked: true }),
    ).resolves.toEqual({ ok: false, code: "INVALID_INPUT", message: "请求参数无效" });
  });

  it.each([
    ["save", () => saveShoppingItemAction(itemInput())],
    ["delete", () => deleteShoppingItemAction({ shoppingListId: LIST_ID, itemId: ITEM_ID })],
    ["clear", () => clearCompletedShoppingItemsAction({ shoppingListId: LIST_ID })],
    ["reorder", () => reorderShoppingItemsAction({ shoppingListId: LIST_ID, itemIds: [ITEM_ID] })],
  ])("returns stable unauthenticated result for %s mutation", async (_name, action) => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      createSupabase({ auth: { data: { user: null }, error: null } }),
    );

    await expect(action()).resolves.toEqual({
      ok: false,
      message: "请先登录后再操作购物清单",
    });
  });

  it("returns a machine-readable authentication result for a shopping toggle", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      createSupabase({ auth: { data: { user: null }, error: null } }),
    );

    await expect(
      setShoppingItemCheckedAction({ shoppingListId: LIST_ID, itemId: ITEM_ID, isChecked: true }),
    ).resolves.toEqual({ ok: false, code: "AUTH_REQUIRED", message: "请先登录后再操作购物清单" });
  });

  it("creates a manual item on the owned active list with the next sort order", async () => {
    const active = activeListBuilder();
    const lastSort = createBuilder({ data: { sort_order: 4 }, error: null });
    const insert = createBuilder({ data: { id: ITEM_ID }, error: null });
    const supabase = createSupabase({
      tables: {
        shopping_lists: () => active,
        shopping_list_items: vi.fn()
          .mockReturnValueOnce(lastSort)
          .mockReturnValueOnce(insert),
      },
    });
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(ITEM_ID);
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(saveShoppingItemAction(itemInput())).resolves.toEqual({
      ok: true,
      data: { itemId: ITEM_ID },
    });

    expect(active.select).toHaveBeenCalledWith("id");
    expect(active.eq).toHaveBeenCalledWith("id", LIST_ID);
    expect(active.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(active.eq).toHaveBeenCalledWith("is_active", true);
    expect(insert.insert).toHaveBeenCalledWith({
      id: ITEM_ID,
      user_id: USER_ID,
      shopping_list_id: LIST_ID,
      ingredient_id: null,
      name_snapshot: "番茄",
      quantity: 2,
      quantity_text: null,
      unit: "个",
      aisle: "蔬菜",
      is_checked: false,
      is_manual: true,
      sort_order: 5,
    });
    expect(insert.select).toHaveBeenCalledWith("id");
    expect(insert.maybeSingle).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shopping");
  });

  it("updates an existing item without changing manual state or source links", async () => {
    const active = activeListBuilder();
    const update = createBuilder({ data: { id: ITEM_ID }, error: null });
    const supabase = createSupabase({
      tables: {
        shopping_lists: () => active,
        shopping_list_items: () => update,
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(saveShoppingItemAction(itemInput({ itemId: ITEM_ID, aisle: null }))).resolves.toEqual({
      ok: true,
      data: { itemId: ITEM_ID },
    });

    expect(update.update).toHaveBeenCalledWith({
      name_snapshot: "番茄",
      quantity: 2,
      quantity_text: null,
      unit: "个",
      aisle: null,
    });
    expect(supabase.from).not.toHaveBeenCalledWith("shopping_list_item_sources");
    expect(update.select).toHaveBeenCalledWith("id");
    expect(update.maybeSingle).toHaveBeenCalled();
  });

  it("blocks mutations when the target list is not the current user's active list", async () => {
    const active = activeListBuilder(null);
    const update = createBuilder({ data: { id: ITEM_ID }, error: null });
    const supabase = createSupabase({
      tables: {
        shopping_lists: () => active,
        shopping_list_items: () => update,
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(
      setShoppingItemCheckedAction({ shoppingListId: LIST_ID, itemId: ITEM_ID, isChecked: true }),
    ).resolves.toEqual({
      ok: false,
      code: "STALE_TARGET",
      message: "购物清单已失效，请刷新后重试",
    });
    expect(update.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("checks, deletes, clears completed items, and validates affected rows before revalidation", async () => {
    const checked = createBuilder({
      data: { id: ITEM_ID, is_checked: true, updated_at: "2026-08-27T08:00:00.000Z" },
      error: null,
    });
    const deleteItem = createBuilder({ data: { id: ITEM_ID }, error: null });
    const clearItems = createBuilder({ data: [{ id: ITEM_ID }], error: null });
    const supabase = createSupabase({
      tables: {
        shopping_lists: () => activeListBuilder(),
        shopping_list_items: vi.fn()
          .mockReturnValueOnce(checked)
          .mockReturnValueOnce(deleteItem)
          .mockReturnValueOnce(clearItems),
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(
      setShoppingItemCheckedAction({ shoppingListId: LIST_ID, itemId: ITEM_ID, isChecked: true }),
    ).resolves.toEqual({
      ok: true,
      data: { itemId: ITEM_ID, isChecked: true, updatedAt: "2026-08-27T08:00:00.000Z" },
    });
    expect(checked.update).toHaveBeenCalledWith({ is_checked: true });
    expect(checked.select).toHaveBeenCalledWith("id, is_checked, updated_at");
    expect(checked.maybeSingle).toHaveBeenCalled();

    await expect(deleteShoppingItemAction({ shoppingListId: LIST_ID, itemId: ITEM_ID })).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(deleteItem.delete).toHaveBeenCalled();
    expect(deleteItem.select).toHaveBeenCalledWith("id");
    expect(deleteItem.maybeSingle).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalledWith("shopping_list_item_sources");

    await expect(clearCompletedShoppingItemsAction({ shoppingListId: LIST_ID })).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(clearItems.delete).toHaveBeenCalled();
    expect(clearItems.eq).toHaveBeenCalledWith("is_checked", true);
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(3);
  });

  it("does not delete source snapshots before a failed parent item delete", async () => {
    const sourceDelete = createBuilder({ data: [], error: null });
    const deleteItem = createBuilder({ data: null, error: null });
    const supabase = createSupabase({
      tables: {
        shopping_lists: () => activeListBuilder(),
        shopping_list_items: () => deleteItem,
        shopping_list_item_sources: () => sourceDelete,
      },
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    await expect(deleteShoppingItemAction({ shoppingListId: LIST_ID, itemId: ITEM_ID })).resolves.toEqual({
      ok: false,
      message: "购物清单删除失败，请刷新后重试",
    });

    expect(deleteItem.delete).toHaveBeenCalled();
    expect(deleteItem.select).toHaveBeenCalledWith("id");
    expect(deleteItem.maybeSingle).toHaveBeenCalled();
    expect(sourceDelete.delete).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalledWith("shopping_list_item_sources");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("delegates reorder to the validated RPC and hides raw rollback errors", async () => {
    const successSupabase = createSupabase({
      tables: { shopping_lists: () => activeListBuilder() },
    });
    mocks.createServerSupabaseClient.mockResolvedValueOnce(successSupabase);

    await expect(
      reorderShoppingItemsAction({ shoppingListId: LIST_ID, itemIds: [OTHER_ITEM_ID, ITEM_ID] }),
    ).resolves.toEqual({ ok: true, data: null });
    expect(successSupabase.rpc).toHaveBeenCalledWith("reorder_shopping_items", {
      p_shopping_list_id: LIST_ID,
      p_item_ids: [OTHER_ITEM_ID, ITEM_ID],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/shopping");

    const failureSupabase = createSupabase({
      rpcResult: { data: null, error: { message: "item order must contain each item exactly once" } },
      tables: { shopping_lists: () => activeListBuilder() },
    });
    mocks.createServerSupabaseClient.mockResolvedValueOnce(failureSupabase);

    await expect(reorderShoppingItemsAction({ shoppingListId: LIST_ID, itemIds: [ITEM_ID] })).resolves.toEqual({
      ok: false,
      message: "购物清单排序失败，请刷新后重试",
    });
  });

  it("returns the authenticated active shopping list for synchronization", async () => {
    mocks.getActiveShoppingList.mockResolvedValue(activeShoppingList);

    await expect(getActiveShoppingListForSyncAction()).resolves.toEqual({
      ok: true,
      data: activeShoppingList,
    });
  });

  it("returns stable machine-readable errors when synchronization refresh is unauthenticated or fails", async () => {
    mocks.getActiveShoppingList.mockRejectedValueOnce(new Error("请先登录后再查看购物清单"));
    await expect(getActiveShoppingListForSyncAction()).resolves.toEqual({
      ok: false,
      code: "AUTH_REQUIRED",
      message: "请先登录后再获取购物清单",
    });

    mocks.getActiveShoppingList.mockRejectedValueOnce(new Error("raw database error"));
    await expect(getActiveShoppingListForSyncAction()).resolves.toEqual({
      ok: false,
      code: "REQUEST_FAILED",
      message: "购物清单暂时无法刷新",
    });
  });
});
