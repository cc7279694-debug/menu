"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RecipeDetail } from "@/features/recipes/types";

import {
  clearCookingSession,
  createCookingSession,
  loadCookingSession,
  saveCookingSession,
} from "../session-storage";
import {
  cancelStepTimer,
  dismissStepTimer,
  getTimerView,
  markTimerNotified,
  startStepTimer,
} from "../timers";
import type { CookingSessionV1, CookingTimerView } from "../types";

export type CookingSessionController = {
  session: CookingSessionV1;
  currentStep: RecipeDetail["steps"][number];
  currentIndex: number;
  progressPercent: number;
  timerViews: CookingTimerView[];
  storageAvailable: boolean;
  previous(): void;
  next(): void;
  restart(targetServings: number): void;
  complete(): void;
  startTimer(stepId: string, label: string, durationSeconds: number): Promise<void>;
  cancelTimer(stepId: string): void;
  dismissTimer(stepId: string): void;
};

type UseCookingSessionOptions = {
  recipe: RecipeDetail;
  requestedServings: number;
  restart: boolean;
};

type InitialSession = {
  session: CookingSessionV1;
  storage: Storage | null;
};

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createInitialSession({ recipe, requestedServings, restart }: UseCookingSessionOptions): InitialSession {
  const storage = getStorage();

  if (!storage) {
    return { session: createCookingSession(recipe, requestedServings), storage: null };
  }

  try {
    if (restart) clearCookingSession(storage, recipe.id);
    const restored = restart ? null : loadCookingSession(storage, recipe);
    const session = restored ?? createCookingSession(recipe, requestedServings);
    if (!restored && !saveCookingSession(storage, session)) return { session, storage: null };
    return { session, storage };
  } catch {
    return { session: createCookingSession(recipe, requestedServings), storage: null };
  }
}

function notificationApi(): typeof Notification | null {
  return typeof globalThis.Notification === "undefined" ? null : globalThis.Notification;
}

export function useCookingSession(options: UseCookingSessionOptions): CookingSessionController {
  const recipe = options.recipe;
  const orderedSteps = [...recipe.steps].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const initialRef = useRef<InitialSession | null>(null);
  if (!initialRef.current) initialRef.current = createInitialSession(options);

  const [session, setSession] = useState(() => initialRef.current!.session);
  const [now, setNow] = useState(Date.now);
  const [storageAvailable, setStorageAvailable] = useState(() => initialRef.current!.storage !== null);
  const storageRef = useRef<Storage | null>(initialRef.current.storage);
  const notifiedTimerKeysRef = useRef(new Set<string>());
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  const persist = useCallback((nextSession: CookingSessionV1) => {
    const storage = storageRef.current;
    if (!storage || !saveCookingSession(storage, nextSession)) {
      storageRef.current = null;
      setStorageAvailable(false);
    }
  }, []);

  const updateSession = useCallback((update: (previous: CookingSessionV1, now: number) => CookingSessionV1) => {
    setSession((previous) => {
      const next = update(previous, Date.now());
      persist(next);
      return next;
    });
  }, [persist]);

  useEffect(() => {
    const refreshNow = () => setNow(Date.now());
    const interval = window.setInterval(refreshNow, 1_000);
    document.addEventListener("visibilitychange", refreshNow);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, []);

  useEffect(() => {
    const notification = notificationApi();
    const permission = notificationPermissionRef.current ?? notification?.permission;
    if (!notification || permission !== "granted") return;

    for (const timer of session.timers) {
      const timerKey = `${timer.stepId}:${timer.startedAt}`;
      if (timer.notifiedAt !== null || timer.endsAt > now || notifiedTimerKeysRef.current.has(timerKey)) continue;

      notifiedTimerKeysRef.current.add(timerKey);
      try {
        new notification(`计时完成：${timer.label}`);
      } catch {
        // Browser notifications are an enhancement; the finished timer remains visible in the page.
      }
      updateSession((previous, notificationNow) => ({
        ...previous,
        timers: markTimerNotified(previous.timers, timer.stepId, notificationNow),
        updatedAt: notificationNow,
      }));
    }
  }, [now, session.timers, updateSession]);

  const currentIndex = Math.max(0, orderedSteps.findIndex((step) => step.id === session.currentStepId));
  const currentStep = orderedSteps[currentIndex]!;

  const moveTo = useCallback((index: number) => {
    const step = orderedSteps[index];
    if (!step) return;
    updateSession((previous, updatedAt) => {
      if (previous.currentStepId === step.id) return previous;
      return { ...previous, currentStepId: step.id, updatedAt };
    });
  }, [orderedSteps, updateSession]);

  const restart = useCallback((targetServings: number) => {
    const storage = storageRef.current;
    if (storage) clearCookingSession(storage, recipe.id);
    const next = createCookingSession(recipe, targetServings);
    if (storage && !saveCookingSession(storage, next)) {
      storageRef.current = null;
      setStorageAvailable(false);
    }
    setSession(next);
    setNow(Date.now());
  }, [recipe]);

  const complete = useCallback(() => {
    const storage = storageRef.current;
    if (storage) clearCookingSession(storage, recipe.id);
    setSession((previous) => ({ ...previous, timers: [], updatedAt: Date.now() }));
  }, [recipe.id]);

  const startTimer = useCallback(async (stepId: string, label: string, durationSeconds: number) => {
    const notification = notificationApi();
    if (notification?.permission === "default" && typeof notification.requestPermission === "function") {
      try {
        notificationPermissionRef.current = await notification.requestPermission();
      } catch {
        notificationPermissionRef.current = "denied";
      }
    }

    updateSession((previous, startedAt) => ({
      ...previous,
      timers: startStepTimer(previous.timers, { stepId, label, durationSeconds }, startedAt),
      updatedAt: startedAt,
    }));
    setNow(Date.now());
  }, [updateSession]);

  const cancelTimer = useCallback((stepId: string) => {
    updateSession((previous, updatedAt) => ({
      ...previous,
      timers: cancelStepTimer(previous.timers, stepId),
      updatedAt,
    }));
  }, [updateSession]);

  const dismissTimer = useCallback((stepId: string) => {
    updateSession((previous, updatedAt) => ({
      ...previous,
      timers: dismissStepTimer(previous.timers, stepId),
      updatedAt,
    }));
  }, [updateSession]);

  return {
    session,
    currentStep,
    currentIndex,
    progressPercent: orderedSteps.length === 0 ? 0 : Math.round(((currentIndex + 1) / orderedSteps.length) * 100),
    timerViews: session.timers.map((timer) => getTimerView(timer, now)),
    storageAvailable,
    previous: () => moveTo(currentIndex - 1),
    next: () => moveTo(currentIndex + 1),
    restart,
    complete,
    startTimer,
    cancelTimer,
    dismissTimer,
  };
}
