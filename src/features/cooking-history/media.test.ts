import { describe, expect, it, vi } from "vitest";

import {
  buildCookingRecordPhotoPath,
  removeCookingRecordPhotoPaths,
  uploadCookingRecordPhotos,
} from "@/features/cooking-history/media";

const userId = "11111111-1111-4111-8111-111111111111";
const recordId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const photoA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const photoB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const image = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });

describe("cooking history media", () => {
  it("builds owner-scoped result photo paths and rejects invalid UUIDs", () => {
    expect(buildCookingRecordPhotoPath(userId, recordId, photoA)).toBe(`${userId}/cooking-records/${recordId}/${photoA}.webp`);
    expect(() => buildCookingRecordPhotoPath(userId, recordId, "bad")).toThrow();
  });

  it("uploads photos in stable order with immutable WebP options", async () => {
    const uploads: string[] = [];
    const bucket = {
      upload: vi.fn(async (path: string) => { uploads.push(path); return { data: { path }, error: null }; }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const result = await uploadCookingRecordPhotos({
      userId,
      cookingRecordId: recordId,
      files: [{ photoId: photoA, file: image }, { photoId: photoB, file: image }],
      bucket,
      compress: async (source) => new File([source], "result.webp", { type: "image/webp" }),
    });
    expect(result.photos.map((photo) => photo.sortOrder)).toEqual([0, 1]);
    expect(uploads).toEqual([
      `${userId}/cooking-records/${recordId}/${photoA}.webp`,
      `${userId}/cooking-records/${recordId}/${photoB}.webp`,
    ]);
    expect(bucket.upload).toHaveBeenCalledWith(uploads[0], expect.any(File), {
      cacheControl: "31536000", upsert: false, contentType: "image/webp",
    });
  });

  it("rejects four photos and cleans already uploaded objects after a failure", async () => {
    const bucket = {
      upload: vi.fn()
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error("offline") }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const files = [photoA, photoB, "ffffffff-ffff-4fff-8fff-ffffffffffff", "99999999-9999-4999-8999-999999999999"]
      .map((photoId) => ({ photoId, file: image }));
    await expect(uploadCookingRecordPhotos({ userId, cookingRecordId: recordId, files, bucket })).rejects.toThrow("最多上传 3 张");

    await expect(uploadCookingRecordPhotos({ userId, cookingRecordId: recordId, files: files.slice(0, 2), bucket, compress: async (source) => new File([source], "result.webp", { type: "image/webp" }) })).rejects.toThrow("成品照片上传失败");
    expect(bucket.remove).toHaveBeenCalledWith([`${userId}/cooking-records/${recordId}/${photoA}.webp`]);
  });

  it("only removes paths in the current user and record prefix", async () => {
    const bucket = { remove: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const removed = await removeCookingRecordPhotoPaths(bucket, userId, recordId, [
      `${userId}/cooking-records/${recordId}/${photoA}.webp`,
      `${userId}/cooking-records/other/${photoB}.webp`,
    ]);
    expect(removed).toEqual([`${userId}/cooking-records/${recordId}/${photoA}.webp`]);
  });
});
