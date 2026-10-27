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
it("keeps full steps as the main path and orders metadata/ingredients/preps/tips/steps", () => {
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
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
  ).toEqual(["食材", "提前准备", "关键事项", "完整步骤"]);
  expect(screen.getByText("30 分钟").compareDocumentPosition(screen.getByRole("heading", { name: "食材" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText("洗净")).toBeInTheDocument();
  expect(screen.getByText("焖煮")).toBeInTheDocument();
  expect(LocalImage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "放大步骤 2" }));
  expect(focus.mock.calls[0][0]).toBe(1);
});
it("does not force name-only recipes into a guided flow", () => {
  const edit = vi.fn(), guided = vi.fn();
  render(
    <RecipeDetail
      recipe={{ ...recipe, steps: [], keyTips: [] }}
      onEdit={edit}
      onBack={() => {}}
      onDelete={() => {}}
      onGuided={guided}
      onComplete={() => {}}
    />,
  );
  expect(screen.queryByRole("button", { name: "开始引导烹饪" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "补充做法" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "补充做法" }));
  expect(edit).toHaveBeenCalledOnce();
  expect(guided).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "完成这道菜" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: /放大步骤/ }),
  ).not.toBeInTheDocument();
});
