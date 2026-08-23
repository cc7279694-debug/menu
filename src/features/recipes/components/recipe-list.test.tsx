import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { RecipeListEmpty } from "@/features/recipes/components/recipe-list-empty";
import { RecipePagination } from "@/features/recipes/components/recipe-pagination";
import { RecipeSearchFilters } from "@/features/recipes/components/recipe-search-filters";
import type { RecipeSummary } from "@/features/recipes/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/recipes", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const recipe: RecipeSummary = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "番茄炒蛋",
  description: "家常做法",
  coverUrl: null,
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  isFavorite: false,
  category: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "家常菜" },
  tags: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "快手" }],
  updatedAt: "2026-08-23T00:00:00.000Z",
};

describe("recipe discovery components", () => {
  it("renders a recipe card with metadata and a detail link", () => {
    render(<RecipeCard recipe={recipe} />);

    expect(screen.getByRole("link", { name: /番茄炒蛋/ })).toHaveAttribute(
      "href",
      `/recipes/${recipe.id}`,
    );
    expect(screen.getByText(/2 人份/)).toBeInTheDocument();
    expect(screen.getByText("家常菜")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收藏" })).toBeInTheDocument();
  });

  it("shows distinct empty states for filtered and trash lists", () => {
    render(<RecipeListEmpty mode="filtered" />);
    expect(screen.getByText("没有找到匹配的菜谱")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "清除筛选" })).toHaveAttribute("href", "/recipes");

    render(<RecipeListEmpty mode="trash" />);
    expect(screen.getByText("回收站还是空的")).toBeInTheDocument();
  });

  it("keeps search and taxonomy filters in a GET form", () => {
    render(
      <RecipeSearchFilters
        categories={[{ id: recipe.category!.id, name: "家常菜" }]}
        current={{ query: "番茄", categoryId: recipe.category!.id, tagId: null, favoriteOnly: false, deletedOnly: false, page: 1 }}
        tags={recipe.tags}
      />,
    );

    expect(screen.getByRole("search")).toHaveAttribute("method", "get");
    expect(screen.getByDisplayValue("番茄")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "分类" })).toHaveValue(recipe.category!.id);
  });

  it("keeps the current page scope when paginating favorites", () => {
    render(
      <RecipePagination
        basePath="/favorites"
        query={{ query: "番茄", categoryId: null, tagId: null, favoriteOnly: true, deletedOnly: false, page: 1 }}
        totalCount={48}
      />,
    );

    expect(screen.getByRole("link", { name: "下一页" })).toHaveAttribute(
      "href",
      "/favorites?q=%E7%95%AA%E8%8C%84&favorite=1&page=2",
    );
  });
});
