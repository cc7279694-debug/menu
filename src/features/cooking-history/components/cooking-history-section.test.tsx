import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CookingHistorySection } from "@/features/cooking-history/components/cooking-history-section";
import type { RecipeCookingHistory } from "@/features/cooking-history/types";

const empty: RecipeCookingHistory = { stats: { totalCount: 0, ratedCount: 0, averageRating: null, latestImprovementNotes: null }, recentRecords: [] };

describe("CookingHistorySection", () => {
  it("shows a useful empty state", () => {
    render(<CookingHistorySection history={empty} recipeTitle="番茄炒蛋" />);
    expect(screen.getByRole("heading", { name: "烹饪记录" })).toBeInTheDocument();
    expect(screen.getByText("完成一次引导烹饪后，这里会留下你的经验")).toBeInTheDocument();
  });

  it("shows stats, latest advice, localized dates, ratings, portions, and signed photos", () => {
    const history: RecipeCookingHistory = {
      stats: { totalCount: 2, ratedCount: 1, averageRating: 5, latestImprovementNotes: "少放盐" },
      recentRecords: [
        { id: "record-a", recipeId: "recipe-a", recipeTitleSnapshot: "番茄炒蛋", mealPlanEntryId: null, startedAt: "2026-08-30T10:00:00.000Z", completedAt: "2026-08-30T11:00:00.000Z", actualServings: 2, rating: 5, improvementNotes: "少放盐", photos: [{ id: "photo-a", imageUrl: "https://signed/photo-a", sortOrder: 0 }] },
        { id: "record-b", recipeId: "recipe-a", recipeTitleSnapshot: "番茄炒蛋", mealPlanEntryId: null, startedAt: "2026-08-29T10:00:00.000Z", completedAt: "2026-08-29T11:00:00.000Z", actualServings: 3, rating: null, improvementNotes: null, photos: [{ id: "photo-b", imageUrl: "https://signed/photo-b", sortOrder: 0 }] },
      ],
    };
    render(<CookingHistorySection history={history} recipeTitle="番茄炒蛋" />);
    expect(screen.getByText("已做 2 次")).toBeInTheDocument();
    expect(screen.getByText("平均 5.0 星")).toBeInTheDocument();
    expect(screen.getByText("下次注意：少放盐")).toBeInTheDocument();
    expect(screen.getByText("实际份数：2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "番茄炒蛋第 1 次成品照片 1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "番茄炒蛋第 2 次成品照片 1" })).toBeInTheDocument();
  });
});
