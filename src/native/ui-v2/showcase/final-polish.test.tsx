import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { UiV2Showcase } from "./showcase";

it("the compact shortcut group keeps Add and Find separate and never starts an online request", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  try {
    const user = userEvent.setup();
    render(<UiV2Showcase />);
    const actions = screen.getByRole("group", { name: "菜谱快捷操作" });
    expect(within(actions).getAllByRole("button")).toHaveLength(2);
    await user.click(within(actions).getByRole("button", { name: /添加菜谱/ }));
    const add = screen.getByRole("dialog", { name: "添加菜谱" });
    expect(within(add).getByRole("button", { name: /手动录入/ })).toBeVisible();
    expect(within(add).getByRole("button", { name: /文字／截图整理/ })).toBeVisible();
    expect(within(add).getByRole("button", { name: /从网页链接导入/ })).toBeVisible();
    expect(within(add).getByRole("button", { name: /帮我找做法/ })).toBeVisible();
    await user.keyboard("{Escape}");
    await user.click(within(actions).getByRole("button", { name: /帮我找做法/ }));
    expect(screen.getByRole("dialog", { name: "样板功能说明" })).toHaveTextContent("不连接 Finder、不发起网络请求");
    expect(request).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
