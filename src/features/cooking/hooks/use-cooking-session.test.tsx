import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cookingSessionKey, createCookingSession } from "../session-storage";
import type { RecipeDetail } from "@/features/recipes/types";
import { useCookingSession } from "./use-cooking-session";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const recipe: RecipeDetail = {
  id: "recipe-1",
  updatedAt: "2026-08-23T12:00:00.000Z",
  title: "番茄炒蛋",
  description: null,
  coverUrl: null,
  coverPath: null,
  baseServings: 2,
  prepMinutes: null,
  cookMinutes: null,
  isFavorite: false,
  category: null,
  tags: [],
  personalNotes: null,
  ingredients: [],
  steps: [
    { id: "step-3", instruction: "第三步", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 3, ingredientLinks: [] },
    { id: "step-1", instruction: "第一步", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 1, ingredientLinks: [] },
    { id: "step-2", instruction: "第二步", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 2, ingredientLinks: [] },
  ],
};

let storage: MemoryStorage;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  Object.defineProperty(globalThis, "Notification", { configurable: true, value: undefined });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useCookingSession", () => {
  it("restores the saved step and navigates in sorted step order", () => {
    const saved = createCookingSession(recipe, 4, Date.now());
    saved.currentStepId = "step-2";
    storage.setItem(cookingSessionKey(recipe.id), JSON.stringify(saved));

    const { result } = renderHook(() => useCookingSession({ recipe, requestedServings: 2, restart: false }));

    expect(result.current.currentStep.id).toBe("step-2");
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.progressPercent).toBe(67);

    act(() => result.current.previous());
    expect(result.current.currentStep.id).toBe("step-1");
    act(() => result.current.previous());
    expect(result.current.currentStep.id).toBe("step-1");

    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentStep.id).toBe("step-3");
    act(() => result.current.next());
    expect(result.current.currentStep.id).toBe("step-3");
  });

  it("persists navigation with the stable step id", () => {
    const { result } = renderHook(() => useCookingSession({ recipe, requestedServings: 2, restart: false }));

    act(() => result.current.next());

    const persisted = JSON.parse(storage.getItem(cookingSessionKey(recipe.id)) ?? "") as { currentStepId: string };
    expect(persisted.currentStepId).toBe("step-2");
  });

  it("keeps navigation available when local storage cannot be accessed", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("blocked"); },
    });

    const { result } = renderHook(() => useCookingSession({ recipe, requestedServings: 2, restart: false }));

    expect(result.current.storageAvailable).toBe(false);
    act(() => result.current.next());
    expect(result.current.currentStep.id).toBe("step-2");
  });

  it("recomputes remaining time from the wall clock when the page becomes visible", async () => {
    const { result } = renderHook(() => useCookingSession({ recipe, requestedServings: 2, restart: false }));

    await act(async () => {
      await result.current.startTimer("step-1", "煮沸", 120);
    });
    expect(result.current.timerViews[0].remainingSeconds).toBe(120);

    vi.setSystemTime(new Date("2026-08-23T12:05:00.000Z"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(result.current.timerViews[0]).toMatchObject({ remainingSeconds: 0, status: "finished" });
  });

  it("clears persisted session and timers on completion", async () => {
    const { result } = renderHook(() => useCookingSession({ recipe, requestedServings: 2, restart: false }));
    await act(async () => {
      await result.current.startTimer("step-1", "煮沸", 120);
    });

    act(() => result.current.complete());

    expect(storage.getItem(cookingSessionKey(recipe.id))).toBeNull();
    expect(result.current.session.timers).toEqual([]);
  });

  it("requests permission only when a timer is explicitly started and notifies a timer once", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    const notify = vi.fn();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: Object.assign(notify, { permission: "default", requestPermission }),
    });
    const { result, rerender } = renderHook(() => useCookingSession({ recipe, requestedServings: 2, restart: false }));

    expect(requestPermission).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.startTimer("step-1", "煮沸", 1);
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-08-23T12:00:02.000Z"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(notify).toHaveBeenCalledTimes(1);
    expect(result.current.session.timers[0].notifiedAt).toBe(Date.now());

    rerender();
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
