import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLatestRecipeDraft: vi.fn().mockResolvedValue(null),
  getRecipeDraft: vi.fn().mockResolvedValue(null),
  putRecipeDraft: vi.fn().mockResolvedValue(undefined),
  deleteRecipeDraft: vi.fn().mockResolvedValue(undefined),
  saveRecipeLocally: vi.fn().mockResolvedValue({ recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
  saveRecipeAction: vi.fn(),
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
  saveRecipeAction: mocks.saveRecipeAction,
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

  it("keeps the offline editor local and disables cloud-only controls", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <RecipeEditor
        availability="offline"
        categories={[]}
        initialValue={input}
        localFirstUserId={userId}
        mode="edit"
        onSaved={onSaved}
        tags={[]}
        userId={userId}
      />,
    );

    expect(screen.getByText("当前离线，文字内容会先保存在本机，联网后自动同步。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 营养分析" })).toBeDisabled();
    expect(screen.getByText("AI 营养分析需要联网；现有营养数据仍可手动修改。")).toBeInTheDocument();
    expect(screen.queryByLabelText("菜谱封面")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存菜谱" }));

    await waitFor(() => expect(mocks.saveRecipeLocally).toHaveBeenCalled());
    expect(mocks.saveRecipeAction).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(input.recipeId);
  });

  it("does not fall back to a cloud save when offline storage fails", async () => {
    const user = userEvent.setup();
    mocks.saveRecipeLocally.mockRejectedValueOnce(new Error("storage unavailable"));
    render(
      <RecipeEditor
        availability="offline"
        categories={[]}
        initialValue={input}
        localFirstUserId={userId}
        mode="edit"
        onSaved={vi.fn()}
        tags={[]}
        userId={userId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存菜谱" }));

    expect(await screen.findByText("本机保存失败，请检查浏览器存储空间后重试")).toBeInTheDocument();
    expect(mocks.saveRecipeAction).not.toHaveBeenCalled();
  });
});
