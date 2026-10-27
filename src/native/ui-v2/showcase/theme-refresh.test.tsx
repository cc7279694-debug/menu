import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { UiV2Showcase } from "./showcase";

const themes = [
  ["warm-ivory", "米色 · Warm Ivory"],
  ["pure-glass", "白色 · Pure Glass"],
  ["soft-sage", "淡绿色 · Soft Sage"],
] as const;

it.each(themes)("initial %s theme reaches both the page and its live Sheet", async (theme, label) => {
  const user = userEvent.setup();
  const { container } = render(<UiV2Showcase {...{ initialTheme: theme }} />);
  expect(container.querySelector(".v2-app")).toHaveAttribute("data-v2-theme", theme);
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  const sheet = screen.getByRole("dialog", { name: "样板设置" });
  expect(sheet.closest(".v2-portal")).toHaveAttribute("data-v2-theme", theme);
  expect(within(sheet).getByRole("radio", { name: label })).toBeChecked();
});

it("unknown initial theme falls back to warm rather than becoming a CSS selector or missing theme", () => {
  const { container } = render(<UiV2Showcase {...{ initialTheme: "unknown-theme" }} />);
  expect(container.querySelector(".v2-app")).toHaveAttribute("data-v2-theme", "warm-ivory");
});

it("a live theme change preserves the search node, query and duration filter", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="library" />);
  const search = screen.getByRole("searchbox", { name: "搜索我的菜谱" });
  await user.type(search, "啤酒");
  await user.click(screen.getByRole("button", { name: "30–60 分钟" }));
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  const sheet = screen.getByRole("dialog", { name: "样板设置" });
  await user.click(within(sheet).getByRole("radio", { name: "白色 · Pure Glass" }));
  expect(screen.getByRole("dialog", { name: "样板设置" })).toBe(sheet);
  expect(sheet.closest(".v2-portal")).toHaveAttribute("data-v2-theme", "pure-glass");
  await user.click(within(sheet).getByRole("button", { name: "查看样板" }));
  expect(screen.getByRole("searchbox", { name: "搜索我的菜谱" })).toBe(search);
  expect(search).toHaveValue("啤酒");
  expect(screen.getByRole("button", { name: "30–60 分钟" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "打开啤酒鸭" })).toBeVisible();
});

it("switching skin keeps the selected non-default recipe", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="library" />);
  await user.click(screen.getByRole("button", { name: "打开番茄鸡蛋汤" }));
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  await user.click(screen.getByRole("radio", { name: "淡绿色 · Soft Sage" }));
  await user.click(screen.getByRole("button", { name: "查看样板" }));
  expect(screen.getByRole("heading", { name: "番茄鸡蛋汤" })).toBeVisible();
});

it("theme changes do not remount cooking or reset its current step", async () => {
  const user = userEvent.setup();
  const { container } = render(<UiV2Showcase initialScreen="cooking" />);
  await user.click(screen.getByRole("button", { name: "下一步" }));
  await user.click(screen.getByRole("button", { name: "下一步" }));
  const cooking = container.querySelector(".v2-cooking");
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  await user.click(screen.getByRole("radio", { name: "白色 · Pure Glass" }));
  await user.click(screen.getByRole("button", { name: "查看样板" }));
  expect(container.querySelector(".v2-cooking")).toBe(cooking);
  expect(cooking).toHaveAttribute("data-v2-theme", "pure-glass");
  expect(screen.getByText("第 3 步／共 6 步")).toBeVisible();
});

it("a theme change cannot erase the explicit completion acknowledgement or re-enable completion", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="cooking" />);
  for (let i = 0; i < 5; i++) await user.click(screen.getByRole("button", { name: "下一步" }));
  await user.click(screen.getByRole("button", { name: "完成这道菜" }));
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  await user.click(screen.getByRole("radio", { name: "淡绿色 · Soft Sage" }));
  await user.click(screen.getByRole("button", { name: "查看样板" }));
  expect(screen.getByRole("button", { name: "完成这道菜" })).toBeDisabled();
  expect(screen.getByText("演示完成确认。未写入任何做菜记录。")).toBeVisible();
});

it("theme and solid appearance reach a dark cooking ingredient portal", async () => {
  const user = userEvent.setup();
  const { container } = render(<UiV2Showcase initialScreen="cooking" {...{ initialTheme: "soft-sage" }} />);
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  await user.click(screen.getByRole("checkbox", { name: "实体玻璃回退" }));
  await user.click(screen.getByRole("button", { name: "查看样板" }));
  await user.click(screen.getByRole("button", { name: "查看食材" }));
  const portal = screen.getByRole("dialog", { name: "食材清单" }).closest(".v2-portal");
  expect(portal).toHaveAttribute("data-v2-theme", "soft-sage");
  expect(portal).toHaveAttribute("data-v2-solid", "true");
  expect(portal).toHaveAttribute("data-v2-dark", "true");
  expect(container.querySelector(".v2-cooking")).toHaveAttribute("data-v2-solid", "true");
});

it("switching theme neither bypasses nor resets the component review acknowledgement", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="components" />);
  const save = screen.getByRole("button", { name: "保存审核样例" });
  expect(save).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
  await user.click(screen.getByRole("button", { name: "样板设置" }));
  await user.click(screen.getByRole("radio", { name: "白色 · Pure Glass" }));
  await user.click(screen.getByRole("button", { name: "查看样板" }));
  expect(screen.getByRole("button", { name: "保存审核样例" })).toBe(save);
  expect(save).toBeEnabled();
  expect(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" })).toBeChecked();
});

it("switching appearance does not request a Provider or write browser persistence", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  const persist = vi.spyOn(Storage.prototype, "setItem");
  try {
    const user = userEvent.setup();
    render(<UiV2Showcase />);
    await user.click(screen.getByRole("button", { name: "样板设置" }));
    await user.click(screen.getByRole("radio", { name: "淡绿色 · Soft Sage" }));
    await user.click(screen.getByRole("button", { name: "查看样板" }));
    await user.type(screen.getByRole("searchbox", { name: "搜索我的菜谱" }), "鸡翅");
    expect(request).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  } finally { persist.mockRestore(); vi.unstubAllGlobals(); }
});

it("the material sample opens the existing themed read-only ingredient Sheet", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="components" {...{ initialTheme: "pure-glass" }} />);
  await user.click(screen.getByRole("button", { name: "打开材质样例浮层" }));
  const sheet = screen.getByRole("dialog", { name: "食材清单样例" });
  expect(sheet.closest(".v2-portal")).toHaveAttribute("data-v2-theme", "pure-glass");
  expect(within(sheet).queryByRole("checkbox")).not.toBeInTheDocument();
});

it("a safe confirmation returns focus to its own trigger after another Sheet was used", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="components" />);
  const ingredients = screen.getByRole("button", { name: "打开食材 Sheet" });
  await user.click(ingredients);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(ingredients).toHaveFocus());
  const confirmation = screen.getByRole("button", { name: "打开危险确认样例" });
  await user.click(confirmation);
  const safeChoice = within(screen.getByRole("dialog", { name: "移除这份样例？" })).getByRole("button", { name: "取消，保留样例" });
  await waitFor(() => expect(safeChoice).toHaveFocus());
  await user.keyboard("{Escape}");
  await waitFor(() => expect(confirmation).toHaveFocus());
});
