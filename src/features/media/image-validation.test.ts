import { describe, expect, it } from "vitest";

import {
  MAX_ORIGINAL_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  validateImageFile,
} from "@/features/media/image-validation";

function file(size: number, type = "image/jpeg") {
  return new File([new Uint8Array(size)], "photo.jpg", { type });
}

describe("recipe image validation", () => {
  it("accepts the supported image types within the original size limit", () => {
    expect(validateImageFile(file(MAX_ORIGINAL_IMAGE_BYTES))).toEqual({ ok: true });
    expect(validateImageFile(file(100, "image/png"))).toEqual({ ok: true });
    expect(validateImageFile(file(100, "image/webp"))).toEqual({ ok: true });
  });

  it("rejects unsupported types, oversized originals, and oversized compressed output", () => {
    expect(validateImageFile(file(100, "image/gif"))).toMatchObject({ ok: false });
    expect(validateImageFile(file(MAX_ORIGINAL_IMAGE_BYTES + 1))).toMatchObject({ ok: false });
    expect(validateImageFile(file(100), MAX_UPLOAD_IMAGE_BYTES + 1)).toMatchObject({ ok: false });
  });
});
