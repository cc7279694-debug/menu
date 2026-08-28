import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/actions", () => ({
  requestEmailOtp: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

import { LoginForm } from "@/features/auth/components/login-form";

describe("LoginForm", () => {
  it("starts with an accessible email step", () => {
    render(<LoginForm nextPath="/recipes" />);

    expect(screen.getByLabelText("邮箱地址")).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: "发送验证码" }),
    ).toBeEnabled();
    expect(screen.queryByLabelText("6 位验证码")).not.toBeInTheDocument();
  });

  it("shows a callback error without exposing provider details", () => {
    render(
      <LoginForm
        initialMessage="登录链接无效或已过期，请重新发送"
        nextPath="/recipes"
      />,
    );

    expect(
      screen.getByText("登录链接无效或已过期，请重新发送"),
    ).toBeInTheDocument();
  });
});
