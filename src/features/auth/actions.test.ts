import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  signInWithOtpMock,
  verifyOtpMock,
  signInWithPasswordMock,
  updateUserMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
      signInWithPassword: signInWithPasswordMock,
      updateUser: updateUserMock,
    },
  })),
}));

import {
  requestEmailOtp,
  setPassword,
  signInWithPassword,
  verifyEmailOtp,
} from "@/features/auth/actions";
import {
  INITIAL_AUTH_STATE,
  INITIAL_PASSWORD_STATE,
} from "@/features/auth/schemas";

describe("email OTP auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOtpMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });
    signInWithPasswordMock.mockResolvedValue({ error: null });
    updateUserMock.mockResolvedValue({ error: null });
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

  it("signs in with a password and redirects to the requested internal route", async () => {
    const formData = new FormData();
    formData.set("email", " USER@Example.COM ");
    formData.set("password", "cook123");
    formData.set("next", "/nutrition");

    await signInWithPassword(INITIAL_AUTH_STATE, formData);

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "cook123",
    });
    expect(redirectMock).toHaveBeenCalledWith("/nutrition");
  });

  it("does not expose provider errors for an invalid password", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: new Error("invalid login credentials"),
    });
    const formData = new FormData();
    formData.set("email", "cook@example.com");
    formData.set("password", "cook123");

    await expect(signInWithPassword(INITIAL_AUTH_STATE, formData)).resolves.toEqual({
      status: "error",
      message: "邮箱或密码不正确，请重试",
    });
  });

  it("sets a password for the authenticated user", async () => {
    const formData = new FormData();
    formData.set("password", "cook123");
    formData.set("confirmPassword", "cook123");

    await expect(setPassword(INITIAL_PASSWORD_STATE, formData)).resolves.toEqual({
      status: "success",
      message: "密码已保存，现在可以用密码登录",
    });
    expect(updateUserMock).toHaveBeenCalledWith({ password: "cook123" });
  });
});
