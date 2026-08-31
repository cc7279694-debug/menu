import { describe, expect, it } from "vitest";

import {
  buildPreparationReminders,
  getDefaultMealLocalDateTime,
  getWeekRange,
  localDateTimeToUtc,
  utcToLocalDateTime,
} from "@/features/meal-plans/time";
import type { MealPlanEntry } from "@/features/meal-plans/types";

const entry: MealPlanEntry = {
  id: "entry-1",
  recipeId: "recipe-1",
  recipeTitle: "绿豆汤",
  recipeBaseServings: 2,
  mealSlot: "dinner",
  plannedAt: "2026-09-01T10:00:00.000Z",
  targetServings: 4,
  status: "planned",
  note: null,
  preparations: [],
};

describe("meal plan time helpers", () => {
  it("returns Monday through Sunday for the selected local week", () => {
    expect(getWeekRange("2026-09-02")).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });

  it("uses the approved default local times for each meal slot", () => {
    expect(getDefaultMealLocalDateTime("2026-09-01", "breakfast")).toBe("2026-09-01T08:00");
    expect(getDefaultMealLocalDateTime("2026-09-01", "lunch")).toBe("2026-09-01T12:00");
    expect(getDefaultMealLocalDateTime("2026-09-01", "dinner")).toBe("2026-09-01T18:00");
  });

  it("round-trips a device-local time through UTC storage", () => {
    const localValue = "2026-09-01T18:30";
    expect(utcToLocalDateTime(localDateTimeToUtc(localValue))).toBe(localValue);
  });

  it("computes exact cross-day reminders and keeps text-only timing without inventing a date", () => {
    const reminders = buildPreparationReminders(
      [{
        ...entry,
        preparations: [
          { id: "prep-1", instruction: "浸泡绿豆", leadTimeMinutes: 720, timingText: null },
          { id: "prep-2", instruction: "提前解冻", leadTimeMinutes: null, timingText: "提前一晚" },
        ],
      }],
      new Date("2026-08-31T23:00:00.000Z"),
    );

    expect(reminders).toEqual([
      expect.objectContaining({ preparationId: "prep-1", dueAt: "2026-08-31T22:00:00.000Z", state: "overdue" }),
      expect.objectContaining({ preparationId: "prep-2", dueAt: null, timingText: "提前一晚", state: "text" }),
    ]);
  });
});
