import { describe, expect, it } from "vitest";

import {
  formatIngredientAmount,
  formatKitchenQuantity,
  isValidTargetServings,
  parseTargetServings,
  scaleQuantity,
} from "@/features/ingredients/quantities";

describe("shared quantity helpers", () => {
  it("keeps the cooking serving validation contract", () => {
    expect(isValidTargetServings("0.25")).toBe(true);
    expect(isValidTargetServings("1000")).toBe(true);
    expect(isValidTargetServings("0.249")).toBe(false);
    expect(isValidTargetServings("1000.001")).toBe(false);
    expect(isValidTargetServings("2.345")).toBe(false);
  });

  it("parses servings with the existing fallback behavior", () => {
    expect(parseTargetServings("0", 2)).toBe(2);
    expect(parseTargetServings("4.5", 2)).toBe(4.5);
    expect(parseTargetServings("2.345", 2)).toBe(2);
    expect(parseTargetServings(2.345, 2)).toBe(2);
  });

  it("scales and formats common kitchen quantities", () => {
    expect(scaleQuantity(2, 2, 4)).toBe(4);
    expect(formatKitchenQuantity(1.5)).toBe("1 1/2");
    expect(formatKitchenQuantity(0.333333)).toBe("1/3");
    expect(formatKitchenQuantity(1.26)).toBe("1.26");
  });

  it("formats text-first ingredient amounts and falls back to 适量", () => {
    expect(formatIngredientAmount(2, null, "个")).toBe("2 个");
    expect(formatIngredientAmount(2, "少许", "个")).toBe("少许 个");
    expect(formatIngredientAmount(null, "少许", null)).toBe("少许");
    expect(formatIngredientAmount(null, null, null)).toBe("适量");
  });
});
