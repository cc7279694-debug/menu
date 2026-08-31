export type PreparationTimeUnit = "minute" | "hour" | "day";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export function toLeadTimeMinutes(value: number, unit: PreparationTimeUnit): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;

  const multiplier = unit === "day" ? MINUTES_PER_DAY : unit === "hour" ? MINUTES_PER_HOUR : 1;
  const minutes = Math.round(value * multiplier);
  return minutes > 0 && minutes <= 43200 ? minutes : null;
}

export function toPreparationTimeParts(minutes: number | null): {
  value: number | null;
  unit: PreparationTimeUnit;
} {
  if (!Number.isFinite(minutes) || !minutes || minutes <= 0) {
    return { value: null, unit: "minute" };
  }

  if (minutes % MINUTES_PER_DAY === 0) {
    return { value: minutes / MINUTES_PER_DAY, unit: "day" };
  }
  if (minutes % MINUTES_PER_HOUR === 0) {
    return { value: minutes / MINUTES_PER_HOUR, unit: "hour" };
  }
  if (minutes > MINUTES_PER_HOUR && minutes % 30 === 0) {
    return { value: minutes / MINUTES_PER_HOUR, unit: "hour" };
  }
  return { value: minutes, unit: "minute" };
}

export function formatPreparationLeadTime(minutes: number | null, timingText: string | null): string {
  if (timingText?.trim()) return timingText.trim();
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return "提前准备";

  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const remainingMinutes = minutes % MINUTES_PER_HOUR;
  const parts: string[] = [];
  if (days) parts.push(`${days} 天`);
  if (hours) parts.push(`${hours} 小时`);
  if (remainingMinutes) parts.push(`${remainingMinutes} 分钟`);
  return `提前 ${parts.join(" ")}`;
}

export function sortRecipePreparations<
  T extends { leadTimeMinutes: number | null; sortOrder: number; id?: string; preparationId?: string },
>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aHasTime = a.item.leadTimeMinutes !== null;
      const bHasTime = b.item.leadTimeMinutes !== null;
      if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
      if (aHasTime && bHasTime && a.item.leadTimeMinutes !== b.item.leadTimeMinutes) {
        return (b.item.leadTimeMinutes ?? 0) - (a.item.leadTimeMinutes ?? 0);
      }
      if (a.item.sortOrder !== b.item.sortOrder) return a.item.sortOrder - b.item.sortOrder;
      const aId = a.item.id ?? a.item.preparationId ?? "";
      const bId = b.item.id ?? b.item.preparationId ?? "";
      return aId.localeCompare(bId) || a.index - b.index;
    })
    .map(({ item }) => item);
}
