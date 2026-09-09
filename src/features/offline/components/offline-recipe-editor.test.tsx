import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createLocalRecipeService } from "@/features/local-data/local-recipe-service";
import type { RecipeRepository } from "@/features/local-data/recipe-repository";
import type { LocalRecipeRecord } from "@/features/local-data/types";
import type { RecipeSaveInput } from "@/features/recipes/schemas";
import type { OfflineRecipeSnapshot } from "../types";

const { recipeEditor } = vi.hoisted(() => ({
  recipeEditor: vi.fn((...args: unknown[]) => {
    void args;
    return <div data-testid="recipe-editor-stub" />;
  }),
}));
vi.mock("@/features/recipes/components/recipe-editor", () => ({ RecipeEditor: recipeEditor }));

import { OfflineRecipeEditor } from "./offline-recipe-editor";

const snapshot = {
  userId: "user-a",
  recipeId: "recipe-a",
  cachedAt: "2026-09-05T00:00:00.000Z",
  lastOpenedAt: "2026-09-05T00:00:00.000Z",
  dataVersion: 3,
  recipe: {
    id: "recipe-a", title: "番茄炒蛋", description: null, coverUrl: null, coverPath: null,
    baseServings: 2, prepMinutes: null, cookMinutes: null, isFavorite: false,
    category: null, tags: [], preparationCount: 0, maxLeadTimeMinutes: null,
    updatedAt: "2026-09-05T00:00:00.000Z", personalNotes: null, ingredients: [], steps: [], preparations: [], nutrition: null,
  },
} as OfflineRecipeSnapshot;

const PROMOTED_RECIPE_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE = {
  sourceType: "url" as const,
  sourceUrl: "https://example.com/tomato-eggs",
  sourceTitle: "原始菜谱",
  sourceAuthor: "作者",
  sourcePlatform: "示例站",
};
const promotionInput: RecipeSaveInput = {
  recipeId: PROMOTED_RECIPE_ID,
  title: "番茄炒蛋",
  description: null,
  categoryId: null,
  tagIds: [],
  coverPath: null,
  baseServings: 2,
  prepMinutes: null,
  cookMinutes: null,
  personalNotes: null,
  nutrition: null,
  ingredients: [{ recipeIngredientId: "22222222-2222-4222-8222-222222222222", name: "番茄", quantity: 2, quantityText: null, unit: "个", preparationNote: null, sortOrder: 0 }],
  steps: [{ stepId: "33333333-3333-4333-8333-333333333333", instruction: "炒熟", imagePath: null, timerSeconds: null, sortOrder: 0, ingredientLinks: [] }],
  preparations: [],
};

describe("OfflineRecipeEditor", () => {
  it("configures the shared editor for an offline edit", () => {
    render(<OfflineRecipeEditor mode="edit" snapshot={snapshot} media={[]} userId="user-a" snapshots={[snapshot]} />);

    expect(screen.getByTestId("recipe-editor-stub")).toBeInTheDocument();
    expect(recipeEditor).toHaveBeenCalledWith(expect.objectContaining({
      availability: "offline",
      localFirstUserId: "user-a",
      mode: "edit",
      userId: "user-a",
    }), undefined);
  });

  it("preserves legacy favorite and source metadata when an edit promotes the recipe locally", async () => {
    let stored: LocalRecipeRecord | null = null;
    const repository: RecipeRepository = {
      list: async () => stored ? [stored] : [],
      get: async () => stored,
      save: async (input) => {
        stored = {
          ...input,
          id: input.id ?? PROMOTED_RECIPE_ID,
          createdAt: "2026-09-08T09:00:00.000Z",
          updatedAt: "2026-09-08T09:00:00.000Z",
          deletedAt: null,
        };
        return stored;
      },
      moveToTrash: async () => undefined,
      restore: async () => undefined,
      permanentlyDelete: async () => undefined,
    };
    const legacySnapshot: OfflineRecipeSnapshot = {
      ...snapshot,
      recipeId: PROMOTED_RECIPE_ID,
      recipe: {
        ...snapshot.recipe,
        id: PROMOTED_RECIPE_ID,
        isFavorite: true,
        source: SOURCE,
      },
    };
    render(
      <OfflineRecipeEditor
        media={[]}
        mode="edit"
        recipeService={createLocalRecipeService(repository)}
        snapshot={legacySnapshot}
        snapshots={[legacySnapshot]}
        userId="legacy-user"
      />,
    );
    const latestCall = recipeEditor.mock.calls.at(-1);
    expect(latestCall).toBeDefined();
    const [props] = latestCall as [{
      saveLocalRecipe: (input: RecipeSaveInput) => Promise<{ recipeId: string }>;
    }];

    await props.saveLocalRecipe(promotionInput);

    expect(stored).toMatchObject({ isFavorite: true, source: SOURCE });
  });
});
