import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock, signInWithOtpMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { signInWithOtp: signInWithOtpMock },
  })),
}));

import { requestEmailMagicLink } from "@/features/auth/actions";
import { INITIAL_AUTH_STATE } from "@/features/auth/schemas";

describe("requestEmailMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(
      new Headers({
        host: "ordine.test",
        "x-forwarded-proto": "https",
      }),
    );
    signInWithOtpMock.mockResolvedValue({ error: null });
  });

  it("sends a Supabase magic link back to the requested internal route", async () => {
    const formData = new FormData();
    formData.set("email", " USER@Example.COM ");
    formData.set("next", "/favorites?q=egg");

    const result = await requestEmailMagicLink(INITIAL_AUTH_STATE, formData);

    expect(result).toEqual({
      status: "link-sent",
      email: "user@example.com",
      message: "登录链接已发送，请检查邮箱",
    });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          "https://ordine.test/auth/callback?next=%2Ffavorites%3Fq%3Degg",
      },
    });
  });

  it("uses the request origin when forwarded host headers are unavailable", async () => {
    headersMock.mockResolvedValue(
      new Headers({ origin: "https://ordine.test" }),
    );
    const formData = new FormData();
    formData.set("email", "cook@example.com");

    const result = await requestEmailMagicLink(INITIAL_AUTH_STATE, formData);

    expect(result.status).toBe("link-sent");
    expect(signInWithOtpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo:
            "https://ordine.test/auth/callback?next=%2Frecipes",
        }),
      }),
    );
  });
});
