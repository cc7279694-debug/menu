export const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
export const TARGET_IMAGE_BYTES = 2 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateImageFile(
  file: File,
  compressedSize?: number,
): ImageValidationResult {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, message: "只支持 JPG、PNG 或 WebP 图片" };
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    return { ok: false, message: "原始图片不能超过 15MB" };
  }
  if (compressedSize !== undefined && compressedSize > MAX_UPLOAD_IMAGE_BYTES) {
    return { ok: false, message: "压缩后的图片不能超过 5MB" };
  }
  return { ok: true };
}
