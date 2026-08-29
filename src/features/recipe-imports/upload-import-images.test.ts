import { describe, expect, it, vi } from "vitest";

import { buildRecipeImportMediaPath, uploadImportImages } from "@/features/recipe-imports/upload-import-images";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const IMPORT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("recipe import image upload", () => {
  it("builds an owned path and rejects invalid identities", () => {
    expect(buildRecipeImportMediaPath(USER_ID, IMPORT_ID, "asset")).toBe(`${USER_ID}/${IMPORT_ID}/asset.webp`);
    expect(() => buildRecipeImportMediaPath("not-user", IMPORT_ID, "asset")).toThrow("用户 无效");
  });

  it("compresses to webp and rolls back successful uploads on a later failure", async () => {
    const upload = vi.fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("quota") });
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const compress = vi.fn().mockImplementation(async () => new Blob(["webp"], { type: "image/webp" }));
    const files = [new File(["one"], "one.jpg", { type: "image/jpeg" }), new File(["two"], "two.png", { type: "image/png" })];
    await expect(uploadImportImages({ userId: USER_ID, importId: IMPORT_ID, files, bucket: { upload, remove }, compress, createAssetId: vi.fn().mockReturnValueOnce("one").mockReturnValueOnce("two") })).rejects.toThrow("图片上传失败，请重试");
    expect(compress).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith([`${USER_ID}/${IMPORT_ID}/one.webp`]);
  });
});
