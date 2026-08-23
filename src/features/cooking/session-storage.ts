import { z } from "zod";

import { MAX_SERVINGS, MIN_SERVINGS, isValidTargetServings, parseTargetServings } from "./servings";
import type { CookingSessionRecipe, CookingSessionV1 } from "./types";

const cookingTimerSchema = z.object({
  stepId: z.string(),
  label: z.string(),
  durationSeconds: z.number().finite(),
  startedAt: z.number().finite(),
  endsAt: z.number().finite(),
  notifiedAt: z.number().finite().nullable(),
}).strict();

const cookingSessionSchema = z.discriminatedUnion("version", [z.object({
  version: z.literal(1),
  recipeId: z.string(),
  recipeUpdatedAt: z.string(),
  targetServings: z.number().finite().min(MIN_SERVINGS).max(MAX_SERVINGS).refine(isValidTargetServings),
  currentStepId: z.string(),
  timers: z.array(cookingTimerSchema),
  startedAt: z.number().finite(),
  updatedAt: z.number().finite(),
}).strict()]);

export function cookingSessionKey(recipeId: string): string {
  return `food-sequence:cooking:v1:${recipeId}`;
}

export function createCookingSession(recipe: CookingSessionRecipe, targetServings: number, now = Date.now()): CookingSessionV1 {
  if (!recipe.id || !recipe.updatedAt || recipe.steps.some((step) => !Number.isFinite(step.sortOrder))) {
    throw new Error("菜谱缺少会话所需的身份或版本信息");
  }
  const firstStep = [...recipe.steps].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))[0];
  const servings = parseTargetServings(targetServings, recipe.baseServings);
  return {
    version: 1,
    recipeId: recipe.id,
    recipeUpdatedAt: recipe.updatedAt,
    targetServings: servings,
    currentStepId: firstStep?.id ?? "",
    timers: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function loadCookingSession(storage: Storage, recipe: CookingSessionRecipe): CookingSessionV1 | null {
  try {
    if (!recipe.id || !recipe.updatedAt || recipe.steps.some((step) => !Number.isFinite(step.sortOrder))) return null;
    const raw = storage.getItem(cookingSessionKey(recipe.id));
    if (!raw) return null;
    const parsed = cookingSessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const session = parsed.data;
    if (session.recipeId !== recipe.id || session.recipeUpdatedAt !== recipe.updatedAt) return null;
    if (!recipe.steps.some((step) => step.id === session.currentStepId)) return null;
    if (session.timers.some((timer) => !recipe.steps.some((step) => step.id === timer.stepId))) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveCookingSession(storage: Storage, session: CookingSessionV1): boolean {
  try {
    storage.setItem(cookingSessionKey(session.recipeId), JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearCookingSession(storage: Storage, recipeId: string): void {
  try {
    storage.removeItem(cookingSessionKey(recipeId));
  } catch {
    // Storage can be unavailable in private browsing; clearing is best effort.
  }
}
