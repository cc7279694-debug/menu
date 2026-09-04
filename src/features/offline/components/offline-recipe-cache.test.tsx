import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecipeDetail } from "@/features/recipes/types";
import type { OfflineRecipeSnapshot } from "../types";

import { OfflineRecipeCache } from "./offline-recipe-cache";

const { rememberOfflineProfile, putRecipeSnapshot, cacheRecipeMediaFromUrl } = vi.hoisted(() => ({
  rememberOfflineProfile: vi.fn<(userId: string, authenticatedAt: string) => Promise<void>>().mockResolvedValue(undefined),
  putRecipeSnapshot: vi.fn<(snapshot: OfflineRecipeSnapshot) => Promise<void>>().mockResolvedValue(undefined),
  cacheRecipeMediaFromUrl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../database", () => ({ rememberOfflineProfile, putRecipeSnapshot }));
vi.mock("../media-cache", () => ({ cacheRecipeMediaFromUrl }));

const USER_ID = "user-a";
const recipe: RecipeDetail = {
  id: "recipe-a", title: "番茄炒蛋", description: null, coverUrl: null, coverPath: null,
  baseServings: 2, prepMinutes: 5, cookMinutes: 10, isFavorite: false, category: null,
  tags: [], preparationCount: 0, maxLeadTimeMinutes: null, updatedAt: "2026-08-27T00:00:00.000Z", personalNotes: null, ingredients: [], steps: [], preparations: [],
};

describe("OfflineRecipeCache", () => {
  it("remembers the authenticated profile then stores one recipe snapshot", async () => {
    render(<OfflineRecipeCache recipe={recipe} userId={USER_ID} />);

    await waitFor(() => {
      expect(rememberOfflineProfile).toHaveBeenCalledWith(USER_ID, expect.any(String));
      expect(putRecipeSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, recipeId: recipe.id }),
      );
    });
    expect(rememberOfflineProfile.mock.calls[0]?.[1]).toBe(
      (putRecipeSnapshot.mock.calls[0]?.[0] as { cachedAt: string }).cachedAt,
    );
  });

  it("reports a storage failure once without throwing or rendering content", async () => {
    const onCacheError = vi.fn();
    rememberOfflineProfile.mockRejectedValueOnce(new Error("storage unavailable"));

    const { container } = render(
      <OfflineRecipeCache recipe={recipe} userId={USER_ID} onCacheError={onCacheError} />,
    );

    await waitFor(() => expect(onCacheError).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it("caches the cover and step images in the background", async () => {
    const recipeWithImages: RecipeDetail = {
      ...recipe,
      coverUrl: "https://example.invalid/cover.jpg",
      coverPath: "recipes/cover.jpg",
      steps: [{
        id: "step-a",
        instruction: "翻炒",
        imageUrl: "https://example.invalid/step.jpg",
        imagePath: "recipes/step.jpg",
        timerSeconds: null,
        sortOrder: 0,
        ingredientLinks: [],
      }],
    };

    render(<OfflineRecipeCache recipe={recipeWithImages} userId={USER_ID} />);

    await waitFor(() => expect(cacheRecipeMediaFromUrl).toHaveBeenCalledTimes(2));
    expect(cacheRecipeMediaFromUrl).toHaveBeenCalledWith({
      userId: USER_ID,
      recipeId: recipe.id,
      mediaId: "cover",
      sourceKey: "recipes/cover.jpg",
      url: "https://example.invalid/cover.jpg",
    });
    expect(cacheRecipeMediaFromUrl).toHaveBeenCalledWith({
      userId: USER_ID,
      recipeId: recipe.id,
      mediaId: "step:step-a",
      sourceKey: "recipes/step.jpg",
      url: "https://example.invalid/step.jpg",
    });
  });
});
