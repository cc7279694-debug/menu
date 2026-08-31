import { describe, expect, it } from "vitest";

import { aggregateMealPlanShoppingSelections } from "@/features/meal-plans/shopping";

describe("meal plan shopping aggregation", () => {
  it("sums servings for repeated recipes and ignores completed or skipped entries", () => {
    expect(aggregateMealPlanShoppingSelections([
      { recipeId: "recipe-a", targetServings: 2, status: "planned" },
      { recipeId: "recipe-a", targetServings: 3, status: "planned" },
      { recipeId: "recipe-b", targetServings: 4, status: "completed" },
      { recipeId: "recipe-c", targetServings: 2, status: "skipped" },
    ])).toEqual([{ recipeId: "recipe-a", selectedServings: 5 }]);
  });
});
