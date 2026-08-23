import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/recipes",
}));

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("renders content and both responsive navigation landmarks", () => {
    render(
      <AppShell>
        <h1>我的菜谱</h1>
      </AppShell>,
    );

    expect(screen.getByRole("heading", { name: "我的菜谱" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "桌面主导航" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "手机主导航" }),
    ).toBeInTheDocument();
  });
});
