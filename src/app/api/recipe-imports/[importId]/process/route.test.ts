import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerAuthContext: vi.fn(), processRecipeImport: vi.fn() }));
vi.mock("@/lib/supabase/server-auth", () => ({ getServerAuthContext: mocks.getServerAuthContext }));
vi.mock("@/features/recipe-imports/process", () => ({ processRecipeImport: mocks.processRecipeImport }));

import { GET, POST } from "@/app/api/recipe-imports/[importId]/process/route";

describe("recipe import process route", () => {
  it("does not expose draft data in GET", async () => {
    const builder = { select: vi.fn(() => builder), eq: vi.fn(() => builder), maybeSingle: vi.fn().mockResolvedValue({ data: { status: "queued", error_code: null }, error: null }) };
    mocks.getServerAuthContext.mockResolvedValue({ user: { id: "user" }, supabase: { from: vi.fn(() => builder) } });
    const response = await GET(new Request("https://ordine.test/api/recipe-imports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/process"), { params: Promise.resolve({ importId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "queued", errorCode: null });
  });

  it("returns only review status on successful POST", async () => {
    mocks.getServerAuthContext.mockResolvedValue({ user: { id: "user" }, supabase: {} });
    mocks.processRecipeImport.mockResolvedValue({ status: "review", draft: { title: "secret" } });
    const response = await POST(new Request("https://ordine.test", { method: "POST" }), { params: Promise.resolve({ importId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) });
    expect(await response.json()).toEqual({ ok: true, status: "review" });
  });
});
