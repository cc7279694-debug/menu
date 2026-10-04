import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
import { CookingHistory, CookingOverview } from "./cooking-history";
afterEach(__resetLocalDatabaseForTests);
it("shows count, device-local last date and only three recent records", async () => {
  const store = new PreviewRecipeLibrary(
      () => new Date("2026-10-04T01:00:00.000Z"),
    ),
    r = await store.create("鸭");
  for (let i = 0; i < 4; i++) await store.recordCooking(r.id, `record-${i}`);
  const history = vi.fn();
  render(
    <CookingOverview
      recipeId={r.id}
      store={store}
      revision={0}
      onHistory={history}
    />,
  );
  await screen.findByText("做过 4 次");
  expect(screen.getAllByTestId("cooking-record")).toHaveLength(3);
  expect(
    screen.getByText(
      `最近做过：${new Date("2026-10-04T01:00:00.000Z").toLocaleString()}`,
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "查看做菜记录" }));
  expect(history).toHaveBeenCalledOnce();
});
it("pages equal-time history and canceled deletion leaves records and recipe unchanged", async () => {
  const store = new PreviewRecipeLibrary(
      () => new Date("2026-10-04T01:00:00.000Z"),
    ),
    r = await store.create("鸭");
  for (let i = 0; i < 21; i++)
    await store.recordCooking(r.id, `record-${String(i).padStart(2, "0")}`);
  const changed = vi.fn(),
    remove = vi.spyOn(store, "deleteCookingRecord"),
    confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <CookingHistory
      recipeId={r.id}
      store={store}
      onBack={() => {}}
      onChanged={changed}
    />,
  );
  await waitFor(() =>
    expect(screen.getAllByTestId("cooking-record")).toHaveLength(20),
  );
  fireEvent.click(screen.getByRole("button", { name: "加载更多做菜记录" }));
  await waitFor(() =>
    expect(screen.getAllByTestId("cooking-record")).toHaveLength(21),
  );
  expect(
    new Set(
      screen
        .getAllByTestId("cooking-record")
        .map((e) => e.getAttribute("data-record-id")),
    ).size,
  ).toBe(21);
  fireEvent.click(screen.getAllByRole("button", { name: "删除这次记录" })[0]);
  expect(remove).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getAllByRole("button", { name: "删除这次记录" })[0]);
  await screen.findByText("做过 20 次");
  expect(changed).toHaveBeenCalledOnce();
  expect(await store.getDetails(r.id)).not.toBeNull();
  expect(await store.getCookingSummary(r.id)).toMatchObject({ count: 20 });
});
it("read failures offer retry, empty history and native Back still work", async () => {
  const store = new PreviewRecipeLibrary(),
    r = await store.create("鸭"),
    back = vi.fn();
  vi.spyOn(store, "listCookingRecords").mockRejectedValueOnce(
    new Error("读取失败"),
  );
  render(
    <CookingHistory
      recipeId={r.id}
      store={store}
      onBack={back}
      onChanged={() => {}}
    />,
  );
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "重试读取做菜记录" }));
  await screen.findByText("还没有做菜记录。只有点击完成才会记录。");
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  expect(back).toHaveBeenCalledOnce();
});
