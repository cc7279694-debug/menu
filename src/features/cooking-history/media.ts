import {
  compressRecipeImage,
  type RecipeMediaBucket,
} from "@/features/media/upload-recipe-media";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) throw new Error(`${label} 无效`);
}

export function buildCookingRecordPhotoPath(userId: string, recordId: string, photoId: string): string {
  assertUuid(userId, "用户");
  assertUuid(recordId, "烹饪记录");
  assertUuid(photoId, "照片");
  return `${userId}/cooking-records/${recordId}/${photoId}.webp`;
}

export type UploadedCookingPhoto = {
  photoId: string;
  storagePath: string;
  sortOrder: number;
};

export type UploadCookingRecordPhotosInput = {
  userId: string;
  cookingRecordId: string;
  files: Array<{ photoId: string; file: File }>;
  bucket: RecipeMediaBucket;
  compress?: Parameters<typeof compressRecipeImage>[1];
};

export type UploadCookingRecordPhotosResult = {
  photos: UploadedCookingPhoto[];
  uploadedPaths: string[];
};

export async function removeCookingRecordPhotoPaths(
  bucket: Pick<RecipeMediaBucket, "remove">,
  userId: string,
  cookingRecordId: string,
  paths: string[],
): Promise<string[]> {
  assertUuid(userId, "用户");
  assertUuid(cookingRecordId, "烹饪记录");
  const prefix = `${userId}/cooking-records/${cookingRecordId}/`;
  const safePaths = [...new Set(paths.filter((path) => path.startsWith(prefix)))];
  if (safePaths.length > 0) await bucket.remove(safePaths);
  return safePaths;
}

export async function uploadCookingRecordPhotos(
  input: UploadCookingRecordPhotosInput,
): Promise<UploadCookingRecordPhotosResult> {
  assertUuid(input.userId, "用户");
  assertUuid(input.cookingRecordId, "烹饪记录");
  if (input.files.length > 3) throw new Error("最多上传 3 张成品照片");

  const uploadedPaths: string[] = [];
  const photos: UploadedCookingPhoto[] = [];
  try {
    for (const [sortOrder, item] of input.files.entries()) {
      const storagePath = buildCookingRecordPhotoPath(input.userId, input.cookingRecordId, item.photoId);
      const file = await compressRecipeImage(item.file, input.compress);
      const upload = await input.bucket.upload(storagePath, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });
      if (upload.error) throw upload.error;
      uploadedPaths.push(storagePath);
      photos.push({ photoId: item.photoId, storagePath, sortOrder });
    }
  } catch {
    await removeCookingRecordPhotoPaths(input.bucket, input.userId, input.cookingRecordId, uploadedPaths);
    throw new Error("成品照片上传失败，请重试或移除照片");
  }

  return { photos, uploadedPaths };
}
