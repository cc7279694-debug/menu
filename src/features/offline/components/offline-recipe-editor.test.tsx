import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { OfflineRecipeSnapshot } from "../types";

const { recipeEditor } = vi.hoisted(() => ({ recipeEditor: vi.fn(() => <div data-testid="recipe-editor-stub" />) }));
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
});
