import { describe, expect, it } from "vitest";

import {
  cancelStepTimer,
  dismissStepTimer,
  formatRemainingSeconds,
  getTimerView,
  markTimerNotified,
  startStepTimer,
} from "./timers";

describe("cooking timers", () => {
  it("uses absolute end times for a timer view", () => {
    const timers = startStepTimer([], { stepId: "s1", label: "步骤 1", durationSeconds: 90 }, 1_000);

    expect(timers[0].endsAt).toBe(91_000);
    expect(getTimerView(timers[0], 31_000).remainingSeconds).toBe(60);
    expect(getTimerView(timers[0], 120_000)).toMatchObject({ remainingSeconds: 0, status: "finished" });
  });

  it("restarts only the selected step and preserves chronological order", () => {
    const first = startStepTimer([], { stepId: "s1", label: "步骤 1", durationSeconds: 90 }, 1_000);
    const two = startStepTimer(first, { stepId: "s2", label: "步骤 2", durationSeconds: 30 }, 2_000);
    const restarted = startStepTimer(two, { stepId: "s1", label: "步骤 1 重启", durationSeconds: 45 }, 3_000);

    expect(restarted).toHaveLength(2);
    expect(restarted.map((timer) => timer.stepId)).toEqual(["s2", "s1"]);
    expect(restarted.find((timer) => timer.stepId === "s1")).toMatchObject({
      label: "步骤 1 重启",
      durationSeconds: 45,
      startedAt: 3_000,
      endsAt: 48_000,
      notifiedAt: null,
    });
  });

  it("counts parallel timers from the same clock without mutating them", () => {
    const timers = startStepTimer(
      startStepTimer([], { stepId: "s1", label: "步骤 1", durationSeconds: 90 }, 1_000),
      { stepId: "s2", label: "步骤 2", durationSeconds: 30 },
      1_000,
    );

    expect(getTimerView(timers[0], 11_000).remainingSeconds).toBe(80);
    expect(getTimerView(timers[1], 11_000).remainingSeconds).toBe(20);
    expect(timers).toEqual([
      { stepId: "s1", label: "步骤 1", durationSeconds: 90, startedAt: 1_000, endsAt: 91_000, notifiedAt: null },
      { stepId: "s2", label: "步骤 2", durationSeconds: 30, startedAt: 1_000, endsAt: 31_000, notifiedAt: null },
    ]);
  });

  it("marks an expired timer once and leaves active timers unchanged", () => {
    const timers = startStepTimer([], { stepId: "s1", label: "步骤 1", durationSeconds: 10 }, 1_000);
    const notified = markTimerNotified(timers, "s1", 11_000);

    expect(notified[0].notifiedAt).toBe(11_000);
    expect(markTimerNotified(notified, "s1", 12_000)).toBe(notified);
    expect(markTimerNotified(timers, "s1", 10_999)).toBe(timers);
  });

  it("cancels and dismisses only the selected timer", () => {
    const timers = startStepTimer(
      startStepTimer([], { stepId: "s1", label: "步骤 1", durationSeconds: 10 }, 1_000),
      { stepId: "s2", label: "步骤 2", durationSeconds: 20 },
      1_000,
    );

    expect(cancelStepTimer(timers, "s1").map((timer) => timer.stepId)).toEqual(["s2"]);
    expect(dismissStepTimer(timers, "s2").map((timer) => timer.stepId)).toEqual(["s1"]);
  });

  it("formats remaining seconds as minutes and seconds", () => {
    expect(formatRemainingSeconds(0)).toBe("00:00");
    expect(formatRemainingSeconds(65)).toBe("01:05");
    expect(formatRemainingSeconds(3661)).toBe("61:01");
  });
});
