import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/nutrition-analysis/actions", () => ({ analyzeNutritionAction: vi.fn() }));

import { NutritionAnalysisForm } from "@/features/nutrition-analysis/components/nutrition-analysis-form";
import type { NutritionAnalysisResult } from "@/features/nutrition-analysis/types";

const result: NutritionAnalysisResult = {
  total: { caloriesKcal: 400, proteinGrams: 40, fatGrams: null, carbsGrams: null },
  perServing: { caloriesKcal: 200, proteinGrams: 20, fatGrams: null, carbsGrams: null },
  ingredients: [], assumptions: [], omittedItems: [], confidence: "high",
};

describe("NutritionAnalysisForm", () => {
  it("shows a clear empty-input message without submitting", async () => {
    const analyze = vi.fn();
    const user = userEvent.setup();
    render(<NutritionAnalysisForm analyze={analyze} />);
    await user.click(screen.getByRole("button", { name: "开始分析" }));
    expect(screen.getByRole("alert")).toHaveTextContent("请先输入食材和用量");
    expect(analyze).not.toHaveBeenCalled();
  });

  it("submits ingredient text with one serving by default and renders the result", async () => {
    const analyze = vi.fn().mockResolvedValue({ ok: true, data: result });
    const user = userEvent.setup();
    render(<NutritionAnalysisForm analyze={analyze} />);
    const textarea = screen.getByRole("textbox", { name: "食材和用量" });
    expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("200克牛肉"));
    await user.type(textarea, "200克牛肉");
    await user.click(screen.getByRole("button", { name: "开始分析" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "营养参考" })).toBeInTheDocument());
    expect(analyze).toHaveBeenCalledWith({ ingredientText: "200克牛肉", servings: 1 });
  });

  it("displays a retryable error and disables submit while loading", async () => {
    let resolve: ((value: { ok: false; message: string }) => void) | undefined;
    const analyze = vi.fn().mockImplementation(() => new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<NutritionAnalysisForm analyze={analyze} />);
    await user.type(screen.getByRole("textbox", { name: "食材和用量" }), "适量油");
    const submit = screen.getByRole("button", { name: "开始分析" });
    await user.click(submit);
    expect(screen.getByRole("button", { name: "正在分析…" })).toBeDisabled();
    resolve?.({ ok: false, message: "营养分析信息不足" });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("营养分析信息不足"));
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});
