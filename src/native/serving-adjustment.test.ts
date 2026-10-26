import { describe, expect, it } from "vitest";

import { emptyDetails, recipeDetailsSchema } from "./recipe-model";
import {
  adjustIngredientAmount,
  isValidTargetServings,
  parseTargetServings,
  stepTargetServings,
} from "./serving-adjustment";

describe("temporary serving input", () => {
  it.each([0.1, 0.1000001, 0.125, 1, 2.345, 9999.999, 10000])(
    "accepts the full current RecipeDetails serving range: %s",
    (value) => {
      expect(recipeDetailsSchema.safeParse({ ...emptyDetails("测试"), servings: value }).success).toBe(true);
      expect(isValidTargetServings(value)).toBe(true);
    },
  );

  it.each([
    null, undefined, "3", "", true, false, {},
    -1, 0, 0.099999, 10000.00001, Number.NaN,
    Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MIN_VALUE,
  ])("rejects non-number or out-of-range target %s", (value) => {
    expect(isValidTargetServings(value)).toBe(false);
  });

  it("rejects arrays and boxed numbers without coercion", () => {
    expect(isValidTargetServings([])).toBe(false);
    expect(isValidTargetServings([3])).toBe(false);
    expect(isValidTargetServings(Object(3))).toBe(false);
  });

  it.each([
    ["0.1", 0.1], ["10000", 10000], ["2.345", 2.345],
    [" 3.50 ", 3.5], ["０．１２５", 0.125], ["　３．５０　", 3.5],
    ["0002.500", 2.5], [".5", 0.5], ["．５", 0.5],
  ] as const)("parses a complete decimal input %s", (text, expected) => {
    expect(parseTargetServings(text)).toBe(expected);
  });

  it.each([
    "", " ", "　", ".", "．", "2.", "２．", "-", "+", "-2", "+2",
    "0", "0.09", "10001", "NaN", "Infinity", "1e3", "1E3", "0x10",
    "1/2", "1,000", "1 2", "2 人", "①", "²", "𝟛", "3\n2", "2..5",
    "9".repeat(10000),
  ])("keeps invalid or partial input inactive: %s", (text) => {
    expect(parseTargetServings(text)).toBeNull();
  });
});

