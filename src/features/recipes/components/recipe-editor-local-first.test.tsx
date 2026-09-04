import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLatestRecipeDraft: vi.fn().mockResolvedValue(null),
  getRecipeDraft: vi.fn().mockResolvedValue(null),
  putRecipeDraft: vi.fn().mockResolvedValue(undefined),
  deleteRecipeDraft: vi.fn().mockResolvedValue(undefined),
  saveRecipeLocally: vi.fn().mockResolvedValue({ recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
}));

vi.mock("@/features/offline/database", () => ({
  getLatestRecipeDraft: mocks.getLatestRecipeDraft,
  getRecipeDraft: mocks.getRecipeDraft,
  putRecipeDraft: mocks.putRecipeDraft,
  deleteRecipeDraft: mocks.deleteRecipeDraft,
}));
vi.mock("@/features/offline/recipe-mutations", () => ({ saveRecipeLocally: mocks.saveRecipeLocally }));
vi.mock("@/features/recipes/actions", () => ({
  createCategoryAction: vi.fn(),
  createTagAction: vi.fn(),
  saveRecipeAction: vi.fn(),
}));
vi.mock("@/features/recipe-imports/actions", () => ({
  confirmRecipeImportReviewAction: vi.fn(),
  finalizeRecipeImportAction: vi.fn(),
}));
vi.mock("@/features/nutrition-analysis/actions", () => ({ analyzeNutritionAction: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ getBrowserSupabaseClient: vi.fn() }));

import { RecipeEditor } from "./recipe-editor";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

const userId = "11111111-1111-4111-8111-111111111111";
const input: RecipeSaveInput = {
  recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "离线番茄炒蛋",
  description: null,
  categoryId: null,
  tagIds: [],
  coverPath: null,
  baseServings: 2,
  prepMinutes: null,
  cookMinutes: null,
  personalNotes: null,
  nutrition: null,
  ingredients: [{ recipeIngredientId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "番茄", quantity: 2, quantityText: null, unit: "个", preparationNote: null, sortOrder: 0 }],
  steps: [{ stepId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", instruction: "炒熟", imagePath: null, timerSeconds: null, sortOrder: 0, ingredientLinks: [] }],
  preparations: [],
};

describe("RecipeEditor local-first saving", () => {
  it("saves a text-only recipe locally and navigates without waiting for Supabase", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <RecipeEditor
        categories={[]}
        initialValue={input}
        localFirstUserId={userId}
        mode="edit"
        onSaved={onSaved}
        tags={[]}
        userId={userId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存菜谱" }));
    await waitFor(() => expect(mocks.saveRecipeLocally).toHaveBeenCalledWith({
      userId,
      draftId: input.recipeId,
      input: expect.objectContaining({ recipeId: input.recipeId, title: input.title }),
    }));
    expect(onSaved).toHaveBeenCalledWith(input.recipeId);
  });
});
