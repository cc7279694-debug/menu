import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { UiV2Showcase } from "./showcase";
import { CookingScreen } from "./cooking";
import { demoRecipes } from "./demo-data";
import { V2Button } from "../components";

afterEach(() => vi.unstubAllGlobals());

it("starts with exactly three root destinations and uses the existing library meaning", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase />);
  const nav = screen.getByRole("navigation", { name: "主导航" });
  expect(within(nav).getAllByRole("button")).toHaveLength(3);
  await user.click(within(nav).getByRole("button", { name: "菜谱" }));
  expect(screen.getByRole("heading", { name: "我的菜谱" })).toBeVisible();
  expect(screen.queryByText("最近加入")).not.toBeInTheDocument();
});

it("searches ingredients locally without starting a Provider request or writing browser storage", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  const save = vi.spyOn(Storage.prototype, "setItem");
  const user = userEvent.setup();
  render(<UiV2Showcase />);
  await user.type(screen.getByRole("searchbox", { name: "搜索我的菜谱" }), "鸡翅");
  expect(screen.getByRole("button", { name: /打开可乐鸡翅/ })).toBeVisible();
  expect(screen.queryByRole("button", { name: /打开蒜蓉西兰花/ })).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  save.mockRestore();
});

it("retains query when returning from a detail instead of resetting home", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase />);
  await user.type(screen.getByRole("searchbox", { name: "搜索我的菜谱" }), "可乐");
  await user.click(screen.getByRole("button", { name: /打开可乐鸡翅/ }));
  await user.click(screen.getByRole("button", { name: "返回菜谱" }));
  expect(screen.getByRole("searchbox", { name: "搜索我的菜谱" })).toHaveValue("可乐");
});

it("keeps created order and the non-overlapping duration boundary, leaving unknown durations in All", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="library" />);
  const rows = screen.getAllByRole("button", { name: /^打开/ });
  expect(rows.map((r) => r.getAttribute("aria-label"))).toEqual([
    "打开可乐鸡翅", "打开番茄鸡蛋汤", "打开蒜蓉西兰花", "打开啤酒鸭", "打开清蒸鱼",
  ]);
  await user.click(screen.getByRole("button", { name: "30–60 分钟" }));
  expect(screen.getByRole("button", { name: "打开啤酒鸭" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "打开可乐鸡翅" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "打开清蒸鱼" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "全部" }));
  expect(screen.getByRole("button", { name: "打开清蒸鱼" })).toBeVisible();
});

it("shows no-match recovery without silently running paid Finder", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  const user = userEvent.setup();
  render(<UiV2Showcase />);
  await user.type(screen.getByRole("searchbox", { name: "搜索我的菜谱" }), "没有这道菜");
  expect(screen.getByText("还没有找到这道菜")).toBeVisible();
  await user.click(screen.getByRole("button", { name: /帮我找.*没有这道菜/ }));
  expect(screen.getByRole("dialog", { name: "样板功能说明" })).toBeVisible();
  expect(request).not.toHaveBeenCalled();
});

it("offers four explicit add choices and restores focus on Escape", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase />);
  const trigger = screen.getByRole("button", { name: "新增菜谱" });
  await user.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "添加菜谱" });
  for (const name of ["手动录入", "文字／截图整理", "从网页链接导入", "帮我找做法"]) {
    expect(within(dialog).getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("renders all steps by default and keeps preparation and safety tips before them", () => {
  render(<UiV2Showcase initialScreen="detail" />);
  expect(screen.getByRole("heading", { name: "可乐鸡翅" })).toBeVisible();
  const preparation = screen.getByRole("heading", { name: "提前准备" });
  const tips = screen.getByRole("heading", { name: "关键事项" });
  const steps = screen.getByRole("heading", { name: "完整步骤" });
  expect(preparation.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(tips.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /单步查看步骤/ })).toHaveLength(6);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});

it("a title-only recipe stays valid, without a blank hero, fabricated macros or draft status", () => {
  render(<UiV2Showcase initialScreen="detail" initialScenario="title-only" />);
  expect(screen.getByRole("heading", { name: "清蒸鱼" })).toBeVisible();
  expect(screen.getByText("耗时未填写")).toBeVisible();
  expect(screen.getByRole("button", { name: "补充做法" })).toBeVisible();
  expect(screen.queryByRole("img", { name: /封面/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/草稿|完成度|0 kcal/)).not.toBeInTheDocument();
});

it("a broken cover falls back without losing the recipe content", () => {
  render(<UiV2Showcase initialScreen="detail" initialScenario="broken-image" />);
  fireEvent.error(screen.getByRole("img", { name: "可乐鸡翅封面（演示图片）" }));
  expect(screen.getByText("图片暂不可用")).toBeVisible();
  expect(screen.getByRole("heading", { name: "可乐鸡翅" })).toBeVisible();
});

it("detail shows the actual step photo and restores its preview trigger on close", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="detail" />);
  const trigger = screen.getByRole("button", { name: "查看步骤 3 大图" });
  const stepPhoto = within(trigger).getByRole("img");
  expect(stepPhoto).toHaveAttribute("src", demoRecipes[0].stepImages?.[2]);
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "步骤 3 图片" });
  expect(within(dialog).getByRole("img")).toHaveAttribute("src", demoRecipes[0].stepImages?.[2]);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(screen.getAllByRole("button", { name: /单步查看步骤/ })).toHaveLength(6);
});

