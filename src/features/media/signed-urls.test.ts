import { describe, expect, it } from "vitest";

import { createSignedImageUrlMap } from "@/features/media/signed-urls";

describe("signed recipe image mapping", () => {
  it("deduplicates paths and returns only successful signed URLs", async () => {
    const calls: string[][] = [];
    const storage = {
      createSignedUrls: async (paths: string[]) => {
        calls.push(paths);
        return {
          data: [
            { path: "cover.webp", signedUrl: "https://signed.test/cover" },
            { path: "step.webp", signedUrl: null },
          ],
          error: null,
        };
      },
    };

    const result = await createSignedImageUrlMap(storage, ["cover.webp", "cover.webp", "step.webp"]);

    expect(calls).toEqual([["cover.webp", "step.webp"]]);
    expect(result).toEqual({
      "cover.webp": "https://signed.test/cover",
      "step.webp": null,
    });
  });

  it("returns null values when Storage signing fails", async () => {
    const storage = {
      createSignedUrls: async () => ({ data: null, error: new Error("offline") }),
    };

    await expect(createSignedImageUrlMap(storage, ["cover.webp"])).resolves.toEqual({
      "cover.webp": null,
    });
  });
});
