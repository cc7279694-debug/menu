import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { emptyDetails } from "./recipe-model";
import { RecipeDetail } from "./recipe-detail";
import { LocalImage } from "./local-image";
vi.mock("./local-image", () => ({
  LocalImage: vi.fn(({ alt }: { alt: string }) => <img alt={alt} />),
}));
beforeEach(() => vi.clearAllMocks());
const recipe = {
  ...emptyDetails("鸭"),
  id: "r",
  createdAt: "2026-10-04T00:00:00.000Z",
  updatedAt: "2026-10-04T00:00:00.000Z",
  totalMinutes: 30,
  ingredients: [{ name: "鸭肉", amount: "500克" }],
  preparations: [{ instruction: "腌制", minutes: 15, timingText: null }],
  steps: [
    { instruction: "洗净", imagePath: null },
    { instruction: "焖煮", imagePath: null },
  ],
  keyTips: [{ instruction: "别煮干", stepNumber: 2 }],
};
it("keeps full steps as the main path and orders ingredients/time/preps/tips/steps", () => {
  const focus = vi.fn();
  render(
    <RecipeDetail
      recipe={recipe}
      onEdit={() => {}}
      onBack={() => {}}
      onDelete={() => {}}
      onFocus={focus}
      onGuided={() => {}}
      onComplete={() => {}}
    />,
  );
  expect(
    screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent)
      .slice(0, 5),
  ).toEqual(["食材", "总耗时", "提前准备", "做菜前先看", "完整步骤"]);
  expect(screen.getByText("洗净")).toBeInTheDocument();
  expect(screen.getByText("焖煮")).toBeInTheDocument();
  expect(LocalImage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "放大步骤 2" }));
  expect(focus.mock.calls[0][0]).toBe(1);
});
it("does not force name-only recipes into a guided flow", () => {
  render(
    <RecipeDetail
      recipe={{ ...recipe, steps: [], keyTips: [] }}
      onEdit={() => {}}
      onBack={() => {}}
      onDelete={() => {}}
      onGuided={() => {}}
      onComplete={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "开始引导烹饪" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "完成这道菜" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: /放大步骤/ }),
  ).not.toBeInTheDocument();
});
