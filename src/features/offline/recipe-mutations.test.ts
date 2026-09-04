import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLastOfflineProfile: vi.fn(),
  updateRecipeSummaryCache: vi.fn(),
  queueRecipeMutation: vi.fn(),
  deleteRecipeSummaryCache: vi.fn(),
  deleteRecipeSnapshot: vi.fn(),
  getRecipeSnapshot: vi.fn(),
  putRecipeSnapshot: vi.fn(),
}));

vi.mock("./database", () => mocks);

import { applyRecipeMutationLocally } from "./recipe-mutations";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RECIPE_ID = "22222222-2222-4222-8222-222222222222";

describe("applyRecipeMutationLocally", () => {
  it("applies a trash mutation immediately and requests background sync", async () => {
    mocks.getLastOfflineProfile.mockResolvedValue({ userId: USER_ID, lastAuthenticatedAt: "2026-08-28T00:00:00.000Z" });
    mocks.updateRecipeSummaryCache.mockResolvedValue(undefined);
    mocks.queueRecipeMutation.mockResolvedValue({ id: "mutation-1" });
    const dispatch = vi.spyOn(window, "dispatchEvent");

    await expect(applyRecipeMutationLocally({ recipeId: RECIPE_ID, kind: "move-to-trash" })).resolves.toEqual({ userId: USER_ID });
    expect(mocks.updateRecipeSummaryCache).toHaveBeenCalledWith(USER_ID, RECIPE_ID, { deleted: true });
    expect(mocks.queueRecipeMutation).toHaveBeenCalledWith({ userId: USER_ID, recipeId: RECIPE_ID, kind: "move-to-trash" });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "recipio:sync-requested" }));
    dispatch.mockRestore();
  });

  it("returns null when no authenticated offline profile is available", async () => {
    mocks.getLastOfflineProfile.mockResolvedValue(null);

    await expect(applyRecipeMutationLocally({ recipeId: RECIPE_ID, kind: "restore" })).resolves.toBeNull();
    expect(mocks.queueRecipeMutation).not.toHaveBeenCalled();
  });
});
