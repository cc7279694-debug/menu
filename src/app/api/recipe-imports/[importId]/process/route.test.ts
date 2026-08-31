import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerAuthContext: vi.fn(),
  processRecipeImport: vi.fn(),
  RecipeImportProcessError: class extends Error {
    constructor(public readonly code: string, message: string) { super(message); }
  },
}));
vi.mock("@/lib/supabase/server-auth", () => ({ getServerAuthContext: mocks.getServerAuthContext }));
vi.mock("@/features/recipe-imports/process", () => ({ processRecipeImport: mocks.processRecipeImport, RecipeImportProcessError: mocks.RecipeImportProcessError }));

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

  it.each([
    ["invalid_ai_output", "菜谱内容整理失败"],
    ["ai_unavailable", "AI 服务暂时不可用"],
    ["ai_model_unavailable", "当前整理模型不可用，请检查模型版本或改用自动推荐"],
  ])("returns sanitized error details for %s", async (code, message) => {
    mocks.getServerAuthContext.mockResolvedValue({ user: { id: "user" }, supabase: {} });
    mocks.processRecipeImport.mockRejectedValue(new mocks.RecipeImportProcessError(code, `${message} secret=sk-test`));
    const response = await POST(new Request("https://ordine.test", { method: "POST" }), { params: Promise.resolve({ importId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }) });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body).toEqual({ ok: false, code, message });
    expect(JSON.stringify(body)).not.toContain("sk-test");
  });
});
