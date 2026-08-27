import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { getPublicEnv, createServerClient } = vi.hoisted(() => ({
  getPublicEnv: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ getPublicEnv }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { updateSession } from "./middleware";

describe("Supabase middleware public PWA resources", () => {
  it("bypasses auth setup for public PWA shell files", async () => {
    const request = new NextRequest("http://food.test/sw.js");

    const response = await updateSession(request);

    expect(response.headers.get("location")).toBeNull();
    expect(getPublicEnv).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("keeps authenticated routes behind the existing auth boundary", async () => {
    getPublicEnv.mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    createServerClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await updateSession(
      new NextRequest("http://food.test/recipes"),
    );

    expect(response.headers.get("location")).toBe(
      "http://food.test/login?next=%2Frecipes",
    );
  });
});
