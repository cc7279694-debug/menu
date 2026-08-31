import type { ActionResult } from "@/features/recipes/types";

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;
export const MEAL_PLAN_STATUSES = ["planned", "completed", "skipped"] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];
export type MealPlanStatus = (typeof MEAL_PLAN_STATUSES)[number];

export type MealPlanPreparation = {
  id: string;
  instruction: string;
  leadTimeMinutes: number | null;
  timingText: string | null;
};

export type MealPlanEntry = {
  id: string;
  recipeId: string;
  recipeTitle: string;
  recipeBaseServings: number;
  mealSlot: MealSlot;
  plannedAt: string;
  targetServings: number;
  status: MealPlanStatus;
  note: string | null;
  preparations: MealPlanPreparation[];
};

export type PreparationReminderState = "upcoming" | "due" | "overdue" | "text";

export type PreparationReminder = {
  entryId: string;
  recipeTitle: string;
  preparationId: string;
  instruction: string;
  dueAt: string | null;
  timingText: string | null;
  state: PreparationReminderState;
};

export type MealPlanActionResult<T> = ActionResult<T>;
