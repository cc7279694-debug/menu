import { describe, expect, it } from "vitest";

import { completeCookingRecordInputSchema, mealPlanCookingQuerySchema } from "@/features/cooking-history/schemas";

const validInput = {
  cookingRecordId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  mealPlanEntryId: null,
  startedAt: "2026-08-31T10:00:00.000Z",
  actualServings: 2,
  rating: 5,
  improvementNotes: "下次少放盐",
  photos: [{
    photoId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    storagePath: "11111111-1111-4111-8111-111111111111/cooking-records/cccccccc-cccc-4ccc-8ccc-cccccccccccc/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp",
    sortOrder: 0,
  }],
};

describe("cooking history schemas", () => {
  it("accepts an optional rating, note, and photo list", () => {
    expect(completeCookingRecordInputSchema.parse(validInput)).toEqual(validInput);
    expect(completeCookingRecordInputSchema.parse({ ...validInput, rating: null, improvementNotes: "", photos: [] })).toMatchObject({
      rating: null,
      improvementNotes: null,
      photos: [],
    });
  });

  it("rejects invalid ranges, timestamps, UUIDs, duplicate photos, and four photos", () => {
    for (const value of [
      { rating: 0 },
      { rating: 6 },
      { actualServings: 0 },
      { actualServings: 1000.01 },
      { improvementNotes: "x".repeat(2001) },
      { startedAt: "2026-08-31 10:00:00" },
      { cookingRecordId: "not-a-uuid" },
    ]) {
      expect(completeCookingRecordInputSchema.safeParse({ ...validInput, ...value }).success).toBe(false);
    }

    const fourth = { photoId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", storagePath: "u/c/r/4.webp", sortOrder: 1 };
    expect(completeCookingRecordInputSchema.safeParse({ ...validInput, photos: [validInput.photos[0], { ...fourth, photoId: "ffffffff-ffff-4fff-8fff-ffffffffffff", sortOrder: 1 }, { ...fourth, photoId: "99999999-9999-4999-8999-999999999999", sortOrder: 2 }, fourth] }).success).toBe(false);
    expect(completeCookingRecordInputSchema.safeParse({ ...validInput, photos: [validInput.photos[0], { ...validInput.photos[0], photoId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }] }).success).toBe(false);
    expect(completeCookingRecordInputSchema.safeParse({ ...validInput, photos: [validInput.photos[0], { ...validInput.photos[0], photoId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", sortOrder: 0 }] }).success).toBe(false);
  });

  it("only accepts an optional meal plan UUID and normalizes absent values to null", () => {
    expect(mealPlanCookingQuerySchema.parse({})).toEqual({ mealPlanEntryId: null });
    expect(mealPlanCookingQuerySchema.parse({ mealPlanEntryId: validInput.cookingRecordId })).toEqual({ mealPlanEntryId: validInput.cookingRecordId });
    expect(mealPlanCookingQuerySchema.safeParse({ mealPlanEntryId: "bad" }).success).toBe(false);
  });
});
