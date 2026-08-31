import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecipeImportReviewPanel } from "@/features/recipe-imports/components/recipe-import-review";

const review = {
  fieldChecks: [
    { path: "ingredients.0.quantity", status: "missing" as const, label: "鸡蛋的数字用量", message: "来源未明确提供鸡蛋的数字用量，请确认后补充。" },
    { path: "steps.0.heatLevel", status: "inferred" as const, label: "第 1 步火候", message: "第 1 步火候可能由 AI 根据上下文整理，请检查。" },
  ],
  requiresConfirmation: true,
  confirmedAt: null,
};

describe("RecipeImportReviewPanel", () => {
  it("lists uncertain fields and lets the user acknowledge them", async () => {
    const user = userEvent.setup();
    const onAcknowledgedChange = vi.fn();
    render(<RecipeImportReviewPanel review={review} acknowledged={false} onAcknowledgedChange={onAcknowledgedChange} />);

    expect(screen.getByRole("heading", { name: "请确认 AI 整理结果" })).toBeInTheDocument();
    expect(screen.getByText("鸡蛋的数字用量")).toBeInTheDocument();
    expect(screen.getByText("第 1 步火候")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
    expect(onAcknowledgedChange).toHaveBeenCalledWith(true);
  });

  it("shows a clear state without a confirmation checkbox when every field is explicit", () => {
    render(<RecipeImportReviewPanel review={{ fieldChecks: [{ path: "title", status: "explicit", label: "菜谱名称", message: null }], requiresConfirmation: false, confirmedAt: null }} acknowledged={true} onAcknowledgedChange={vi.fn()} />);
    expect(screen.getByText("未发现需要特别确认的字段。")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
