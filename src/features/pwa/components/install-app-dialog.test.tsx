import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InstallAppDialog } from "./install-app-dialog";

describe("InstallAppDialog", () => {
  it("shows platform-specific iOS Safari instructions", () => {
    render(
      <InstallAppDialog
        onOpenChange={vi.fn()}
        open
        platform="ios-safari"
      />,
    );

    expect(screen.getByRole("dialog", { name: "安装谱序" })).toBeInTheDocument();
    expect(screen.getByText("点击 Safari 底部或顶部的分享按钮。")).toBeInTheDocument();
    expect(screen.getByText("选择“添加到主屏幕”。")).toBeInTheDocument();
  });

  it("explains that iOS embedded browsers must switch to Safari", () => {
    render(
      <InstallAppDialog
        onOpenChange={vi.fn()}
        open
        platform="ios-other"
      />,
    );

    expect(screen.getByText("请先用 Safari 打开此页面。")).toBeInTheDocument();
  });
});
