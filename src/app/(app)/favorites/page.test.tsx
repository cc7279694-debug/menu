import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => navigation);
vi.mock("@/features/recipes/components/recipe-list-page", () => ({
  RecipeListPage: vi.fn(() => null),
}));

import FavoritesPage from "@/app/(app)/favorites/page";

describe("FavoritesPage", () => {
  beforeEach(() => {
    navigation.redirect.mockClear();
  });

  it("redirects the legacy favorites route to nutrition", async () => {
    await FavoritesPage({ searchParams: Promise.resolve({}) });

    expect(navigation.redirect).toHaveBeenCalledWith("/nutrition");
  });
});
