import { describe, expect, it, vi } from "vitest";

import {
  buildRecipeMediaPath,
  getObsoleteRecipeMediaPaths,
  removeRecipeMediaPaths,
  uploadRecipeMedia,
} from "@/features/media/upload-recipe-media";

const userId = "11111111-1111-4111-8111-111111111111";
const recipeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const stepId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const image = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });

describe("recipe media upload", () => {
  it("builds owner-scoped immutable paths", () => {
    expect(buildRecipeMediaPath(userId, recipeId, "cover", "asset-1")).toBe(
      `${userId}/recipes/${recipeId}/cover/asset-1.webp`,
    );
    expect(buildRecipeMediaPath(userId, recipeId, "step", "asset-2", stepId)).toBe(
      `${userId}/recipes/${recipeId}/steps/${stepId}/asset-2.webp`,
    );
    expect(() => buildRecipeMediaPath(userId, recipeId, "cover", "../escape")).toThrow();
  });

  it("uploads compressed cover and step images with upsert disabled", async () => {
    const uploads: string[] = [];
    const bucket = {
      upload: vi.fn(async (path: string) => {
        uploads.push(path);
        return { data: { path }, error: null };
      }),
      remove: vi.fn(async () => ({ data: [], error: null })),
    };
    const compress = vi.fn(async (source: File) => new File([source], "compressed.webp", { type: "image/webp" }));

    const result = await uploadRecipeMedia({
      userId,
      recipeId,
      cover: image,
      steps: { [stepId]: image },
      bucket,
      compress,
      createAssetId: vi.fn().mockReturnValueOnce("asset-1").mockReturnValueOnce("asset-2"),
    });

    expect(uploads).toEqual([
      `${userId}/recipes/${recipeId}/cover/asset-1.webp`,
      `${userId}/recipes/${recipeId}/steps/${stepId}/asset-2.webp`,
    ]);
    expect(bucket.upload).toHaveBeenCalledWith(
      uploads[0],
      expect.any(File),
      expect.objectContaining({ upsert: false, contentType: "image/webp" }),
    );
    expect(result.coverPath).toBe(uploads[0]);
    expect(result.stepPaths[stepId]).toBe(uploads[1]);
  });

  it("cleans objects already uploaded when a later upload fails", async () => {
    const bucket = {
      upload: vi
        .fn()
        .mockResolvedValueOnce({ data: { path: "first" }, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error("storage offline") }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    await expect(
      uploadRecipeMedia({
        userId,
        recipeId,
        cover: image,
        steps: { [stepId]: image },
        bucket,
        compress: async (source) => source,
        createAssetId: vi.fn().mockReturnValueOnce("asset-1").mockReturnValueOnce("asset-2"),
      }),
    ).rejects.toThrow("图片上传失败");
    expect(bucket.remove).toHaveBeenCalledWith([
      `${userId}/recipes/${recipeId}/cover/asset-1.webp`,
    ]);
  });

  it("never deletes a path outside the current recipe prefix", async () => {
    const bucket = { remove: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const removed = await removeRecipeMediaPaths(bucket, userId, recipeId, [
      `${userId}/recipes/${recipeId}/cover/a.webp`,
      `${userId}/recipes/other/cover/b.webp`,
    ]);

    expect(removed).toEqual([`${userId}/recipes/${recipeId}/cover/a.webp`]);
    expect(bucket.remove).toHaveBeenCalledWith(removed);
  });

  it("finds replaced and removed paths without deleting reused media", () => {
    expect(getObsoleteRecipeMediaPaths(
      {
        coverPath: `${userId}/recipes/${recipeId}/cover/old.webp`,
        stepPaths: {
          [stepId]: `${userId}/recipes/${recipeId}/steps/${stepId}/same.webp`,
        },
      },
      {
        coverPath: `${userId}/recipes/${recipeId}/cover/new.webp`,
        stepPaths: {},
      },
    )).toEqual([
      `${userId}/recipes/${recipeId}/cover/old.webp`,
      `${userId}/recipes/${recipeId}/steps/${stepId}/same.webp`,
    ]);
  });
});
