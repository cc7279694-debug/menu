import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RecipeDetail } from "../recipe-detail";
import { StepViewer } from "../step-viewer";
import { emptyDetails } from "../recipe-model";

const recipe = {
  ...emptyDetails("只有自己的做法"), id: "local-recipe",
  createdAt: "2026-10-23T00:00:00.000Z", updatedAt: "2026-10-23T00:00:00.000Z",
};

it("a name-only production recipe offers the existing editor instead of an unusable cooking action", () => {
  const edit = vi.fn();
  render(<RecipeDetail recipe={recipe} onBack={vi.fn()} onEdit={edit} onDelete={vi.fn()} onGuided={vi.fn()} onComplete={vi.fn()} />);
  expect(screen.getByRole("heading", { name: recipe.title })).toBeVisible();
  expect(screen.queryByRole("button", { name: "开始引导烹饪" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "补充做法" }));
  expect(edit).toHaveBeenCalledOnce();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("production detail keeps full real content in the approved reading order without inventing duration", () => {
  const item = { ...recipe,
    ingredients: [{ name: "鸡翅", amount: "适量" }],
    preparations: [{ instruction: "提前腌一会儿", minutes: null, timingText: "一会儿" }],
    keyTips: [{ instruction: "留意收汁", stepNumber: 1 }],
    steps: [{ instruction: "倒入可乐，烧开后转小火", imagePath: null }], notes: "自己的调整",
  };
  render(<RecipeDetail recipe={item} onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onGuided={vi.fn()} />);
  const ordered = ["食材", "提前准备", "关键事项", "完整步骤", "个人备注"].map(name => screen.getByRole("heading", { name }));
  for (let index = 1; index < ordered.length; index++) {
    expect(ordered[index - 1].compareDocumentPosition(ordered[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(screen.getByText("耗时未填写")).toBeVisible();
  expect(screen.getByText("适量")).toBeVisible();
  expect(screen.getByText("倒入可乐，烧开后转小火")).toBeVisible();
});

it("Guided ingredients are read-only and first native Back closes that sheet, not the cooking viewer", () => {
  const close = vi.fn(), complete = vi.fn();
  render(<StepViewer recipe={{ ...recipe, ingredients: [{ name: "盐", amount: "适量" }],
    steps: [{ instruction: "按自己的做法操作", imagePath: null }] }}
    mode="guided" initialIndex={0} onClose={close} onComplete={complete} />);
  fireEvent.click(screen.getByRole("button", { name: "查看食材" }));
  const sheet = screen.getByRole("dialog", { name: "食材" });
  expect(within(sheet).getByText("盐")).toBeVisible();
  expect(within(sheet).queryByRole("checkbox")).not.toBeInTheDocument();
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  expect(close).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: "引导烹饪" })).toBeVisible();
});
