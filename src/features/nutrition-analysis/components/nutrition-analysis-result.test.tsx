import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NutritionAnalysisResultView } from "@/features/nutrition-analysis/components/nutrition-analysis-result";
import type { NutritionAnalysisResult } from "@/features/nutrition-analysis/types";

const result: NutritionAnalysisResult = {
  total: { caloriesKcal: 600, proteinGrams: 42.5, fatGrams: null, carbsGrams: 80 },
  perServing: { caloriesKcal: 300, proteinGrams: 21.3, fatGrams: null, carbsGrams: 40 },
  ingredients: [{ name: "牛肉", normalizedAmount: "200克", caloriesKcal: 450, proteinGrams: 40 }],
  assumptions: ["米饭按熟重理解"],
  omittedItems: ["适量油"],
  confidence: "medium",
};

describe("NutritionAnalysisResultView", () => {
  it("shows reference totals, per-serving metrics, details and disclaimer", () => {
    render(<NutritionAnalysisResultView result={result} />);
    expect(screen.getByRole("heading", { name: "营养参考" })).toBeInTheDocument();
    expect(screen.getByText("AI 参考值")).toBeInTheDocument();
    expect(screen.getByText("总计")).toBeInTheDocument();
    expect(screen.getByText("每份")).toBeInTheDocument();
    expect(screen.getByText(/牛肉/)).toBeInTheDocument();
    expect(screen.getByText("米饭按熟重理解")).toBeInTheDocument();
    expect(screen.getByText("适量油")).toBeInTheDocument();
    expect(screen.getByText(/中等/)).toBeInTheDocument();
    expect(screen.getByText(/不构成医疗建议/)).toBeInTheDocument();
  });

  it("does not render missing metrics as zero", () => {
    render(<NutritionAnalysisResultView result={result} />);
    expect(screen.queryByText(/脂肪.*0克/)).not.toBeInTheDocument();
  });
});
