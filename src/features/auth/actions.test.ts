import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, signInWithOtpMock, verifyOtpMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { signInWithOtp: signInWithOtpMock, verifyOtp: verifyOtpMock },
  })),
}));

import { requestEmailOtp, verifyEmailOtp } from "@/features/auth/actions";
import { INITIAL_AUTH_STATE } from "@/features/auth/schemas";

describe("email OTP auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOtpMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });
  });

  it("sends an email OTP", async () => {
    const formData = new FormData();
    formData.set("email", " USER@Example.COM ");

    const result = await requestEmailOtp(INITIAL_AUTH_STATE, formData);

    expect(result).toEqual({
      status: "code-sent",
      email: "user@example.com",
      message: "验证码已发送，请检查邮箱",
    });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      options: { shouldCreateUser: true },
    });
  });

  it("verifies the email OTP and redirects to the requested internal route", async () => {
    const formData = new FormData();
    formData.set("email", "cook@example.com");
    formData.set("token", "123456");
    formData.set("next", "/favorites?q=egg");

    await verifyEmailOtp(INITIAL_AUTH_STATE, formData);

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: "cook@example.com",
      token: "123456",
      type: "email",
    });
    expect(redirectMock).toHaveBeenCalledWith("/favorites?q=egg");
  });
});
