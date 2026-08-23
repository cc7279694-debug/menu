import { describe, expect, it } from "vitest";

import { normalizeIngredientName } from "@/features/recipes/normalization";

describe("ingredient normalization", () => {
  it("uses Unicode compatibility normalization and collapses whitespace", () => {
    expect(normalizeIngredientName("  ＡＢＣ　  　番茄  ")).toBe("abc 番茄");
  });

  it("does not translate or guess ingredient aliases", () => {
    expect(normalizeIngredientName("小葱")).toBe("小葱");
    expect(normalizeIngredientName("香葱")).toBe("香葱");
  });
});