describe("temporary serving button steps", () => {
  it.each([
    [2.3, -1, 1.3],
    [1.3, 1, 2.3],
    [0.1, 1, 1.1],
    [0.1, -1, 0.1],
    [0.5, -1, 0.1],
    [1.05, -1, 0.1],
    [1.125, -1, 0.125],
    [2.345, -1, 1.345],
    [1.345, 1, 2.345],
    [2.123456789012345, -1, 1.123456789012345],
    [1.123456789012345, 1, 2.123456789012345],
    [9999.999, 1, 10000],
    [10000, 1, 10000],
    [10000, -1, 9999],
    [2, -1, 1],
    [2, 1, 3],
  ] as const)("steps %s by %s to the literal decimal %s", (value, delta, expected) => {
    expect(stepTargetServings(value, delta)).toBe(expected);
  });

  it.each([0, -1, 0.09, 10001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "does not invent an active target for invalid input %s",
    (value) => {
      expect(Object.is(stepTargetServings(value, -1), value)).toBe(true);
      expect(Object.is(stepTargetServings(value, 1), value)).toBe(true);
    },
  );

  it("keeps exact measurement results free from false approximation after stepping", () => {
    const decreased = stepTargetServings(2.3, -1);
    expect(adjustIngredientAmount("600 克", 3, decreased)).toEqual({
      originalAmount: "600 克",
      displayAmount: "260 克",
      state: "scaled",
      approximate: false,
    });
    expect(adjustIngredientAmount("600 克", 3, stepTargetServings(decreased, 1))).toEqual({
      originalAmount: "600 克",
      displayAmount: "460 克",
      state: "scaled",
      approximate: false,
    });
  });
});

describe("pure ingredient serving adjustment", () => {
  it.each([
    ["600 克", 3, 2, "400 克", false],
    ["330 毫升", 3, 2, "220 毫升", false],
    ["3 个", 3, 2, "2 个", false],
    ["2 个", 3, 2, "约 1.33 个", true],
    ["1.005 g", 1, 3, "约 3.02 g", true],
    ["2.675 g", 1, 3, "约 8.03 g", true],
    ["0.015 g", 1, 3, "约 0.05 g", true],
    ["0.1 g", 1, 3, "0.3 g", false],
    ["0.01 克", 1, 2, "0.02 克", false],
    ["0.0025 克", 1, 2, "约 0.01 克", true],
    ["1 个", 2, 1, "约 0.5 个", true],
    ["0.5 个", 1, 2, "1 个", false],
    ["1.5 片", 1, 2, "3 片", false],
    ["12.50 g", 1.25, 2.5, "25 g", false],
    ["1 g", 0.1, 10000, "100000 g", false],
    ["100000 g", 10000, 0.1, "1 g", false],
    ["900 g", 1, 2, "1800 g", false],
    ["900 ml", 1, 2, "1800 ml", false],
    [" ６００　克 ", 3, 2, "400 克", false],
    ["１．５０kg", 3, 2, "1 kg", false],
    [".5 L", 1, 2, "1 L", false],
    ["0 克", 1, 2, "0 克", false],
  ] as const)("scales %s from %s to %s servings", (amount, original, target, expected, approximate) => {
    expect(adjustIngredientAmount(amount, original, target)).toEqual({
      originalAmount: amount,
      displayAmount: expected,
      state: "scaled",
      approximate,
    });
  });

  it.each(["克", "g", "千克", "公斤", "kg", "毫升", "ml", "mL", "升", "L"])(
    "supports only explicit measurement alias %s without unit conversion",
    (unit) => {
      expect(adjustIngredientAmount(`3 ${unit}`, 3, 2)).toEqual({
        originalAmount: `3 ${unit}`,
        displayAmount: `2 ${unit}`,
        state: "scaled",
        approximate: false,
      });
    },
  );

  it.each(["个", "只", "颗", "片", "根", "瓣"])(
    "marks an exact fractional discrete count as approximate: %s",
    (unit) => {
      expect(adjustIngredientAmount(`1 ${unit}`, 2, 1)).toEqual({
        originalAmount: `1 ${unit}`,
        displayAmount: `约 0.5 ${unit}`,
        state: "scaled",
        approximate: true,
      });
    },
  );

  it.each(["1.50 kg", "　１．５０　kg　", "盐适量", "1/2 茶匙", "", "0.001 克"])(
    "returns the exact original text at ratio one: %s",
    (amount) => {
      expect(adjustIngredientAmount(amount, 3, 3)).toEqual({
        originalAmount: amount,
        displayAmount: amount,
        state: "original",
        approximate: false,
      });
    },
  );

  it.each([
    "适量", "盐适量", "少许", "半勺", "一把", "1～2 勺", "1/2 茶匙",
    "1袋（约200克）", "2勺加少许", "600", "600 克鸡翅", "鸡翅 600 克",
    "2 个 100 g", "1e3 g", "1E3 g", "0x10 g", "1,000 g", "-2 g", "+2 g",
    "① 克", "² g", "𝟛 g", "1. 克", "1..5 克", "1\n克", "3 袋", "2 茶匙",
    "1 G", "1 KG", "1 ML", "", " ", "3 g; alert(1)", "x".repeat(500),
  ])("preserves unsupported whole-field text %s", (amount) => {
    expect(adjustIngredientAmount(amount, 3, 2)).toEqual({
      originalAmount: amount,
      displayAmount: amount,
      state: "unsupported",
      approximate: false,
    });
  });

  it.each([
    [null, 2], [3, null], [null, null], [0, 2], [3, 0], [-1, 2], [3, -1],
    [0.09, 2], [3, 0.09], [10001, 2], [3, 10001],
    [Number.NaN, 2], [3, Number.NaN], [Number.POSITIVE_INFINITY, 2],
    [3, Number.NEGATIVE_INFINITY],
  ] as const)("preserves original amount for unavailable servings %s -> %s", (original, target) => {
    expect(adjustIngredientAmount("600 克", original, target)).toEqual({
      originalAmount: "600 克",
      displayAmount: "600 克",
      state: "unavailable",
      approximate: false,
    });
  });

  it.each([
    ["0.001 克", 1, 2],
    ["0.000000000000000000000000000000000000000001 克", 1, 2],
    ["9007199254740991 g", 1, 2],
    ["9007199254740992 g", 2, 3],
    [`${"9".repeat(490)} g`, 1, 2],
    [`${"9".repeat(10000)} g`, 1, 2],
  ] as const)("falls back instead of displaying zero or an unsafe large result: %s", (amount, original, target) => {
    expect(adjustIngredientAmount(amount, original, target)).toEqual({
      originalAmount: amount,
      displayAmount: amount,
      state: "unsafe",
      approximate: false,
    });
  });

  it("allows the documented exact safe-result ceiling and never emits exponent notation", () => {
    expect(adjustIngredientAmount("3002399751580330.33 g", 1, 3)).toEqual({
      originalAmount: "3002399751580330.33 g",
      displayAmount: "9007199254740990.99 g",
      state: "scaled",
      approximate: false,
    });
    expect(adjustIngredientAmount("4503599627370495.5 g", 1, 2)).toEqual({
      originalAmount: "4503599627370495.5 g",
      displayAmount: "9007199254740991 g",
      state: "scaled",
      approximate: false,
    });
  });

  it("leaves frozen original recipe objects and previously returned results untouched", () => {
    const original = Object.freeze({
      servings: 3,
      ingredients: Object.freeze([
        Object.freeze({ name: "鸡翅600克", amount: "600 克" }),
        Object.freeze({ name: "3号盐", amount: "少许" }),
      ]),
      steps: Object.freeze([Object.freeze({ instruction: "焯水 2 分钟" })]),
    });
    const first = Object.freeze(adjustIngredientAmount(original.ingredients[0].amount, original.servings, 2));
    const second = adjustIngredientAmount(original.ingredients[0].amount, original.servings, 4);
    const unsupported = adjustIngredientAmount(original.ingredients[1].amount, original.servings, 2);

    expect(original).toEqual({
      servings: 3,
      ingredients: [
        { name: "鸡翅600克", amount: "600 克" },
        { name: "3号盐", amount: "少许" },
      ],
      steps: [{ instruction: "焯水 2 分钟" }],
    });
    expect(first.displayAmount).toBe("400 克");
    expect(second.displayAmount).toBe("800 克");
    expect(second).not.toBe(first);
    expect(unsupported.displayAmount).toBe("少许");
  });
});
