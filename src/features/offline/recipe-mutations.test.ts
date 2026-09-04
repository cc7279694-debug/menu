import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLastOfflineProfile: vi.fn(),
  putRecipeDraft: vi.fn(),
  deleteRecipeDraft: vi.fn(),
  rememberOfflineProfile: vi.fn(),
  updateRecipeSummaryCache: vi.fn(),
  putRecipeSummaryPage: vi.fn(),
  queueRecipeMutation: vi.fn(),
  deleteRecipeSummaryCache: vi.fn(),
  deleteRecipeSnapshot: vi.fn(),
  getRecipeSnapshot: vi.fn(),
  putRecipeSnapshot: vi.fn(),
}));

vi.mock("./database", () => mocks);

import { applyRecipeMutationLocally } from "./recipe-mutations";
import { saveRecipeLocally } from "./recipe-mutations";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

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

  it("saves a structured recipe draft and local snapshot before queueing cloud persistence", async () => {
    mocks.getLastOfflineProfile.mockResolvedValue({ userId: USER_ID, lastAuthenticatedAt: "2026-08-28T00:00:00.000Z" });
    mocks.putRecipeDraft.mockResolvedValue(undefined);
    mocks.rememberOfflineProfile.mockResolvedValue(undefined);
    mocks.putRecipeSummaryPage.mockResolvedValue(undefined);
    mocks.putRecipeSnapshot.mockResolvedValue(undefined);
    mocks.queueRecipeMutation.mockResolvedValue({ id: "mutation-save" });

    const input: RecipeSaveInput = {
      recipeId: RECIPE_ID,
      title: "离线番茄炒蛋",
      description: null,
      categoryId: null,
      tagIds: [],
      coverPath: null,
      baseServings: 2,
      prepMinutes: 5,
      cookMinutes: 8,
      personalNotes: null,
      nutrition: null,
      ingredients: [{ recipeIngredientId: "33333333-3333-4333-8333-333333333333", name: "番茄", quantity: 2, quantityText: null, unit: "个", preparationNote: null, groupType: "main", sortOrder: 0 }],
      steps: [{ stepId: "44444444-4444-4444-8444-444444444444", instruction: "炒熟", imagePath: null, timerSeconds: null, heatLevel: "中火", sortOrder: 0, ingredientLinks: [] }],
      preparations: [],
    };

    await expect(saveRecipeLocally({ userId: USER_ID, input })).resolves.toEqual({ recipeId: RECIPE_ID });
    expect(mocks.putRecipeDraft).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID, draftId: RECIPE_ID, payload: input }));
    expect(mocks.putRecipeSnapshot).toHaveBeenCalledWith(expect.objectContaining({ userId: USER_ID, recipeId: RECIPE_ID }));
    expect(mocks.putRecipeSummaryPage).toHaveBeenCalledWith(USER_ID, [expect.objectContaining({ id: RECIPE_ID, title: "离线番茄炒蛋" })], false);
    expect(mocks.queueRecipeMutation).toHaveBeenCalledWith({ userId: USER_ID, recipeId: RECIPE_ID, kind: "save", input, draftId: RECIPE_ID });
  });
});
