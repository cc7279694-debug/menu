import { getLocalDatabase } from "@/features/offline/local-db";

import { cookingSessionKey, loadCookingSession, parseCookingSession } from "./session-storage";
import type { CookingSessionRecipe, CookingSessionV1 } from "./types";

export async function getCookingSession(userId: string, recipe: CookingSessionRecipe): Promise<CookingSessionV1 | null> {
  if (!userId) return null;
  const database = await getLocalDatabase();
  const record = await database.cookingSessions.get([userId, recipe.id]);
  if (!record) return null;

  const session = parseCookingSession(record.payload, recipe);
  if (!session) {
    await database.cookingSessions.delete([userId, recipe.id]);
    return null;
  }
  return session;
}

export async function putCookingSession(userId: string, session: CookingSessionV1): Promise<void> {
  if (!userId) return;
  const database = await getLocalDatabase();
  await database.cookingSessions.put({
    userId,
    recipeId: session.recipeId,
    updatedAt: new Date(session.updatedAt).toISOString(),
    payload: session,
  });
}

export async function deleteCookingSession(userId: string, recipeId: string): Promise<void> {
  if (!userId) return;
  const database = await getLocalDatabase();
  await database.cookingSessions.delete([userId, recipeId]);
}

export async function migrateLegacyCookingSession(
  userId: string,
  recipe: CookingSessionRecipe,
  storage: Storage | null,
): Promise<CookingSessionV1 | null> {
  if (!userId || !storage) return null;

  let session: CookingSessionV1 | null;
  try {
    const raw = storage.getItem(cookingSessionKey(recipe.id));
    if (!raw) return null;
    session = loadCookingSession({
      getItem: () => raw,
    } as unknown as Storage, recipe);
  } catch {
    return null;
  }
  if (!session) return null;

  try {
    await putCookingSession(userId, session);
  } catch {
    return null;
  }

  try {
    storage.removeItem(cookingSessionKey(recipe.id));
  } catch {
    // The IndexedDB copy is already safe; a later read will use it first.
  }
  return session;
}
