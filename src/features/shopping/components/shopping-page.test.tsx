import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";

import type { ShoppingActiveList, ShoppingRecipeOption } from "@/features/shopping/types";

const { actions, queries, router } = vi.hoisted(() => ({
  actions: {
    clearCompletedShoppingItemsAction: vi.fn(),
    deleteShoppingItemAction: vi.fn(),
    reorderShoppingItemsAction: vi.fn(),
    saveShoppingItemAction: vi.fn(),
    setShoppingItemCheckedAction: vi.fn(),
  },
  queries: {
    getActiveShoppingList: vi.fn(),
    searchShoppingRecipeOptions: vi.fn(),
  },
  router: {
    refresh: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/features/shopping/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/shopping/actions")>()),
  clearCompletedShoppingItemsAction: actions.clearCompletedShoppingItemsAction,
  deleteShoppingItemAction: actions.deleteShoppingItemAction,
  reorderShoppingItemsAction: actions.reorderShoppingItemsAction,
  saveShoppingItemAction: actions.saveShoppingItemAction,
  setShoppingItemCheckedAction: actions.setShoppingItemCheckedAction,
}));

vi.mock("@/features/shopping/queries", () => queries);

import ShoppingRoutePage from "@/app/(app)/shopping/page";
import { ShoppingPage } from "@/features/shopping/components/shopping-page";

const listId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const tomatoId = "11111111-1111-4111-8111-111111111111";
const saltId = "22222222-2222-4222-8222-222222222222";
const milkId = "33333333-3333-4333-8333-333333333333";
const napkinId = "44444444-4444-4444-8444-444444444444";

const recipeOptions: ShoppingRecipeOption[] = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "番茄炒蛋", coverUrl: null, baseServings: 2 },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "早餐燕麦", coverUrl: null, baseServings: 1 },
];

