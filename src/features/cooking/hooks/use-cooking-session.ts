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
  notificationStatus: CookingNotificationStatus;
  notificationMessage: string | null;
  previous(): void;
  next(): void;
  restart(targetServings: number): void;
  complete(): void;
  startTimer(stepId: string, label: string, durationSeconds: number): Promise<void>;
  cancelTimer(stepId: string): void;
  dismissTimer(stepId: string): void;
};

export type CookingNotificationStatus = "checking" | "unsupported" | NotificationPermission | "error";

type UseCookingSessionOptions = {
  recipe: RecipeDetail;
  requestedServings: number;
  restart: boolean;
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
  const orderedSteps = [...recipe.steps].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const [session, setSession] = useState(() => createCookingSession(recipe, options.requestedServings, 0));
  const [now, setNow] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<CookingNotificationStatus>("checking");
  const initializationKey = `${recipe.id}:${recipe.updatedAt}:${options.requestedServings}:${options.restart}`;
  const [initializedKey, setInitializedKey] = useState<string | null>(null);
  const storageRef = useRef<Storage | null>(null);
  const skipNextPersistenceRef = useRef(false);
  const notifiedTimerKeysRef = useRef(new Set<string>());
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  const updateSession = useCallback((update: (previous: CookingSessionV1, now: number) => CookingSessionV1) => {
    setSession((previous) => update(previous, Date.now()));
  }, []);

  useEffect(() => {
    const storage = getStorage();
    storageRef.current = storage;

    if (!storage) {
      setStorageAvailable(false);
      setSession(createCookingSession(recipe, options.requestedServings));
      setNow(Date.now());
      setInitializedKey(initializationKey);
      return;
    }

    if (options.restart) clearCookingSession(storage, recipe.id);
    const restored = options.restart ? null : loadCookingSession(storage, recipe);
    const nextSession = restored ?? createCookingSession(recipe, options.requestedServings);

    setStorageAvailable(true);
    setSession(nextSession);
    setNow(Date.now());
    setInitializedKey(initializationKey);
  }, [initializationKey, options.requestedServings, options.restart, recipe]);

  useEffect(() => {
    if (initializedKey !== initializationKey) return;
    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false;
      return;
    }

    const storage = storageRef.current;
    if (!storage || saveCookingSession(storage, session)) return;
    storageRef.current = null;
    setStorageAvailable(false);
  }, [initializationKey, initializedKey, session]);

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
    const storage = storageRef.current;
    if (storage) clearCookingSession(storage, recipe.id);
    const next = createCookingSession(recipe, targetServings);
    setSession(next);
    setNow(Date.now());
  }, [recipe]);

  const complete = useCallback(() => {
    const storage = storageRef.current;
    if (storage) clearCookingSession(storage, recipe.id);
    skipNextPersistenceRef.current = true;
    setSession((previous) => ({ ...previous, timers: [], updatedAt: Date.now() }));
  }, [recipe.id]);

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
    notificationStatus,
    notificationMessage,
    previous: () => moveTo(currentIndex - 1),
    next: () => moveTo(currentIndex + 1),
    restart,
    complete,
    startTimer,
    cancelTimer,
    dismissTimer,
  };
}
