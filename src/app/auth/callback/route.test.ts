import { describe, expect, it, vi } from "vitest";

const { exchangeCodeForSessionMock } = vi.hoisted(() => ({
  exchangeCodeForSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
  })),
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback", () => {
  it("exchanges the code and redirects to the validated internal route", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const response = await GET(
      new Request(
        "https://ordine.test/auth/callback?code=one-time-code&next=%2Ffavorites%3Fq%3Degg",
      ),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("one-time-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://ordine.test/favorites?q=egg",
    );
  });

  it("returns to login without exposing callback details when the code is invalid", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: new Error("expired"),
    });

    const response = await GET(
      new Request("https://ordine.test/auth/callback?code=expired-code"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://ordine.test/login?error=auth_callback",
    );
  });
});
