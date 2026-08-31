import type { PreparationReminder } from "@/features/meal-plans/types";

const SENT_KEY = "ordine:meal-plan-notifications:v1";

export type NotificationCapability = NotificationPermission | "unsupported";

export function getNotificationCapability(): NotificationCapability {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationCapability> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function getSentIds() {
  if (typeof localStorage === "undefined") return new Set<string>();
  try {
    const value = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function sendDuePreparationNotifications(reminders: PreparationReminder[]) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return 0;

  const sent = getSentIds();
  let count = 0;
  for (const reminder of reminders) {
    const reminderKey = `${reminder.entryId}:${reminder.preparationId}:${reminder.dueAt ?? reminder.timingText ?? "text"}`;
    if ((reminder.state !== "due" && reminder.state !== "overdue") || sent.has(reminderKey)) {
      continue;
    }

    try {
      new Notification(`该准备 ${reminder.recipeTitle} 了`, {
        body: reminder.instruction,
        tag: `ordine-preparation-${reminder.preparationId}`,
      });
      sent.add(reminderKey);
      count += 1;
    } catch {
      // Browser notifications are an enhancement. The in-app reminder remains available.
    }
  }

  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent].slice(-200)));
  } catch {
    // Storage can be unavailable in private browsing; do not break the planner.
  }
  return count;
}
