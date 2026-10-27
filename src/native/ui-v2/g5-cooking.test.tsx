import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { CookingCompletion } from "../cooking-completion";
import { CookingOverview } from "../cooking-history";
import type { CookingRecord, CookingRecordExtras } from "../cooking-model";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";
import { StepViewer } from "../step-viewer";

afterEach(__resetLocalDatabaseForTests);

it("the cooking reference sheet shows actual preparation and tips without losing the current Focus step", async () => {
  const close = vi.fn(), complete = vi.fn();
  const recipe = {
    ...emptyDetails("合成测试鸡翅"), id: "test-recipe",
    createdAt: "2026-10-26T00:00:00.000Z", updatedAt: "2026-10-26T00:00:00.000Z",
    ingredients: [{ name: "鸡翅", amount: "500克" }],
    preparations: [{ instruction: "提前腌一会儿", minutes: null, timingText: "一会儿" }],
    keyTips: [{ instruction: "收汁时留意锅底", stepNumber: 2 }],
    steps: [{ instruction: "先焯水", imagePath: null }, { instruction: "最后收汁", imagePath: null }],
  };
  render(<StepViewer recipe={recipe} mode="focus" initialIndex={1} onClose={close} onComplete={complete} />);
  fireEvent.click(screen.getByRole("button", { name: "查看食材" }));
  const sheet = screen.getByRole("dialog", { name: "食材" });
  expect(within(sheet).getByText("鸡翅")).toBeVisible();
  expect(within(sheet).getByRole("heading", { name: "提前准备" })).toBeVisible();
  expect(within(sheet).getByText("提前腌一会儿")).toBeVisible();
  expect(within(sheet).getByText("一会儿")).toBeVisible();
  expect(within(sheet).getByText(/收汁时留意锅底/)).toBeVisible();
  expect(within(sheet).queryByRole("checkbox")).not.toBeInTheDocument();
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "食材" })).not.toBeInTheDocument());
  expect(screen.getByText("第 2 步／共 2 步")).toBeVisible();
  expect(screen.getByText("最后收汁")).toBeVisible();
  expect(close).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
});

it("reopening a recipe highlights its actual latest cooking note while earlier records remain expandable and read-only", async () => {
  let now = Date.parse("2026-10-26T00:00:00.000Z");
  const store = new PreviewRecipeLibrary(() => new Date(now++));
  const recipe = await store.create("合成测试鸡翅");
  for (let index = 0; index < 3; index++) {
    const record = await store.recordCooking(recipe.id, `synthetic-record-${index}`);
    await store.updateCookingRecord(record.id, {
      finishedPhotoPath: null, evaluation: null, note: `实际保存备注 ${index}`,
    });
  }
  const record = vi.spyOn(store, "recordCooking"), update = vi.spyOn(store, "updateCookingRecord"), history = vi.fn();
  render(<CookingOverview recipeId={recipe.id} store={store} revision={0} onHistory={history} />);
  await screen.findByText("做过 3 次");
  expect(screen.getByRole("heading", { name: "上次下厨" })).toBeVisible();
  expect(screen.getByText("实际保存备注 2")).toBeVisible();
  const previous = screen.getByText("实际保存备注 1").closest("details");
  expect(previous).not.toHaveAttribute("open");
  expect(screen.getByText("实际保存备注 1")).not.toBeVisible();
  fireEvent.click(screen.getByText("展开较早记录（预览 2 条）"));
  expect(previous).toHaveAttribute("open");
  expect(screen.getByText("实际保存备注 1")).toBeVisible();
  expect(screen.getAllByTestId("cooking-record")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "查看做菜记录" }));
  expect(history).toHaveBeenCalledOnce();
  expect(record).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});

it("saving optional completion notes twice does not repeat the existing record or lose pending text", async () => {
  const record: CookingRecord = {
    id: "existing-record", recipeId: "test-recipe", cookedAt: "2026-10-26T00:00:00.000Z",
    finishedPhotoPath: null, evaluation: null, note: null,
  };
  let finish: (value: CookingRecord) => void = () => {};
  const pending = new Promise<CookingRecord>(resolve => { finish = resolve; });
  const update = vi.fn<(extras: CookingRecordExtras) => Promise<CookingRecord>>(() => pending), done = vi.fn();
  render(<CookingCompletion record={record} onUpdate={update} onSetCover={vi.fn()}
    onAdjust={vi.fn()} onDone={done} />);
  expect(update).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("这次的备注"), { target: { value: "本次实际少放了盐\n🍗" } });
  const save = screen.getByRole("button", { name: "完成并返回" });
  fireEvent.click(save); fireEvent.click(save);
  expect(update).toHaveBeenCalledOnce();
  expect(update).toHaveBeenCalledWith({ finishedPhotoPath: null, evaluation: null, note: "本次实际少放了盐\n🍗" });
  expect(screen.getByLabelText("这次的备注")).toHaveValue("本次实际少放了盐\n🍗");
  expect(done).not.toHaveBeenCalled();
  finish({ ...record, note: "本次实际少放了盐\n🍗" });
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
});