function activeList(): ShoppingActiveList {
  return {
    id: listId,
    name: "周末采购",
    updatedAt: "2026-08-24T08:00:00.000Z",
    sources: [
      {
        id: "source-a",
        recipeId: recipeOptions[0].id,
        recipeTitleSnapshot: "番茄炒蛋",
        selectedServings: 2,
      },
    ],
    items: [
      {
        id: tomatoId,
        ingredientId: "tomato",
        nameSnapshot: "番茄",
        quantity: 3,
        quantityText: null,
        unit: "个",
        aisle: "蔬菜",
        isChecked: false,
        isManual: false,
        sortOrder: 0,
        sources: [
          {
            id: "item-source-a",
            shoppingListSourceId: "source-a",
            recipeId: recipeOptions[0].id,
            recipeTitleSnapshot: "番茄炒蛋",
            selectedServings: 2,
            recipeIngredientId: "recipe-ingredient-a",
            quantityContribution: 3,
            quantityTextContribution: null,
            unitSnapshot: "个",
          },
        ],
      },
      {
        id: saltId,
        ingredientId: "salt",
        nameSnapshot: "海盐",
        quantity: null,
        quantityText: "少许",
        unit: null,
        aisle: "调料",
        isChecked: false,
        isManual: false,
        sortOrder: 1,
        sources: [
          {
            id: "item-source-b",
            shoppingListSourceId: "source-a",
            recipeId: recipeOptions[0].id,
            recipeTitleSnapshot: "番茄炒蛋",
            selectedServings: 2,
            recipeIngredientId: "recipe-ingredient-b",
            quantityContribution: null,
            quantityTextContribution: "少许",
            unitSnapshot: null,
          },
        ],
      },
      {
        id: milkId,
        ingredientId: null,
        nameSnapshot: "牛奶",
        quantity: 1,
        quantityText: null,
        unit: "瓶",
        aisle: "乳制品",
        isChecked: true,
        isManual: true,
        sortOrder: 2,
        sources: [],
      },
      {
        id: napkinId,
        ingredientId: null,
        nameSnapshot: "餐巾纸",
        quantity: null,
        quantityText: "一包",
        unit: null,
        aisle: null,
        isChecked: false,
        isManual: true,
        sortOrder: 3,
        sources: [],
      },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderPage(list: ShoppingActiveList | null = activeList()) {
  return render(<ShoppingPage currentList={list} initialRecipes={recipeOptions} />);
}

function expectTouchTarget(button: HTMLElement) {
  expect(button).toHaveClass("min-h-11");
  expect(button).toHaveClass("min-w-11");
}

describe("shopping route page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the active list and initial recipe options in parallel before rendering the protected route", async () => {
    const active = deferred<ShoppingActiveList | null>();
    const recipes = deferred<ShoppingRecipeOption[]>();
    queries.getActiveShoppingList.mockReturnValue(active.promise);
    queries.searchShoppingRecipeOptions.mockReturnValue(recipes.promise);

    const rendered = ShoppingRoutePage();
    expect(queries.getActiveShoppingList).toHaveBeenCalledTimes(1);
    expect(queries.searchShoppingRecipeOptions).toHaveBeenCalledWith("");

    active.resolve(null);
    await Promise.resolve();
    expect(await Promise.race([rendered.then(() => "settled"), Promise.resolve("pending")])).toBe("pending");

    recipes.resolve(recipeOptions);
    render(await rendered);
    expect(screen.getByRole("heading", { name: "购物清单" })).toBeInTheDocument();
    expect(screen.getByText("还没有当前购物清单")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成购物清单" })).toBeInTheDocument();
  });
});

describe("ShoppingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.clearCompletedShoppingItemsAction.mockResolvedValue({ ok: true, data: null });
    actions.deleteShoppingItemAction.mockResolvedValue({ ok: true, data: null });
    actions.reorderShoppingItemsAction.mockResolvedValue({ ok: true, data: null });
    actions.saveShoppingItemAction.mockResolvedValue({ ok: true, data: { itemId: "55555555-5555-4555-8555-555555555555" } });
    actions.setShoppingItemCheckedAction.mockResolvedValue({ ok: true, data: null });
  });

  it("shows onboarding when no current list exists and keeps the generator ready", () => {
    renderPage(null);

    expect(screen.getByRole("heading", { name: "购物清单" })).toBeInTheDocument();
    expect(screen.getByText("还没有当前购物清单")).toBeInTheDocument();
    expect(screen.getByText("选择菜谱生成第一份采购清单，之后可手动补充日常用品。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成购物清单" })).toHaveClass("min-h-11");
  });

  it("groups by persisted aisle snapshot, keeps unclassified last, and keeps checked rows visible with counts", () => {
    renderPage();

    expect(screen.getByText("未完成 3 项")).toBeInTheDocument();
    expect(screen.getByText("进度 1 / 4")).toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["蔬菜", "调料", "乳制品", "未分类"]);

    const tomatoRow = screen.getByRole("listitem", { name: /番茄/ });
    expect(within(tomatoRow).getByText("3 个")).toBeInTheDocument();
    expect(within(tomatoRow).getByText("番茄炒蛋")).toBeInTheDocument();
    expect(within(tomatoRow).queryByText("手动")).not.toBeInTheDocument();

    const milkRow = screen.getByRole("listitem", { name: /牛奶/ });
    expect(within(milkRow).getByText("1 瓶")).toBeInTheDocument();
    expect(within(milkRow).getByText("手动")).toBeInTheDocument();
    expect(within(milkRow).getByRole("checkbox", { name: "牛奶 标记为未完成" })).toBeChecked();
  });

  it("confirms toggles on the server, disables only the affected checkbox, and recovers after errors", async () => {
    const user = userEvent.setup();
    const pending = deferred<{ ok: false; message: string }>();
    actions.setShoppingItemCheckedAction.mockReturnValueOnce(pending.promise);
    renderPage();

    const tomatoRow = screen.getByRole("listitem", { name: /番茄/ });
    const saltRow = screen.getByRole("listitem", { name: /海盐/ });
    await user.click(within(tomatoRow).getByRole("checkbox", { name: "番茄 标记为已完成" }));

    expect(within(tomatoRow).getByRole("checkbox", { name: "番茄 标记为已完成" })).toHaveAttribute("aria-disabled", "true");
    expect(within(saltRow).getByRole("checkbox", { name: "海盐 标记为已完成" })).not.toHaveAttribute("aria-disabled", "true");
    expect(actions.setShoppingItemCheckedAction).toHaveBeenCalledWith({
      shoppingListId: listId,
      itemId: tomatoId,
      isChecked: true,
    });

    pending.resolve({ ok: false, message: "购物清单状态更新失败，请刷新后重试" });
    expect(await screen.findByRole("status")).toHaveTextContent("购物清单状态更新失败，请刷新后重试");
    expect(within(tomatoRow).getByRole("checkbox", { name: "番茄 标记为已完成" })).not.toBeChecked();

    actions.setShoppingItemCheckedAction.mockResolvedValueOnce({ ok: true, data: null });
    await user.click(within(tomatoRow).getByRole("checkbox", { name: "番茄 标记为已完成" }));
    await waitFor(() => expect(within(tomatoRow).getByRole("checkbox", { name: "番茄 标记为未完成" })).toBeChecked());
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("adds, edits, deletes, and clears manual items with in-app confirmations and no recipe mutation", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "添加食材" }));
    await user.type(screen.getByLabelText("食材名称"), "厨房纸");
    await user.type(screen.getByLabelText("数字数量"), "2");
    expect(screen.getByLabelText("文本数量")).toBeDisabled();
    await user.type(screen.getByLabelText("单位"), "卷");
    await user.type(screen.getByLabelText("区域"), "日用品");
    await user.click(screen.getByRole("button", { name: "保存食材" }));

    await waitFor(() => expect(actions.saveShoppingItemAction).toHaveBeenCalledWith({
      shoppingListId: listId,
      itemId: null,
      nameSnapshot: "厨房纸",
      quantity: 2,
      quantityText: null,
      unit: "卷",
      aisle: "日用品",
    }));

    const napkinRow = screen.getByRole("listitem", { name: /餐巾纸/ });
    await user.click(within(napkinRow).getByRole("button", { name: "编辑餐巾纸" }));
    await user.clear(screen.getByLabelText("文本数量"));
    await user.type(screen.getByLabelText("文本数量"), "两包");
    expect(screen.getByLabelText("数字数量")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "保存食材" }));
    await waitFor(() => expect(actions.saveShoppingItemAction).toHaveBeenLastCalledWith(expect.objectContaining({
      itemId: napkinId,
      quantity: null,
      quantityText: "两包",
    })));

    await user.click(within(napkinRow).getByRole("button", { name: "删除餐巾纸" }));
    expect(screen.getByRole("dialog", { name: "删除食材" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(actions.deleteShoppingItemAction).toHaveBeenCalledWith({
      shoppingListId: listId,
      itemId: napkinId,
    }));

    await user.click(screen.getByRole("button", { name: "清理已完成" }));
    expect(screen.getByRole("dialog", { name: "清理已完成食材" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认清理" }));
    await waitFor(() => expect(actions.clearCompletedShoppingItemsAction).toHaveBeenCalledWith({
      shoppingListId: listId,
    }));
  });

  it("warns that generation replaces the current list and removes empty groups after local deletes", async () => {
    const user = userEvent.setup();
    renderPage({
      ...activeList(),
      items: activeList().items.filter((item) => item.id !== milkId),
    });

    expect(screen.getByText("生成新清单会替换当前清单。")).toBeInTheDocument();
    const napkinRow = screen.getByRole("listitem", { name: /餐巾纸/ });
    await user.click(within(napkinRow).getByRole("button", { name: "删除餐巾纸" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "未分类" })).not.toBeInTheDocument());
  });

  it("submits full persisted ID order for accessible up and down controls while preserving grouped rendering", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(within(screen.getByRole("listitem", { name: /番茄/ })).getByRole("button", { name: "上移番茄" })).toBeDisabled();
    expect(within(screen.getByRole("listitem", { name: /餐巾纸/ })).getByRole("button", { name: "下移餐巾纸" })).toBeDisabled();
    const tomatoRow = within(screen.getByRole("listitem", { name: /番茄/ }));
    expectTouchTarget(tomatoRow.getByRole("button", { name: "上移番茄" }));
    expectTouchTarget(tomatoRow.getByRole("button", { name: "下移番茄" }));
    expectTouchTarget(tomatoRow.getByRole("button", { name: "编辑番茄" }));
    expectTouchTarget(tomatoRow.getByRole("button", { name: "删除番茄" }));

    await user.click(within(screen.getByRole("listitem", { name: /海盐/ })).getByRole("button", { name: "上移海盐" }));
    await waitFor(() => expect(actions.reorderShoppingItemsAction).toHaveBeenCalledWith({
      shoppingListId: listId,
      itemIds: [saltId, tomatoId, milkId, napkinId],
    }));

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["调料", "蔬菜", "乳制品", "未分类"]);
  });
});
