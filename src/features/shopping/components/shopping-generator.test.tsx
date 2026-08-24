import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";

import type { ShoppingContribution, ShoppingDraftItem, ShoppingRecipeOption } from "@/features/shopping/types";

const { actions, router } = vi.hoisted(() => ({
  actions: {
    generateShoppingListAction: vi.fn(),
    previewShoppingListAction: vi.fn(),
    searchShoppingRecipesAction: vi.fn(),
  },
  router: {
    refresh: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/shopping/actions", () => actions);

import { ShoppingGenerator } from "@/features/shopping/components/shopping-generator";

const recipeAId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recipeBId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const recipeCId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const initialRecipes: ShoppingRecipeOption[] = [
  { id: recipeAId, title: "番茄炒蛋", coverUrl: null, baseServings: 2 },
  { id: recipeBId, title: "番茄牛腩", coverUrl: null, baseServings: 3 },
];

function contribution(overrides: Partial<ShoppingContribution>): ShoppingContribution {
  return {
    recipeId: recipeAId,
    recipeTitleSnapshot: "番茄炒蛋",
    selectedServings: 2,
    recipeOrder: 0,
    recipeIngredientId: "11111111-1111-4111-8111-111111111111",
    ingredientId: "tomato",
    nameSnapshot: "番茄",
    quantity: 2,
    quantityText: null,
    unit: "个",
    normalizedUnit: "个",
    aisle: "蔬菜",
    recipeIngredientOrder: 0,
    isManual: false,
    ...overrides,
  };
}

const previewContributions: ShoppingContribution[] = [
  contribution({
    recipeIngredientId: "11111111-1111-4111-8111-111111111111",
    recipeId: recipeAId,
    recipeTitleSnapshot: "番茄炒蛋",
    recipeOrder: 0,
    quantity: 2,
  }),
  contribution({
    recipeIngredientId: "22222222-2222-4222-8222-222222222222",
    recipeId: recipeBId,
    recipeTitleSnapshot: "番茄牛腩",
    selectedServings: 3,
    recipeOrder: 1,
    quantity: 1,
    recipeIngredientOrder: 0,
  }),
  contribution({
    recipeIngredientId: "33333333-3333-4333-8333-333333333333",
    ingredientId: "salt",
    nameSnapshot: "盐",
    quantity: null,
    quantityText: "少许",
    unit: null,
    normalizedUnit: null,
    aisle: null,
    recipeIngredientOrder: 1,
  }),
  contribution({
    recipeIngredientId: "44444444-4444-4444-8444-444444444444",
    recipeId: recipeBId,
    recipeTitleSnapshot: "番茄牛腩",
    selectedServings: 3,
    recipeOrder: 1,
    ingredientId: "salt",
    nameSnapshot: "盐",
    quantity: 2,
    quantityText: null,
    unit: "g",
    normalizedUnit: "g",
    aisle: "调料",
    recipeIngredientOrder: 1,
  }),
];

function previewItems(): ShoppingDraftItem[] {
  return [
    {
      ingredientId: "tomato",
      nameSnapshot: "番茄",
      quantity: 3,
      quantityText: null,
      unit: "个",
      aisle: "蔬菜",
      isManual: false,
      sortOrder: 0,
      sources: [
        {
          recipeId: recipeAId,
          recipeTitleSnapshot: "番茄炒蛋",
          selectedServings: 2,
          recipeIngredientId: "11111111-1111-4111-8111-111111111111",
          quantityContribution: 2,
          quantityTextContribution: null,
          unitSnapshot: "个",
          aisleSnapshot: "蔬菜",
          recipeOrder: 0,
          recipeIngredientOrder: 0,
        },
        {
          recipeId: recipeBId,
          recipeTitleSnapshot: "番茄牛腩",
          selectedServings: 3,
          recipeIngredientId: "22222222-2222-4222-8222-222222222222",
          quantityContribution: 1,
          quantityTextContribution: null,
          unitSnapshot: "个",
          aisleSnapshot: "蔬菜",
          recipeOrder: 1,
          recipeIngredientOrder: 0,
        },
      ],
    },
  ];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function openGenerator(user = userEvent.setup()) {
  render(<ShoppingGenerator initialRecipes={initialRecipes} />);
  const opener = screen.getByRole("button", { name: "生成购物清单" });
  expect(opener).toHaveClass("min-h-11");
  await user.click(opener);
  return user;
}

describe("ShoppingGenerator", () => {
  beforeEach(() => {
    actions.generateShoppingListAction.mockReset();
    actions.previewShoppingListAction.mockReset();
    actions.searchShoppingRecipesAction.mockReset();
    router.refresh.mockReset();
  });

  it("opens focused on recipe search, preserves selected recipes across search, and validates servings inline", async () => {
    const user = await openGenerator();
    actions.searchShoppingRecipesAction.mockResolvedValue({
      ok: true,
      data: [{ id: recipeCId, title: "冬瓜汤", coverUrl: null, baseServings: 4 }],
    });

    const search = screen.getByRole("searchbox", { name: "搜索菜谱" });
    await waitFor(() => expect(search).toHaveFocus());
    expect(screen.getByRole("button", { name: "搜索" })).toHaveClass("min-h-11");

    await user.click(screen.getByRole("checkbox", { name: /番茄炒蛋/ }));
    const selectedPanel = screen.getByRole("region", { name: "已选菜谱" });
    expect(within(selectedPanel).getByLabelText("番茄炒蛋 目标份数")).toHaveValue(2);

    await user.clear(search);
    await user.type(search, "汤");
    await user.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByRole("checkbox", { name: /冬瓜汤/ })).toBeInTheDocument();
    expect(within(selectedPanel).getByText("番茄炒蛋")).toBeInTheDocument();

    const servings = within(selectedPanel).getByLabelText("番茄炒蛋 目标份数");
    await user.clear(servings);
    await user.type(servings, "0.001");
    expect(screen.getByText("请输入 0.25 到 1000 之间且最多两位小数的份数。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览购物清单" })).toBeDisabled();
  });

  it("limits selections to 20 recipes and keeps the twenty-first recipe disabled", async () => {
    const manyRecipes = Array.from({ length: 21 }, (_, index) => ({
      id: `${String(index + 1).padStart(8, "0")}-aaaa-4aaa-8aaa-${String(index + 1).padStart(12, "0")}`,
      title: `菜谱 ${index + 1}`,
      coverUrl: null,
      baseServings: 2,
    }));
    const user = userEvent.setup();
    render(<ShoppingGenerator initialRecipes={manyRecipes} />);
    await user.click(screen.getByRole("button", { name: "生成购物清单" }));

    for (const recipe of manyRecipes.slice(0, 20)) {
      await user.click(screen.getByRole("checkbox", { name: recipe.title }));
    }

    expect(screen.getByText("最多一次选择 20 道菜。")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "菜谱 21" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "预览购物清单" })).toBeEnabled();
  });

  it("loads preview, separates incompatible rows, and recomputes totals locally when exclusions change", async () => {
    const user = await openGenerator();
    const preview = deferred<{ ok: true; data: { contributions: ShoppingContribution[]; items: ShoppingDraftItem[] } }>();
    actions.previewShoppingListAction.mockReturnValue(preview.promise);

    await user.click(screen.getByRole("checkbox", { name: /番茄炒蛋/ }));
    await user.click(screen.getByRole("checkbox", { name: /番茄牛腩/ }));
    await user.click(screen.getByRole("button", { name: "预览购物清单" }));

    expect(await screen.findByText("预览购物清单中...")).toBeInTheDocument();
    preview.resolve({
      ok: true,
      data: { contributions: previewContributions, items: previewItems() },
    });
    await waitFor(() => expect(screen.queryByText("预览购物清单中...")).not.toBeInTheDocument());
    expect(actions.previewShoppingListAction).toHaveBeenCalledWith({
      selections: [
        { recipeId: recipeAId, selectedServings: 2 },
        { recipeId: recipeBId, selectedServings: 3 },
      ],
      excludedRecipeIngredientIds: [],
    });

    const tomatoRow = screen.getByRole("listitem", { name: /番茄/ });
    expect(within(tomatoRow).getByText("3 个")).toBeInTheDocument();
    expect(within(tomatoRow).getByText("蔬菜")).toBeInTheDocument();
    expect(within(tomatoRow).getByText("番茄炒蛋")).toBeInTheDocument();
    expect(within(tomatoRow).getByText("番茄牛腩")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem", { name: /盐/ })).toHaveLength(2);
    expect(screen.getAllByText("少许").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 g").length).toBeGreaterThan(0);
    expect(screen.getByText("未分类")).toBeInTheDocument();

    const checkboxes = within(tomatoRow).getAllByRole("checkbox", { name: "家里已有，不购买" });
    await user.click(checkboxes[0]);
    expect(actions.previewShoppingListAction).toHaveBeenCalledTimes(1);
    const updatedTomatoRow = screen.getByRole("listitem", { name: /番茄/ });
    expect(within(updatedTomatoRow).getAllByText("1 个").length).toBeGreaterThan(0);
    expect(within(updatedTomatoRow).queryByText("番茄炒蛋")).not.toBeInTheDocument();
    expect(within(updatedTomatoRow).getByText("番茄牛腩")).toBeInTheDocument();
  });

  it("locks recipe choices while preview is pending so stale previews cannot mix with changed inputs", async () => {
    const user = await openGenerator();
    const preview = deferred<{ ok: true; data: { contributions: ShoppingContribution[]; items: ShoppingDraftItem[] } }>();
    actions.previewShoppingListAction.mockReturnValue(preview.promise);

    await user.click(screen.getByRole("checkbox", { name: /番茄炒蛋/ }));
    const selectedPanel = screen.getByRole("region", { name: "已选菜谱" });
    const servings = within(selectedPanel).getByLabelText("番茄炒蛋 目标份数");
    await user.click(screen.getByRole("button", { name: "预览购物清单" }));

    expect(screen.getByRole("checkbox", { name: /番茄炒蛋/ })).toHaveAttribute("aria-disabled", "true");
    expect(servings).toBeDisabled();

    preview.resolve({
      ok: true,
      data: { contributions: previewContributions.slice(0, 1), items: previewItems() },
    });
    expect(await screen.findByRole("listitem", { name: /番茄/ })).toBeInTheDocument();
  });

  it("ignores older overlapping search results", async () => {
    const user = await openGenerator();
    const firstSearch = deferred<{ ok: true; data: ShoppingRecipeOption[] }>();
    const secondSearch = deferred<{ ok: true; data: ShoppingRecipeOption[] }>();
    actions.searchShoppingRecipesAction
      .mockReturnValueOnce(firstSearch.promise)
      .mockReturnValueOnce(secondSearch.promise);

    const search = screen.getByRole("searchbox", { name: "搜索菜谱" });
    await user.type(search, "汤");
    await user.keyboard("{Enter}");
    await user.clear(search);
    await user.type(search, "饭");
    await user.keyboard("{Enter}");

    secondSearch.resolve({
      ok: true,
      data: [{ id: recipeCId, title: "蛋炒饭", coverUrl: null, baseServings: 1 }],
    });
    expect(await screen.findByRole("checkbox", { name: /蛋炒饭/ })).toBeInTheDocument();

    firstSearch.resolve({
      ok: true,
      data: [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", title: "冬瓜汤", coverUrl: null, baseServings: 4 }],
    });
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: /冬瓜汤/ })).not.toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: /蛋炒饭/ })).toBeInTheDocument();
  });

  it("prevents empty generation after all ingredients are excluded and keeps choices after preview errors", async () => {
    const user = await openGenerator();
    actions.previewShoppingListAction.mockResolvedValueOnce({
      ok: false,
      message: "购物清单预览暂时无法生成",
    });

    await user.click(screen.getByRole("checkbox", { name: /番茄炒蛋/ }));
    await user.click(screen.getByRole("button", { name: "预览购物清单" }));
    expect(await screen.findByText("购物清单预览暂时无法生成")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /番茄炒蛋/ })).toBeChecked();

    actions.previewShoppingListAction.mockResolvedValueOnce({
      ok: true,
      data: { contributions: [previewContributions[0]], items: [previewItems()[0]] },
    });
    await user.click(screen.getByRole("button", { name: "预览购物清单" }));
    const tomatoRow = await screen.findByRole("listitem", { name: /番茄/ });
    await user.click(within(tomatoRow).getByRole("checkbox", { name: "家里已有，不购买" }));

    expect(screen.getByText("请至少保留一项需要购买的食材。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成清单" })).toBeDisabled();
  });

  it("does not close or reset while generation is pending", async () => {
    const user = await openGenerator();
    actions.previewShoppingListAction.mockResolvedValue({
      ok: true,
      data: { contributions: previewContributions.slice(0, 1), items: previewItems() },
    });
    const pending = deferred<{ ok: true; data: { shoppingListId: string } }>();
    actions.generateShoppingListAction.mockReturnValue(pending.promise);

    await user.click(screen.getByRole("checkbox", { name: /番茄炒蛋/ }));
    await user.click(screen.getByRole("button", { name: "预览购物清单" }));
    await screen.findByRole("listitem", { name: /番茄/ });
    await user.click(screen.getByRole("button", { name: "生成清单" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("dialog", { name: "生成购物清单" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成中..." })).toBeDisabled();
    expect(actions.generateShoppingListAction).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true, data: { shoppingListId: "99999999-9999-4999-8999-999999999999" } });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("submits once while saving, closes and resets on success, and keeps review choices after errors", async () => {
    const user = userEvent.setup();
    const onGenerated = vi.fn();
    render(<ShoppingGenerator initialRecipes={initialRecipes} onGenerated={onGenerated} />);
    await user.click(screen.getByRole("button", { name: "生成购物清单" }));
    actions.previewShoppingListAction.mockResolvedValue({
      ok: true,
      data: { contributions: previewContributions.slice(0, 2), items: previewItems() },
    });
    actions.generateShoppingListAction.mockResolvedValueOnce({
      ok: false,
      message: "购物清单生成失败，请稍后重试",
    });

    await user.click(screen.getByRole("checkbox", { name: /番茄炒蛋/ }));
    await user.click(screen.getByRole("button", { name: "预览购物清单" }));
    await screen.findByRole("listitem", { name: /番茄/ });
    await user.click(screen.getByRole("button", { name: "生成清单" }));

    expect(await screen.findByText("购物清单生成失败，请稍后重试")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /番茄/ })).toBeInTheDocument();

    const pending = deferred<{ ok: true; data: { shoppingListId: string } }>();
    actions.generateShoppingListAction.mockReturnValueOnce(pending.promise);
    const generate = screen.getByRole("button", { name: "生成清单" });
    await user.dblClick(generate);

    expect(actions.generateShoppingListAction).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "生成中..." })).toBeDisabled();
    pending.resolve({ ok: true, data: { shoppingListId: "99999999-9999-4999-8999-999999999999" } });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "生成购物清单" }));
    expect(screen.getByRole("checkbox", { name: /番茄炒蛋/ })).not.toBeChecked();
  });
});
