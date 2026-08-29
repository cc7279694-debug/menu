import { MAX_IMAGE_DIMENSION, MAX_ORIGINAL_IMAGE_BYTES, TARGET_IMAGE_BYTES, validateImageFile } from "@/features/media/image-validation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assetPattern = /^[a-zA-Z0-9_-]{1,80}$/;

export type RecipeImportMediaBucket = {
  upload: (path: string, file: File, options: { cacheControl: string; upsert: false; contentType: string }) => Promise<{ data: unknown; error: unknown }>;
  remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
};

type Compressor = (file: File, options: { maxSizeMB: number; maxWidthOrHeight: number; useWebWorker: boolean; fileType: string }) => Promise<File | Blob>;

function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) throw new Error(`${label} 无效`);
}

export function buildRecipeImportMediaPath(userId: string, importId: string, assetId: string): string {
  assertUuid(userId, "用户");
  assertUuid(importId, "导入任务");
  if (!assetPattern.test(assetId)) throw new Error("图片资源标识无效");
  return `${userId}/${importId}/${assetId}.webp`;
}

function toWebp(value: File | Blob, name: string): File {
  if (value instanceof File && value.type === "image/webp") return value;
  return new File([value], `${name.replace(/\.[^.]+$/u, "")}.webp`, { type: "image/webp" });
}

async function compressImage(file: File, compress?: Compressor): Promise<File> {
  const initial = validateImageFile(file);
  if (!initial.ok) throw new Error(initial.message);
  const options = { maxSizeMB: TARGET_IMAGE_BYTES / (1024 * 1024), maxWidthOrHeight: MAX_IMAGE_DIMENSION, useWebWorker: true, fileType: "image/webp" } as const;
  const output = toWebp(compress ? await compress(file, options) : await (await import("browser-image-compression")).default(file, options), file.name);
  const result = validateImageFile(file, output.size);
  if (!result.ok) throw new Error(result.message);
  return output;
}

export function removeImportImages(bucket: Pick<RecipeImportMediaBucket, "remove">, userId: string, importId: string, paths: string[]): string[] {
  assertUuid(userId, "用户");
  assertUuid(importId, "导入任务");
  const prefix = `${userId}/${importId}/`;
  const safePaths = [...new Set(paths.filter((path) => path.startsWith(prefix)))];
  if (safePaths.length) void bucket.remove(safePaths);
  return safePaths;
}

export async function uploadImportImages(input: { userId: string; importId: string; files: File[]; bucket: RecipeImportMediaBucket; compress?: Compressor; createAssetId?: () => string }): Promise<string[]> {
  assertUuid(input.userId, "用户");
  assertUuid(input.importId, "导入任务");
  if (input.files.length < 1 || input.files.length > 6) throw new Error("每次最多上传 6 张图片");
  if (input.files.some((file) => file.size > MAX_ORIGINAL_IMAGE_BYTES)) throw new Error("原始图片不能超过 15MB");
  const createAssetId = input.createAssetId ?? (() => crypto.randomUUID());
  const uploaded: string[] = [];
  try {
    for (const file of input.files) {
      const path = buildRecipeImportMediaPath(input.userId, input.importId, createAssetId());
      const compressed = await compressImage(file, input.compress);
      const result = await input.bucket.upload(path, compressed, { cacheControl: "3600", upsert: false, contentType: "image/webp" });
      if (result.error) throw result.error;
      uploaded.push(path);
    }
    return uploaded;
  } catch {
    await input.bucket.remove(uploaded);
    throw new Error("图片上传失败，请重试");
  }
}
