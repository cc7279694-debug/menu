import {
  MAX_IMAGE_DIMENSION,
  TARGET_IMAGE_BYTES,
  validateImageFile,
} from "@/features/media/image-validation";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeAssetPattern = /^[a-zA-Z0-9_-]{1,80}$/;

export type RecipeMediaBucket = {
  upload: (
    path: string,
    file: File,
    options: { cacheControl: string; upsert: false; contentType: string },
  ) => Promise<{ data: unknown; error: unknown }>;
  remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
};

export type UploadRecipeMediaInput = {
  userId: string;
  recipeId: string;
  cover?: File | null;
  steps: Record<string, File | null | undefined>;
  bucket: RecipeMediaBucket;
  compress?: (file: File, options: {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    useWebWorker: boolean;
    fileType: string;
  }) => Promise<File | Blob>;
  createAssetId?: () => string;
};

type RecipeMediaPaths = {
  coverPath: string | null;
  stepPaths: Record<string, string>;
};

export function getObsoleteRecipeMediaPaths(previous: RecipeMediaPaths, next: RecipeMediaPaths): string[] {
  const currentPaths = new Set([
    ...(next.coverPath ? [next.coverPath] : []),
    ...Object.values(next.stepPaths),
  ]);
  return [
    ...(previous.coverPath ? [previous.coverPath] : []),
    ...Object.values(previous.stepPaths),
  ].filter((path, index, paths) => !currentPaths.has(path) && paths.indexOf(path) === index);
}

function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} 无效`);
  }
}

export function buildRecipeMediaPath(
  userId: string,
  recipeId: string,
  kind: "cover" | "step",
  assetId: string,
  stepId?: string,
): string {
  assertUuid(userId, "用户");
  assertUuid(recipeId, "菜谱");
  if (!safeAssetPattern.test(assetId)) {
    throw new Error("图片资源标识无效");
  }
  if (kind === "cover") {
    return `${userId}/recipes/${recipeId}/cover/${assetId}.webp`;
  }
  if (!stepId) {
    throw new Error("步骤图片缺少步骤标识");
  }
  assertUuid(stepId, "步骤");
  return `${userId}/recipes/${recipeId}/steps/${stepId}/${assetId}.webp`;
}

function toWebpFile(value: File | Blob, originalName: string): File {
  if (value instanceof File && value.type === "image/webp") {
    return value;
  }
  return new File([value], `${originalName.replace(/\.[^.]+$/u, "")}.webp`, {
    type: "image/webp",
  });
}

export async function compressRecipeImage(
  file: File,
  compress?: UploadRecipeMediaInput["compress"],
): Promise<File> {
  const options = {
    maxSizeMB: TARGET_IMAGE_BYTES / (1024 * 1024),
    maxWidthOrHeight: MAX_IMAGE_DIMENSION,
    useWebWorker: true,
    fileType: "image/webp",
  } as const;
  const result = compress
    ? await compress(file, options)
    : await (await import("browser-image-compression")).default(file, options);
  const output = toWebpFile(result, file.name);
  const validation = validateImageFile(file, output.size);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  return output;
}

export async function removeRecipeMediaPaths(
  bucket: Pick<RecipeMediaBucket, "remove">,
  userId: string,
  recipeId: string,
  paths: string[],
): Promise<string[]> {
  assertUuid(userId, "用户");
  assertUuid(recipeId, "菜谱");
  const prefix = `${userId}/recipes/${recipeId}/`;
  const safePaths = [...new Set(paths.filter((path) => path.startsWith(prefix)))];
  if (safePaths.length > 0) {
    await bucket.remove(safePaths);
  }
  return safePaths;
}

export async function uploadRecipeMedia(input: UploadRecipeMediaInput): Promise<{
  coverPath: string | null;
  stepPaths: Record<string, string>;
  uploadedPaths: string[];
}> {
  assertUuid(input.userId, "用户");
  assertUuid(input.recipeId, "菜谱");
  const createAssetId = input.createAssetId ?? (() => crypto.randomUUID());
  const uploadedPaths: string[] = [];
  let coverPath: string | null = null;
  const stepPaths: Record<string, string> = {};

  try {
    if (input.cover) {
      const path = buildRecipeMediaPath(input.userId, input.recipeId, "cover", createAssetId());
      const file = await compressRecipeImage(input.cover, input.compress);
      const upload = await input.bucket.upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });
      if (upload.error) throw upload.error;
      uploadedPaths.push(path);
      coverPath = path;
    }

    for (const [stepId, source] of Object.entries(input.steps)) {
      if (!source) continue;
      const path = buildRecipeMediaPath(input.userId, input.recipeId, "step", createAssetId(), stepId);
      const file = await compressRecipeImage(source, input.compress);
      const upload = await input.bucket.upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });
      if (upload.error) throw upload.error;
      uploadedPaths.push(path);
      stepPaths[stepId] = path;
    }
  } catch {
    await removeRecipeMediaPaths(input.bucket, input.userId, input.recipeId, uploadedPaths);
    throw new Error("图片上传失败，请重试");
  }

  return { coverPath, stepPaths, uploadedPaths };
}