it("the no-image detail does not invent step photo actions", () => {
  render(<UiV2Showcase initialScreen="detail" initialScenario="no-image" />);
  expect(screen.queryByRole("button", { name: /查看步骤.*大图/ })).not.toBeInTheDocument();
});

it("cooking photo preview stays at the same step without completing or navigating", async () => {
  const complete = vi.fn();
  const close = vi.fn();
  const user = userEvent.setup();
  render(<CookingScreen item={demoRecipes[0]} mode="focus" initialIndex={2} onClose={close} onComplete={complete} />);
  const trigger = screen.getByRole("button", { name: "查看步骤 3 大图" });
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "步骤 3 图片" });
  expect(within(dialog).getByRole("img")).toHaveAttribute("src", demoRecipes[0].stepImages?.[2]);
  await user.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
  expect(screen.getByText("第 3 步／共 6 步")).toBeVisible();
  expect(complete).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});

it("Guided navigation creates no completion, and final explicit completion cannot be repeated", async () => {
  const user = userEvent.setup();
  const complete = vi.fn();
  render(<CookingScreen item={demoRecipes[0]} mode="guided" initialIndex={0} onClose={vi.fn()} onComplete={complete} />);
  expect(screen.getByRole("button", { name: "上一步" })).toBeDisabled();
  for (let i = 0; i < 5; i++) await user.click(screen.getByRole("button", { name: "下一步" }));
  expect(screen.getByText("第 6 步／共 6 步")).toBeVisible();
  expect(complete).not.toHaveBeenCalled();
  await user.dblClick(screen.getByRole("button", { name: "完成这道菜" }));
  expect(complete).toHaveBeenCalledOnce();
});

it("Focus at the last step never offers completion", () => {
  render(<CookingScreen item={demoRecipes[0]} mode="focus" initialIndex={5} onClose={vi.fn()} onComplete={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "完成这道菜" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "下一步" })).toBeDisabled();
});

it("a name-only cooking preview does not invent a first step or a completion action", () => {
  render(<CookingScreen item={demoRecipes[4]} mode="guided" initialIndex={0} onClose={vi.fn()} onComplete={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "还没有步骤" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "下一步" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "完成这道菜" })).not.toBeInTheDocument();
});

it("returning from Focus restores the invoking step button's keyboard focus", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="detail" />);
  await user.click(screen.getByRole("button", { name: "单步查看步骤 3" }));
  await user.click(screen.getByRole("button", { name: "返回完整步骤" }));
  expect(screen.getByRole("button", { name: "单步查看步骤 3" })).toHaveFocus();
});

it("ingredients are a read-only Sheet which returns to the same cooking step", async () => {
  const user = userEvent.setup();
  render(<CookingScreen item={demoRecipes[0]} mode="guided" initialIndex={0} onClose={vi.fn()} onComplete={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "下一步" }));
  await user.click(screen.getByRole("button", { name: "查看食材" }));
  const dialog = await screen.findByRole("dialog", { name: "食材清单" });
  expect(within(dialog).getByText("500 克")).toBeVisible();
  expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.getByText("第 2 步／共 6 步")).toBeVisible();
});

it("busy buttons reject repeated activation and preserve visible action text", async () => {
  const click = vi.fn();
  const user = userEvent.setup();
  render(<V2Button busy onClick={click}>正在保存…</V2Button>);
  await user.click(screen.getByRole("button", { name: "正在保存…" }));
  expect(click).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "正在保存…" })).toBeDisabled();
});

it("component review gate stays disabled until an explicit check, and describes its demo-only effect", async () => {
  const user = userEvent.setup();
  render(<UiV2Showcase initialScreen="components" />);
  expect(screen.getByRole("button", { name: "保存审核样例" })).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
  await user.click(screen.getByRole("button", { name: "保存审核样例" }));
  expect(screen.getByText("样例已确认；未写入任何正式菜谱。")).toBeVisible();
});

it("the component showcase exposes a single main landmark", () => {
  render(<UiV2Showcase initialScreen="components" />);
  expect(screen.getAllByRole("main")).toHaveLength(1);
});
