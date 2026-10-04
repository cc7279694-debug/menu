import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { emptyDetails } from "./recipe-model";
import { StepViewer } from "./step-viewer";
const recipe = {
  ...emptyDetails("鸭"),
  id: "r",
  createdAt: "2026-10-04T00:00:00.000Z",
  updatedAt: "2026-10-04T00:00:00.000Z",
  steps: [
    { instruction: "洗净", imagePath: null },
    { instruction: "焖煮", imagePath: null },
  ],
  keyTips: [{ instruction: "别煮干", stepNumber: 2 }],
};
it("focuses any requested step with bounds and shared tips, never offers automatic completion", () => {
  const close = vi.fn(),
    complete = vi.fn();
  render(
    <StepViewer
      recipe={recipe}
      mode="focus"
      initialIndex={1}
      onClose={close}
      onComplete={complete}
    />,
  );
  expect(screen.getByText("第 2 步 / 2")).toBeInTheDocument();
  expect(screen.getByText("焖煮")).toBeInTheDocument();
  expect(screen.getByText("注意：别煮干")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "下一步" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "上一步" }));
  expect(screen.getByText("洗净")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "上一步" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "返回完整步骤" }));
  expect(close).toHaveBeenCalledOnce();
  expect(complete).not.toHaveBeenCalled();
});
it("guided starts from 1/N and only an explicit final button completes", () => {
  const close = vi.fn(),
    complete = vi.fn();
  render(
    <StepViewer
      recipe={recipe}
      mode="guided"
      initialIndex={99}
      onClose={close}
      onComplete={complete}
    />,
  );
  expect(screen.getByText("第 1 步 / 2")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "完成这道菜" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "下一步" }));
  expect(
    screen.getByRole("button", { name: "完成这道菜" }),
  ).toBeInTheDocument();
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "完成这道菜" }));
  expect(complete).toHaveBeenCalledOnce();
});
it("guided exit creates nothing and zero steps never reads a nonexistent step", () => {
  const close = vi.fn(),
    complete = vi.fn();
  render(
    <StepViewer
      recipe={{ ...recipe, steps: [], keyTips: [] }}
      mode="guided"
      initialIndex={0}
      onClose={close}
      onComplete={complete}
    />,
  );
  expect(screen.getByText("还没有步骤，仍可以在菜谱页记录做过。"));
  fireEvent.click(screen.getByRole("button", { name: "退出引导" }));
  expect(close).toHaveBeenCalledOnce();
  expect(complete).not.toHaveBeenCalled();
});
