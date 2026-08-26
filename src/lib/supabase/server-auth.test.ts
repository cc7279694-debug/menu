import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { getServerAuthContext } from "@/lib/supabase/server-auth";

describe("server auth context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated user and client from one server auth lookup", async () => {
    const user = { id: "11111111-1111-4111-8111-111111111111" };
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
    const client = { auth: { getUser } };
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    await expect(getServerAuthContext()).resolves.toEqual({
      supabase: client,
      user,
      error: null,
    });
    expect(mocks.createServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledTimes(1);
  });
});
