import { z } from "zod";

const uuid = z.string().uuid();
const nullableTrimmedText = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().min(1).max(2000).nullable(),
);

const cookingPhotoSchema = z.object({
  photoId: uuid,
  storagePath: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).max(2),
});

export const completeCookingRecordInputSchema = z.object({
  cookingRecordId: uuid,
  recipeId: uuid,
  mealPlanEntryId: uuid.nullable(),
  startedAt: z.string().datetime({ offset: true }),
  actualServings: z.number().finite().min(0.25).max(1000),
  rating: z.number().int().min(1).max(5).nullable(),
  improvementNotes: nullableTrimmedText,
  photos: z.array(cookingPhotoSchema).max(3),
}).superRefine((value, context) => {
  const photoIds = new Set<string>();
  const sortOrders = new Set<number>();
  for (const [index, photo] of value.photos.entries()) {
    if (photoIds.has(photo.photoId)) {
      context.addIssue({ code: "custom", path: ["photos", index, "photoId"], message: "照片不能重复" });
    }
    if (sortOrders.has(photo.sortOrder)) {
      context.addIssue({ code: "custom", path: ["photos", index, "sortOrder"], message: "照片顺序不能重复" });
    }
    photoIds.add(photo.photoId);
    sortOrders.add(photo.sortOrder);
  }
});

export const mealPlanCookingQuerySchema = z.object({
  mealPlanEntryId: uuid.nullable().optional(),
}).transform((value) => ({ mealPlanEntryId: value.mealPlanEntryId ?? null }));

export type CompleteCookingRecordInputOutput = z.output<typeof completeCookingRecordInputSchema>;
