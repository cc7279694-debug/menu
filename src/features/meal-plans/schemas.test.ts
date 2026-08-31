import { describe, expect, it } from "vitest";

import { mealPlanEntryInputSchema, mealPlanStatusInputSchema } from "@/features/meal-plans/schemas";

describe("meal plan schemas", () => {
  it("accepts a valid UTC entry and normalized fields", () => {
    expect(mealPlanEntryInputSchema.parse({
      recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mealSlot: "breakfast",
      plannedAt: "2026-09-01T00:00:00.000Z",
      targetServings: 2,
      note: "少盐",
    })).toEqual(expect.objectContaining({ mealSlot: "breakfast", targetServings: 2 }));
  });

  it("rejects impossible servings, local timestamps, and overlong notes", () => {
    expect(() => mealPlanEntryInputSchema.parse({
      recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mealSlot: "lunch",
      plannedAt: "2026-09-01T12:00",
      targetServings: 0,
      note: "a".repeat(501),
    })).toThrow();
  });

  it("only allows the three status transitions exposed by the planner", () => {
    expect(mealPlanStatusInputSchema.parse({
      entryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "completed",
    }).status).toBe("completed");
    expect(() => mealPlanStatusInputSchema.parse({
      entryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "deleted",
    })).toThrow();
  });
});
