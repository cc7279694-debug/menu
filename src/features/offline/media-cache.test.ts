import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetLocalDatabaseForTests } from "./local-db";
import {
  cacheRecipeMediaFromUrl,
  getRecipeMedia,
  listRecipeMedia,
  rememberRecipeMediaReference,
} from "./media-cache";

describe("offline recipe media cache", () => {
  beforeEach(async () => {
    await __resetLocalDatabaseForTests();
  });

  it("stores a fetched image blob for offline use", async () => {
    const responseBlob = new Blob(["cover"], { type: "image/webp" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => responseBlob,
      headers: new Headers({ "content-type": "image/webp" }),
    }));

    await cacheRecipeMediaFromUrl({
      userId: "user-a",
      recipeId: "recipe-a",
      mediaId: "cover",
      sourceKey: "recipe-media/recipe-a/cover.webp",
      url: "https://example.com/cover.webp",
    });

    const cached = await getRecipeMedia("user-a", "recipe-a", "cover");
    expect(cached).toMatchObject({
      sourceKey: "recipe-media/recipe-a/cover.webp",
      mimeType: "image/webp",
      byteSize: 5,
    });
    expect(cached?.blob).toBeDefined();
    vi.unstubAllGlobals();
  });

  it("preserves a media reference when the image response fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(cacheRecipeMediaFromUrl({
      userId: "user-a",
      recipeId: "recipe-a",
      mediaId: "cover",
      sourceKey: "missing",
      url: "https://example.com/missing.webp",
    })).rejects.toThrow("RECIPE_MEDIA_FETCH_FAILED");

    expect(await getRecipeMedia("user-a", "recipe-a", "cover")).toMatchObject({
      sourceKey: "missing",
      blob: null,
    });
    vi.unstubAllGlobals();
  });

  it("stores a metadata-only reference before an image is downloaded", async () => {
    await rememberRecipeMediaReference({
      userId: "user-a",
      recipeId: "recipe-a",
      mediaId: "cover",
      sourceKey: "recipe-media/recipe-a/cover.webp",
    });

    expect(await listRecipeMedia("user-a", "recipe-a")).toMatchObject([
      { mediaId: "cover", sourceKey: "recipe-media/recipe-a/cover.webp", blob: null },
    ]);
  });
});
