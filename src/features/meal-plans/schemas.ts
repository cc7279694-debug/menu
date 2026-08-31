import { z } from "zod";

import { MEAL_PLAN_STATUSES, MEAL_SLOTS } from "@/features/meal-plans/types";

const uuidSchema = z.string().uuid();
const utcDateSchema = z.string().datetime({ offset: true });
const noteSchema = z.string().trim().max(500).nullish().transform((value) => value || null);

export const mealPlanEntryInputSchema = z.object({
  entryId: uuidSchema.optional(),
  recipeId: uuidSchema,
  mealSlot: z.enum(MEAL_SLOTS),
  plannedAt: utcDateSchema,
  targetServings: z.number().finite().min(0.25).max(1000)
    .refine((value) => Number(value.toFixed(2)) === value, "份数最多保留 2 位小数"),
  note: noteSchema,
});

export const mealPlanStatusInputSchema = z.object({
  entryId: uuidSchema,
  status: z.enum(MEAL_PLAN_STATUSES),
});

export const mealPlanDeleteInputSchema = z.object({ entryId: uuidSchema });

export const mealPlanWeekInputSchema = z.object({
  weekStart: z.string().date(),
});

export const mealPlanRangeInputSchema = z.object({
  startAt: utcDateSchema,
  endAt: utcDateSchema,
}).superRefine((value, context) => {
  const duration = new Date(value.endAt).getTime() - new Date(value.startAt).getTime();
  if (duration <= 0 || duration > 370 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: "custom", path: ["endAt"], message: "日期范围无效" });
  }
});

export type MealPlanEntryInput = z.output<typeof mealPlanEntryInputSchema>;
