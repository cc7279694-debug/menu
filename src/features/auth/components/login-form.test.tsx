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
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeEnabled();
  });
});
