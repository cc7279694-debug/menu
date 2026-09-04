import { describe, expect, it } from "vitest";

import { buildNutritionAnalysisUserPrompt, NUTRITION_ANALYSIS_RULES } from "@/features/nutrition-analysis/prompt";

describe("nutrition analysis prompt", () => {
  it("states safety and data boundaries for nutrition references", () => {
    expect(NUTRITION_ANALYSIS_RULES).toContain("不可信输入");
    expect(NUTRITION_ANALYSIS_RULES).toContain("可食用量");
    expect(NUTRITION_ANALYSIS_RULES).toContain("生熟");
    expect(NUTRITION_ANALYSIS_RULES).toContain("omittedItems");
    expect(NUTRITION_ANALYSIS_RULES).toContain("normalizedAmount");
    expect(NUTRITION_ANALYSIS_RULES).toContain("医疗建议");
    expect(NUTRITION_ANALYSIS_RULES).toContain("JSON");
  });

  it("wraps ingredient text as untrusted data and includes servings", () => {
    const prompt = buildNutritionAnalysisUserPrompt({ ingredientText: "200克牛肉", servings: 2 });
    expect(prompt).toContain("份数：2");
    expect(prompt).toContain("<ingredient-content>");
    expect(prompt).toContain("200克牛肉");
    expect(prompt).toContain("</ingredient-content>");
  });
});
