import type {
  MealPlanEntry,
  MealSlot,
  PreparationReminder,
  PreparationReminderState,
} from "@/features/meal-plans/types";

export const DEFAULT_MEAL_TIMES: Record<MealSlot, string> = {
  breakfast: "08:00",
  lunch: "12:00",
  dinner: "18:00",
};

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekRange(anchorDate: string): string[] {
  const anchor = parseLocalDate(anchorDate);
  const mondayOffset = (anchor.getDay() + 6) % 7;
  anchor.setDate(anchor.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + index);
    return formatLocalDate(date);
  });
}

export function getDefaultMealLocalDateTime(date: string, slot: MealSlot) {
  return `${date}T${DEFAULT_MEAL_TIMES[slot]}`;
}

export function localDateTimeToUtc(value: string) {
  return new Date(value).toISOString();
}

export function utcToLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getReminderState(dueAt: Date, now: Date): PreparationReminderState {
  const delta = dueAt.getTime() - now.getTime();
  if (delta < 0) return "overdue";
  if (delta <= 60 * 60 * 1000) return "due";
  return "upcoming";
}

export function buildPreparationReminders(entries: MealPlanEntry[], now: Date): PreparationReminder[] {
  return entries
    .filter((entry) => entry.status === "planned")
    .flatMap((entry) => entry.preparations.map((preparation) => {
      if (preparation.leadTimeMinutes === null) {
        return {
          entryId: entry.id,
          recipeTitle: entry.recipeTitle,
          preparationId: preparation.id,
          instruction: preparation.instruction,
          dueAt: null,
          timingText: preparation.timingText,
          state: "text" as const,
        };
      }

      const dueAt = new Date(new Date(entry.plannedAt).getTime() - preparation.leadTimeMinutes * 60_000);
      return {
        entryId: entry.id,
        recipeTitle: entry.recipeTitle,
        preparationId: preparation.id,
        instruction: preparation.instruction,
        dueAt: dueAt.toISOString(),
        timingText: null,
        state: getReminderState(dueAt, now),
      };
    }))
    .sort((left, right) => {
      if (!left.dueAt) return 1;
      if (!right.dueAt) return -1;
      return left.dueAt.localeCompare(right.dueAt);
    });
}
