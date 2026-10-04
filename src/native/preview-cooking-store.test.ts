import "fake-indexeddb/auto";
import Dexie from "dexie";
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, expect, it } from "vitest";
import {
  __resetLocalDatabaseForTests,
  getLocalDatabase,
  RECIPIO_LOCAL_DB_NAME,
  RecipioLocalDatabase,
} from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
afterEach(__resetLocalDatabaseForTests);
it("uses the same minimal record, idempotence and pagination contract in preview", async () => {
  const store = new PreviewRecipeLibrary(
    () => new Date("2026-10-04T10:00:00.000Z"),
  );
  const recipe = await store.create("鸭");
  const first = await store.recordCooking(recipe.id, "a");
  expect(await store.recordCooking(recipe.id, "a")).toEqual(first);
  await store.recordCooking(recipe.id, "b");
  const page = await store.listCookingRecords(recipe.id, 1);
  expect(page[0].id).toBe("b");
  expect(
    (
      await store.listCookingRecords(recipe.id, 1, {
        cookedAt: page[0].cookedAt,
        id: page[0].id,
      })
    )[0].id,
  ).toBe("a");
  expect(await store.getCookingSummary(recipe.id)).toEqual({
    count: 2,
    lastCookedAt: "2026-10-04T10:00:00.000Z",
  });
  expect((await getLocalDatabase()).verno).toBe(7);
  await store.deleteCookingRecord("a");
  expect(await store.getDetails(recipe.id)).not.toBeNull();
});
it("upgrades an actual frozen v6 database while preserving all old stores and owned media", async () => {
  await __resetLocalDatabaseForTests();
  const old = new Dexie(RECIPIO_LOCAL_DB_NAME);
  old
    .version(6)
    .stores({
      profiles: "userId",
      recipes: "[userId+recipeId],userId,recipeId,lastOpenedAt",
      shoppingSnapshots: "userId,listId",
      shoppingToggleQueue:
        "[userId+listId+itemId],userId,listId,itemId,queuedAt",
      meta: "id",
      recipeDrafts: "[userId+draftId],userId,updatedAt",
      cookingSessions: "[userId+recipeId],userId,updatedAt",
      mutationQueue: "id,userId,queuedAt",
      syncMeta: "[userId+scope],userId,scope,updatedAt",
      media: "[userId+recipeId+mediaId],userId,recipeId,mediaId,cachedAt",
      recipeSummaries: "[userId+recipeId],userId,recipeId,cachedAt,deleted",
      localRecipes: "id,updatedAt,deletedAt",
      recipeChanges: "id,recipeId,changedAt",
      nativeBackupState: "id",
    });
  await old.open();
  const names = old.tables.map((t) => t.name).sort();
  await old
    .table("meta")
    .put({
      id: "keep",
      status: "complete",
      completedAt: "2026-10-04T00:00:00.000Z",
    });
  const media = {
    userId: "recipio-library-preview",
    recipeId: "library",
    mediaId: "images/aaaa.png",
    sourceKey: "local",
    mimeType: "image/png",
    byteSize: 7,
    cachedAt: "2026-10-04T00:00:00.000Z",
    blob: new NodeBlob(["pngtest"], { type: "image/png" }),
  };
  await old.table("media").put(media);
  old.close();
  const upgraded = new RecipioLocalDatabase();
  try {
    await upgraded.open();
    expect(upgraded.verno).toBe(7);
    expect(
      upgraded.tables
        .map((t) => t.name)
        .filter((n) => n !== "nativeCookingRecords")
        .sort(),
    ).toEqual(names);
    expect(await upgraded.meta.get("keep")).toEqual({
      id: "keep",
      status: "complete",
      completedAt: "2026-10-04T00:00:00.000Z",
    });
    expect(await upgraded.nativeCookingRecords.count()).toBe(0);
    const restored = await upgraded.media.get([
      media.userId,
      media.recipeId,
      media.mediaId,
    ]);
    expect(restored).toMatchObject({ byteSize: 7, mimeType: "image/png" });
    expect(restored?.blob?.size).toBe(7);
  } finally {
    upgraded.close();
  }
});
