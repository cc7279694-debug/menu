import { describe, expect, it } from "vitest";

import {
  formatPreparationLeadTime,
  sortRecipePreparations,
  toLeadTimeMinutes,
  toPreparationTimeParts,
} from "./preparation-time";

describe("preparation time", () => {
  it("converts editor units to canonical minutes", () => {
    expect(toLeadTimeMinutes(30, "minute")).toBe(30);
    expect(toLeadTimeMinutes(1.5, "hour")).toBe(90);
    expect(toLeadTimeMinutes(2, "day")).toBe(2880);
    expect(toLeadTimeMinutes(0, "minute")).toBeNull();
    expect(toLeadTimeMinutes(Number.NaN, "minute")).toBeNull();
  });

  it("chooses stable editor units and readable labels", () => {
    expect(toPreparationTimeParts(30)).toEqual({ value: 30, unit: "minute" });
    expect(toPreparationTimeParts(90)).toEqual({ value: 1.5, unit: "hour" });
    expect(toPreparationTimeParts(2880)).toEqual({ value: 2, unit: "day" });
    expect(toPreparationTimeParts(null)).toEqual({ value: null, unit: "minute" });
    expect(formatPreparationLeadTime(30, null)).toBe("提前 30 分钟");
    expect(formatPreparationLeadTime(240, null)).toBe("提前 4 小时");
    expect(formatPreparationLeadTime(1500, null)).toBe("提前 1 天 1 小时");
    expect(formatPreparationLeadTime(null, "提前一晚")).toBe("提前一晚");
  });

  it("sorts exact lead times before text-only preparations", () => {
    const items = [
      { preparationId: "text", leadTimeMinutes: null, sortOrder: 0 },
      { preparationId: "short", leadTimeMinutes: 30, sortOrder: 0 },
      { preparationId: "long", leadTimeMinutes: 240, sortOrder: 9 },
      { preparationId: "same-b", leadTimeMinutes: 30, sortOrder: 0 },
      { preparationId: "same-a", leadTimeMinutes: 30, sortOrder: 0 },
    ];

    expect(sortRecipePreparations(items).map((item) => item.preparationId)).toEqual([
      "long",
      "same-a",
      "same-b",
      "short",
      "text",
    ]);
  });
});
