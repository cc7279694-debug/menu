import "fake-indexeddb/auto";

import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";

import {
  RECIPIO_LOCAL_DB_NAME,
  __resetLocalDatabaseForTests,
  getLocalDatabase,
} from "./local-db";
import type { OfflineRecipeSnapshot, OfflineShoppingSnapshot } from "./types";
import type { LocalRecipeMediaRecord } from "./local-db";
import { clearOfflineData } from "./database";

describe("Recipio local database foundation", () => {
  beforeEach(async () => {
    await __resetLocalDatabaseForTests();
  });

  it("opens a versioned Dexie database with the core local-first stores", async () => {
    const database = await getLocalDatabase();

    expect(database.name).toBe(RECIPIO_LOCAL_DB_NAME);
    expect(database.tables.map((table) => table.name)).toEqual(expect.arrayContaining([
      "profiles",
      "recipes",
      "shoppingSnapshots",
      "shoppingToggleQueue",
      "meta",
      "recipeDrafts",
      "cookingSessions",
      "mutationQueue",
      "syncMeta",
      "media",
      "recipeSummaries",
    ]));
  });

  it("keeps cached media scoped to its recipe and user", async () => {
    const database = await getLocalDatabase();
    const media: LocalRecipeMediaRecord = {
      userId: "user-a",
      recipeId: "recipe-a",
      mediaId: "cover",
      sourceKey: "recipe-media/recipe-a/cover.webp",
      mimeType: "image/webp",
      byteSize: 3,
      cachedAt: "2026-09-04T00:00:00.000Z",
      blob: new Blob(["img"], { type: "image/webp" }),
    };

    await database.media.put(media);

    expect(await database.media.get(["user-a", "recipe-a", "cover"])).toMatchObject({ sourceKey: media.sourceKey });
    expect(await database.media.get(["user-b", "recipe-a", "cover"])).toBeUndefined();
  });

  it("upgrades a previously opened local database before using media", async () => {
    const legacyLocal = await openDB(RECIPIO_LOCAL_DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore("profiles", { keyPath: "userId" });
        database.createObjectStore("recipes", { keyPath: ["userId", "recipeId"] });
        database.createObjectStore("shoppingSnapshots", { keyPath: "userId" });
        database.createObjectStore("shoppingToggleQueue", { keyPath: ["userId", "listId", "itemId"] });
        database.createObjectStore("meta", { keyPath: "id" });
        database.createObjectStore("recipeDrafts", { keyPath: ["userId", "draftId"] });
        database.createObjectStore("cookingSessions", { keyPath: ["userId", "recipeId"] });
        database.createObjectStore("mutationQueue", { keyPath: "id" });
        database.createObjectStore("syncMeta", { keyPath: ["userId", "scope"] });
      },
    });
    legacyLocal.close();

    const database = await getLocalDatabase();

    expect(database.verno).toBe(3);
    expect(database.tables.map((table) => table.name)).toContain("media");
  });

  it("clears cached media with the rest of the offline data", async () => {
    const database = await getLocalDatabase();
    await database.media.put({
      userId: "user-a",
      recipeId: "recipe-a",
      mediaId: "cover",
      sourceKey: "cover",
      mimeType: "image/webp",
      byteSize: 3,
      cachedAt: "2026-09-04T00:00:00.000Z",
      blob: new Blob(["img"], { type: "image/webp" }),
    });

    await clearOfflineData();

    expect(await database.media.count()).toBe(0);
  });

  it("keeps user-owned stores isolated by user id", async () => {
    const database = await getLocalDatabase();

    await database.profiles.put({ userId: "user-a", lastAuthenticatedAt: "2026-09-04T00:00:00.000Z" });
    await database.profiles.put({ userId: "user-b", lastAuthenticatedAt: "2026-09-04T00:00:00.000Z" });

    expect(await database.profiles.get("user-a")).toMatchObject({ userId: "user-a" });
    expect(await database.profiles.get("user-b")).toMatchObject({ userId: "user-b" });
  });

  it("migrates the existing idb cache without deleting the legacy database", async () => {
    const legacy = await openDB("ordine-offline", 1, {
      upgrade(database) {
        database.createObjectStore("profiles");
        database.createObjectStore("recipes");
        database.createObjectStore("shoppingSnapshots");
        database.createObjectStore("shoppingToggleQueue");
      },
    });
    await legacy.put("profiles", { userId: "legacy-user", lastAuthenticatedAt: "2026-09-04T00:00:00.000Z" }, "legacy-user");
    const legacyRecipe = {
      userId: "legacy-user",
      recipeId: "legacy-recipe",
      cachedAt: "2026-09-04T00:00:00.000Z",
      lastOpenedAt: "2026-09-04T00:00:00.000Z",
      dataVersion: 3,
    } as OfflineRecipeSnapshot;
    const legacyShopping = {
      userId: "legacy-user",
      listId: "legacy-list",
      cachedAt: "2026-09-04T00:00:00.000Z",
      serverUpdatedAt: "2026-09-04T00:00:00.000Z",
      dataVersion: 1,
    } as OfflineShoppingSnapshot;
    await legacy.put("recipes", legacyRecipe, ["legacy-user", "legacy-recipe"]);
    await legacy.put("shoppingSnapshots", legacyShopping, "legacy-user");
    legacy.close();

    const database = await getLocalDatabase();

    expect(await database.profiles.get("legacy-user")).toMatchObject({ userId: "legacy-user" });
    expect(await database.recipes.get(["legacy-user", "legacy-recipe"])).toMatchObject({ recipeId: "legacy-recipe" });
    expect(await database.shoppingSnapshots.get("legacy-user")).toMatchObject({ listId: "legacy-list" });
    expect(await database.meta.get("legacy-idb-migration-v1")).toMatchObject({ status: "complete" });

    const legacyAgain = await openDB("ordine-offline");
    expect(Array.from(legacyAgain.objectStoreNames)).toContain("profiles");
    legacyAgain.close();
  });
});
