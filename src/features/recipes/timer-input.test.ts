import { describe, expect, it } from "vitest";

import { combineTimerParts, splitTimerSeconds } from "./timer-input";

describe("recipe timer input", () => {
  it("splits stored seconds into minute and second fields", () => {
    expect(splitTimerSeconds(125)).toEqual({ minutes: "2", seconds: "5" });
    expect(splitTimerSeconds(null)).toEqual({ minutes: "", seconds: "" });
  });

  it("combines minute and second fields into stored seconds", () => {
    expect(combineTimerParts("2", "5")).toBe(125);
    expect(combineTimerParts("", "")).toBeNull();
    expect(combineTimerParts("1", "")).toBe(60);
  });
});
