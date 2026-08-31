import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getNotificationCapability,
  requestNotificationPermission,
  sendDuePreparationNotifications,
} from "@/features/meal-plans/notifications";
import type { PreparationReminder } from "@/features/meal-plans/types";

const reminder: PreparationReminder = {
  entryId: "entry-1",
  recipeTitle: "绿豆汤",
  preparationId: "prep-1",
  instruction: "浸泡绿豆",
  dueAt: "2026-08-31T22:00:00.000Z",
  timingText: null,
  state: "due",
};

describe("meal plan browser notifications", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("keeps the planner usable when notifications are unsupported", async () => {
    vi.stubGlobal("Notification", undefined);
    expect(getNotificationCapability()).toBe("unsupported");
    await expect(requestNotificationPermission()).resolves.toBe("unsupported");
    expect(sendDuePreparationNotifications([reminder])).toBe(0);
  });

  it("handles denied permission without throwing", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "default", requestPermission }));
    await expect(requestNotificationPermission()).resolves.toBe("denied");
  });

  it("sends each due reminder once on the current device", () => {
    const NotificationMock = vi.fn();
    vi.stubGlobal("Notification", Object.assign(NotificationMock, { permission: "granted" }));
    expect(sendDuePreparationNotifications([reminder])).toBe(1);
    expect(sendDuePreparationNotifications([reminder])).toBe(0);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
  });
});
