import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());
const getServerAuthContext = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server-auth", () => ({ getServerAuthContext }));

import { completeCookingRecordAction } from "@/features/cooking-history/actions";

const validInput = {
  cookingRecordId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  mealPlanEntryId: null,
  startedAt: "2026-08-31T10:00:00.000Z",
  actualServings: 2,
  rating: 5,
  improvementNotes: "下次少放盐",
  photos: [],
};

describe("completeCookingRecordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid input before authentication or RPC", async () => {
    await expect(completeCookingRecordAction({ ...validInput, rating: 6 })).resolves.toEqual({ ok: false, message: "请检查本次烹饪记录" });
    expect(getServerAuthContext).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    getServerAuthContext.mockResolvedValue({ supabase: {}, user: null, error: new Error("signed out") });
    await expect(completeCookingRecordAction(validInput)).resolves.toEqual({ ok: false, message: "请先登录后再保存烹饪记录" });
  });

  it("calls the completion RPC with validated input and revalidates recipe and plan", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: validInput.cookingRecordId, error: null });
    getServerAuthContext.mockResolvedValue({ supabase: { rpc }, user: { id: "user" }, error: null });
    await expect(completeCookingRecordAction(validInput)).resolves.toEqual({ ok: true, data: { cookingRecordId: validInput.cookingRecordId } });
    expect(rpc).toHaveBeenCalledWith("complete_cooking_record", { p_payload: validInput });
    expect(revalidatePath).toHaveBeenCalledWith(`/recipes/${validInput.recipeId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/plan");
  });

  it("returns a stable error when the RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate", hint: null } });
    getServerAuthContext.mockResolvedValue({ supabase: { rpc }, user: { id: "user" }, error: null });
    await expect(completeCookingRecordAction(validInput)).resolves.toEqual({ ok: false, message: "烹饪记录保存失败，请稍后重试" });
  });
});
