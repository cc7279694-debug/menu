import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecipeNutritionCard } from "@/features/recipes/components/recipe-nutrition";

describe("RecipeNutritionCard", () => {
  it("shows only the supplied per-serving metrics and estimated marker", () => {
    render(
      <RecipeNutritionCard
        nutrition={{
          caloriesKcal: 420,
          proteinGrams: null,
          fatGrams: 18.5,
          carbsGrams: null,
          isEstimated: true,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "每份营养" })).toBeInTheDocument();
    expect(screen.getByText("420千卡")).toBeInTheDocument();
    expect(screen.getByText("18.5克")).toBeInTheDocument();
    expect(screen.getByText("估算")).toBeInTheDocument();
    expect(screen.queryByText("蛋白质")).not.toBeInTheDocument();
  });

  it("stays hidden when nutrition is unavailable", () => {
    const { container } = render(<RecipeNutritionCard nutrition={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
