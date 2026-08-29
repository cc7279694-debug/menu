export type TimerParts = {
  minutes: string;
  seconds: string;
};

export function splitTimerSeconds(value: number | null): TimerParts {
  if (value === null || !Number.isFinite(value) || value < 1) {
    return { minutes: "", seconds: "" };
  }

  const totalSeconds = Math.floor(value);
  return {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60),
  };
}

export function combineTimerParts(minutesValue: string, secondsValue: string): number | null {
  const minutes = minutesValue.trim() === "" ? 0 : Number(minutesValue);
  const seconds = secondsValue.trim() === "" ? 0 : Number(secondsValue);

  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0) {
    return null;
  }

  const totalSeconds = minutes * 60 + seconds;
  return totalSeconds > 0 ? totalSeconds : null;
}
