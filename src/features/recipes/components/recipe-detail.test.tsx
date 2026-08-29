import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecipeDetailView } from "@/features/recipes/components/recipe-detail";
import type { RecipeDetail } from "@/features/recipes/types";

vi.mock("@/features/recipes/components/recipe-actions", () => ({
  RecipeActions: () => <div>菜谱操作</div>,
}));

const recipe: RecipeDetail = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "番茄炒蛋",
  description: "家常做法",
  coverUrl: null,
  coverPath: null,
  baseServings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  isFavorite: false,
  category: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "家常菜" },
  tags: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "快手" }],
  personalNotes: "少放一点盐",
  updatedAt: "2026-08-23T00:00:00Z",
  ingredients: [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "鸡蛋", quantity: 2, quantityText: null, unit: "个", preparationNote: null, groupType: "main", sortOrder: 0 }],
  steps: [{ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", instruction: "打散鸡蛋。", imagePath: null, imageUrl: null, timerSeconds: 65, heatLevel: "中火", sortOrder: 0, ingredientLinks: [{ recipeIngredientId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", quantityOverride: null, quantityTextOverride: null, note: "先用" }] }],
  source: { sourceType: "url", sourceUrl: "https://example.com/recipe", sourceTitle: "来源菜谱", sourceAuthor: "小明", sourcePlatform: "example.com" },
};

describe("RecipeDetailView", () => {
  it("shows recipe metadata, ingredients, steps, and notes", () => {
    render(<RecipeDetailView recipe={recipe} />);
    expect(screen.getByRole("heading", { name: "番茄炒蛋" })).toBeInTheDocument();
    expect(screen.getByText("2 人份 · 准备 5 分钟 · 烹饪 10 分钟")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始烹饪" })).toBeInTheDocument();
    expect(screen.getByText("2 个")).toBeInTheDocument();
    expect(screen.getByText("打散鸡蛋。")) .toBeInTheDocument();
    expect(screen.getByText("鸡蛋 · 先用")).toBeInTheDocument();
    expect(screen.getByText("少放一点盐")).toBeInTheDocument();
    expect(screen.getByText("火候：中火")).toBeInTheDocument();
    expect(screen.getByText("计时 1 分 05 秒")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看原始来源" })).toHaveAttribute("href", "https://example.com/recipe");
  });
});
