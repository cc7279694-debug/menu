import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/actions", () => ({
  setPassword: vi.fn(),
}));

import { PasswordSettingsForm } from "@/features/auth/components/password-settings-form";

describe("PasswordSettingsForm", () => {
  it("explains how password login works and exposes matching fields", () => {
    render(<PasswordSettingsForm />);

    expect(screen.getByRole("heading", { name: "登录密码" })).toBeInTheDocument();
    expect(screen.getByLabelText("新密码")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("再次输入密码")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("button", { name: "保存登录密码" }),
    ).toBeEnabled();
  });
});
