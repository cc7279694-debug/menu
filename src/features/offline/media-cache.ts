import { getLocalDatabase, type LocalRecipeMediaRecord } from "./local-db";

export type RecipeMediaCacheInput = {
  userId: string;
  recipeId: string;
  mediaId: string;
  sourceKey: string;
  url: string;
};

export type RecipeMediaReferenceInput = Omit<RecipeMediaCacheInput, "url">;

export async function rememberRecipeMediaReference(input: RecipeMediaReferenceInput): Promise<void> {
  const database = await getLocalDatabase();
  const key: [string, string, string] = [input.userId, input.recipeId, input.mediaId];
  const existing = await database.media.get(key);
  const sameSource = existing?.sourceKey === input.sourceKey;
  await database.media.put({
    userId: input.userId,
    recipeId: input.recipeId,
    mediaId: input.mediaId,
    sourceKey: input.sourceKey,
    mimeType: sameSource ? existing?.mimeType ?? null : null,
    byteSize: sameSource ? existing?.byteSize ?? 0 : 0,
    cachedAt: new Date().toISOString(),
    blob: sameSource ? existing?.blob ?? null : null,
  });
}

export async function cacheRecipeMediaFromUrl(input: RecipeMediaCacheInput): Promise<void> {
  await rememberRecipeMediaReference(input);
  const response = await fetch(input.url, { cache: "force-cache" });
  if (!response.ok) throw new Error("RECIPE_MEDIA_FETCH_FAILED");

  const blob = await response.blob();
  const record: LocalRecipeMediaRecord = {
    userId: input.userId,
    recipeId: input.recipeId,
    mediaId: input.mediaId,
    sourceKey: input.sourceKey,
    mimeType: blob.type || response.headers.get("content-type") || "application/octet-stream",
    byteSize: blob.size,
    cachedAt: new Date().toISOString(),
    blob,
  };
  await (await getLocalDatabase()).media.put(record);
}

export async function listRecipeMedia(userId: string, recipeId: string): Promise<LocalRecipeMediaRecord[]> {
  return (await (await getLocalDatabase()).media
    .where("userId")
    .equals(userId)
    .filter((record) => record.recipeId === recipeId)
    .sortBy("mediaId"));
}

export async function getRecipeMedia(
  userId: string,
  recipeId: string,
  mediaId: string,
): Promise<LocalRecipeMediaRecord | null> {
  return (await (await getLocalDatabase()).media.get([userId, recipeId, mediaId])) ?? null;
}

export async function deleteRecipeMedia(userId: string, recipeId: string, mediaId: string): Promise<void> {
  await (await getLocalDatabase()).media.delete([userId, recipeId, mediaId]);
}
