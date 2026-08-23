import type { CookingTimer, CookingTimerView } from "./types";

export type StartStepTimerInput = Pick<CookingTimer, "stepId" | "label" | "durationSeconds">;

export function startStepTimer(
  timers: CookingTimer[],
  input: StartStepTimerInput,
  now: number,
): CookingTimer[] {
  const nextTimer: CookingTimer = {
    ...input,
    startedAt: now,
    endsAt: now + input.durationSeconds * 1_000,
    notifiedAt: null,
  };

  return [...timers.filter((timer) => timer.stepId !== input.stepId), nextTimer].sort(
    (left, right) => left.startedAt - right.startedAt,
  );
}

export function cancelStepTimer(timers: CookingTimer[], stepId: string): CookingTimer[] {
  return timers.filter((timer) => timer.stepId !== stepId);
}

export function dismissStepTimer(timers: CookingTimer[], stepId: string): CookingTimer[] {
  return cancelStepTimer(timers, stepId);
}

export function markTimerNotified(timers: CookingTimer[], stepId: string, now: number): CookingTimer[] {
  let changed = false;
  const nextTimers = timers.map((timer) => {
    if (timer.stepId === stepId && timer.notifiedAt === null && now >= timer.endsAt) {
      changed = true;
      return { ...timer, notifiedAt: now };
    }

    return timer;
  });

  return changed ? nextTimers : timers;
}

export function getTimerView(timer: CookingTimer, now: number): CookingTimerView {
  const remainingSeconds = Math.max(0, Math.ceil((timer.endsAt - now) / 1_000));

  return {
    ...timer,
    remainingSeconds,
    status: remainingSeconds === 0 ? "finished" : "running",
  };
}

export function formatRemainingSeconds(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
