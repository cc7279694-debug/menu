import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecipeDetail } from "@/features/recipes/types";
import type { OfflineRecipeSnapshot } from "../types";

import { OfflineRecipeCache } from "./offline-recipe-cache";

const { rememberOfflineProfile, putRecipeSnapshot } = vi.hoisted(() => ({
  rememberOfflineProfile: vi.fn<(userId: string, authenticatedAt: string) => Promise<void>>().mockResolvedValue(undefined),
  putRecipeSnapshot: vi.fn<(snapshot: OfflineRecipeSnapshot) => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock("../database", () => ({ rememberOfflineProfile, putRecipeSnapshot }));

const USER_ID = "user-a";
const recipe: RecipeDetail = {
  id: "recipe-a", title: "番茄炒蛋", description: null, coverUrl: null, coverPath: null,
  baseServings: 2, prepMinutes: 5, cookMinutes: 10, isFavorite: false, category: null,
  tags: [], updatedAt: "2026-08-27T00:00:00.000Z", personalNotes: null, ingredients: [], steps: [],
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
});
