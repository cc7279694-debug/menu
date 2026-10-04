import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
import { RecipeChangeHistory } from "./recipe-change-history";
import { emptyDetails } from "./recipe-model";
afterEach(__resetLocalDatabaseForTests);
it("reads old/new quantities and pages history without any save or rollback action", async () => {
  let now = Date.parse("2026-10-04T01:00:00.000Z");
  const store = new PreviewRecipeLibrary(() => new Date(now++));
  const r = await store.createDetails({
    ...emptyDetails("鸭"),
    ingredients: [{ name: "糖", amount: "30g" }],
  });
  for (let i = 0; i < 21; i++)
    await store.saveDetails(r.id, {
      ...emptyDetails("鸭"),
      ingredients: [{ name: "糖", amount: `${i === 0 ? 15 : i}g` }],
    });
  const list = vi.spyOn(store, "listRecipeChanges"),
    save = vi.spyOn(store, "saveDetails"),
    back = vi.fn();
  render(<RecipeChangeHistory recipeId={r.id} store={store} onBack={back} />);
  await screen.findByRole("heading", { name: "修改记录" });
  await waitFor(() =>
    expect(screen.getAllByTestId("recipe-change")).toHaveLength(20),
  );
  fireEvent.click(screen.getByRole("button", { name: "加载更多修改记录" }));
  await waitFor(() =>
    expect(screen.getAllByTestId("recipe-change")).toHaveLength(21),
  );
  expect(screen.getByText("糖：30g → 15g")).toBeInTheDocument();
  expect(list.mock.calls[1][2]).toHaveProperty("id");
  expect(save).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: /回滚|切换版本/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "返回菜谱" }));
  expect(back).toHaveBeenCalledOnce();
});
it("offers error retry and an empty state without blocking Back", async () => {
  const store = new PreviewRecipeLibrary(),
    r = await store.create("鸭");
  vi.spyOn(store, "listRecipeChanges").mockRejectedValueOnce(
    new Error("读取失败"),
  );
  render(
    <RecipeChangeHistory recipeId={r.id} store={store} onBack={() => {}} />,
  );
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "重试读取修改记录" }));
  await screen.findByText("还没有修改记录。当前菜谱就是你认可的最新做法。");
});
