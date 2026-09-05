"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RecipeDetail } from "@/features/recipes/types";

import {
  createCookingSession,
} from "../session-storage";
import {
  deleteCookingSession,
  getCookingSession,
  migrateLegacyCookingSession,
  putCookingSession,
} from "../cooking-session-repository";
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
  notificationStatus: CookingNotificationStatus;
  notificationMessage: string | null;
  ready: boolean;
  previous(): void;
  next(): void;
  restart(targetServings: number): void;
  complete(): void;
  startTimer(stepId: string, label: string, durationSeconds: number): Promise<void>;
  cancelTimer(stepId: string): void;
  dismissTimer(stepId: string): void;
  togglePreparation(preparationId: string): void;
  confirmPreparations(): void;
  preparationsComplete: boolean;
};

export type CookingNotificationStatus = "checking" | "unsupported" | NotificationPermission | "error";

type UseCookingSessionOptions = {
  recipe: RecipeDetail;
  requestedServings: number;
  restart: boolean;
  userId?: string | null;
};

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function notificationApi(): typeof Notification | null {
  return typeof globalThis.Notification === "undefined" ? null : globalThis.Notification;
}

export function useCookingSession(options: UseCookingSessionOptions): CookingSessionController {
  const recipe = options.recipe;
  const userId = options.userId ?? null;
  const orderedSteps = useMemo(
    () => [...recipe.steps].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)),
    [recipe.steps],
  );
  const [session, setSession] = useState(() => createCookingSession(recipe, options.requestedServings, 0));
  const [now, setNow] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<CookingNotificationStatus>("checking");
  const initializationKey = `${recipe.id}:${recipe.updatedAt}:${options.requestedServings}:${options.restart}:${userId ?? "memory"}`;
  const [ready, setReady] = useState(() => userId === null);
  const persistEnabledRef = useRef(false);
  const writeChainRef = useRef(Promise.resolve());
  const skipNextPersistenceRef = useRef(false);
  const notifiedTimerKeysRef = useRef(new Set<string>());
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  const updateSession = useCallback((update: (previous: CookingSessionV1, now: number) => CookingSessionV1) => {
    setSession((previous) => update(previous, Date.now()));
  }, []);

  const enqueuePersistence = useCallback((operation: () => Promise<void>) => {
    const next = writeChainRef.current.then(operation, operation);
    writeChainRef.current = next.catch(() => undefined);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    persistEnabledRef.current = false;
    setReady(userId === null);
    setStorageAvailable(true);
    setSession(createCookingSession(recipe, options.requestedServings, 0));
    setNow(0);

    const initialize = async () => {
      let nextSession = createCookingSession(recipe, options.requestedServings);
      if (userId !== null) {
        try {
          if (options.restart) {
            await deleteCookingSession(userId, recipe.id);
          } else {
            nextSession = await getCookingSession(userId, recipe)
              ?? await migrateLegacyCookingSession(userId, recipe, getStorage())
              ?? nextSession;
          }
        } catch {
          setStorageAvailable(false);
        }
      }
      if (cancelled) return;
      setSession(nextSession);
      setNow(Date.now());
      persistEnabledRef.current = true;
      setReady(true);
    };

    void initialize();
    return () => {
      cancelled = true;
      persistEnabledRef.current = false;
    };
  }, [initializationKey, options.requestedServings, options.restart, recipe, userId]);

  useEffect(() => {
    if (!ready || !persistEnabledRef.current || userId === null) return;
    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false;
      return;
    }

    void enqueuePersistence(() => putCookingSession(userId, session).catch(() => {
      setStorageAvailable(false);
    }));
  }, [enqueuePersistence, initializationKey, ready, session, userId]);

  useEffect(() => {
    const notification = notificationApi();
    if (!notification) {
      notificationPermissionRef.current = null;
      setNotificationStatus("unsupported");
      return;
    }

    notificationPermissionRef.current = notification.permission;
    setNotificationStatus(notification.permission);
  }, []);

  const hasActiveTimer = session.timers.some((timer) => timer.notifiedAt === null && timer.endsAt > now);

  useEffect(() => {
    const refreshNow = () => setNow(Date.now());
    document.addEventListener("visibilitychange", refreshNow);

    if (!hasActiveTimer) {
      return () => document.removeEventListener("visibilitychange", refreshNow);
    }

    const interval = window.setInterval(refreshNow, 1_000);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, [hasActiveTimer]);

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
        setNotificationStatus("error");
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
    if (userId !== null) {
      void enqueuePersistence(() => deleteCookingSession(userId, recipe.id).catch(() => {
        setStorageAvailable(false);
      }));
    }
    const next = createCookingSession(recipe, targetServings);
    setSession(next);
    setNow(Date.now());
  }, [enqueuePersistence, recipe, userId]);

  const complete = useCallback(() => {
    if (userId !== null) {
      void enqueuePersistence(() => deleteCookingSession(userId, recipe.id).catch(() => {
        setStorageAvailable(false);
      }));
    }
    skipNextPersistenceRef.current = true;
    setSession((previous) => ({ ...previous, timers: [], completedPreparationIds: [], preparationsConfirmedAt: null, updatedAt: Date.now() }));
  }, [enqueuePersistence, recipe.id, userId]);

  const startTimer = useCallback(async (stepId: string, label: string, durationSeconds: number) => {
    const notification = notificationApi();
    if (!notification) {
      setNotificationStatus("unsupported");
    } else if (notification.permission === "default" && typeof notification.requestPermission === "function") {
      try {
        notificationPermissionRef.current = await notification.requestPermission();
        setNotificationStatus(notificationPermissionRef.current);
      } catch {
        notificationPermissionRef.current = "denied";
        setNotificationStatus("error");
      }
    } else {
      notificationPermissionRef.current = notification.permission;
      setNotificationStatus(notification.permission);
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

  const preparationIds = useMemo(() => new Set(recipe.preparations.map((preparation) => preparation.id)), [recipe.preparations]);
  const preparationsComplete = recipe.preparations.length === 0 || recipe.preparations.every((preparation) => session.completedPreparationIds.includes(preparation.id));
  const togglePreparation = useCallback((preparationId: string) => {
    if (!preparationIds.has(preparationId)) return;
    updateSession((previous, updatedAt) => {
      const completed = new Set(previous.completedPreparationIds);
      if (completed.has(preparationId)) completed.delete(preparationId); else completed.add(preparationId);
      return { ...previous, completedPreparationIds: [...completed], updatedAt };
    });
  }, [preparationIds, updateSession]);
  const confirmPreparations = useCallback(() => {
    updateSession((previous, updatedAt) => ({ ...previous, preparationsConfirmedAt: updatedAt, updatedAt }));
  }, [updateSession]);

  const notificationMessage = notificationStatus === "unsupported"
    ? "此浏览器不支持计时完成通知。"
    : notificationStatus === "denied"
      ? "计时完成通知未获授权，页面内计时仍会继续。"
      : notificationStatus === "error"
        ? "计时完成通知开启失败，页面内计时仍会继续。"
        : null;

  return {
    session,
    currentStep,
    currentIndex,
    progressPercent: orderedSteps.length === 0 ? 0 : Math.round(((currentIndex + 1) / orderedSteps.length) * 100),
    timerViews: session.timers.map((timer) => getTimerView(timer, now)),
    storageAvailable,
    ready,
    notificationStatus,
    notificationMessage,
    previous: () => moveTo(currentIndex - 1),
    next: () => moveTo(currentIndex + 1),
    restart,
    complete,
    startTimer,
    cancelTimer,
    dismissTimer,
    togglePreparation,
    confirmPreparations,
    preparationsComplete,
  };
}
