import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecipeDetail } from "@/features/recipes/types";

import { PreparationChecklist } from "./preparation-checklist";

const preparations: RecipeDetail["preparations"] = [
  { id: "prep-2", recipeIngredientId: null, ingredientName: null, instruction: "泡绿豆", leadTimeMinutes: 240, timingText: null, sortOrder: 2 },
  { id: "prep-1", recipeIngredientId: null, ingredientName: "牛肉", instruction: "腌制入味", leadTimeMinutes: 30, timingText: null, sortOrder: 1 },
];

describe("PreparationChecklist", () => {
  it("renders sorted checkboxes and requires all items before confirming", () => {
    const onToggle = vi.fn();
    const onConfirm = vi.fn();
    const onSkip = vi.fn();
    render(<PreparationChecklist preparations={preparations} completedIds={["prep-1"]} allCompleted={false} onToggle={onToggle} onConfirm={onConfirm} onSkip={onSkip} />);

    expect(screen.getByRole("heading", { name: "开始前请确认" })).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "完成：腌制入味" })).toBeChecked();
    expect(screen.getByText(/腌制入味/)).toBeInTheDocument();
    expect(screen.getByText("提前 4 小时")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "准备完成，开始烹饪" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "完成：泡绿豆" }));
    expect(onToggle).toHaveBeenCalledWith("prep-2");
    fireEvent.click(screen.getByRole("button", { name: "仍然开始烹饪" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("enables confirmation after every preparation is checked", () => {
    const onConfirm = vi.fn();
    render(<PreparationChecklist preparations={preparations} completedIds={["prep-1", "prep-2"]} allCompleted onToggle={vi.fn()} onConfirm={onConfirm} onSkip={vi.fn()} />);
    const button = screen.getByRole("button", { name: "准备完成，开始烹饪" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
