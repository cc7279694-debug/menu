import { z } from "zod";
import { cookingEvaluationSchema } from "../cooking-model";
import { entityIdSchema } from "../record-validation";
import {
  assetIdSchema,
  backupDataSchema,
  backupManifestSchema,
  limits,
  portableImageReferences as v1Images,
  utcTimeSchema,
  validateDataRelations as v1Relations,
} from "./format";

export const backupDataV2Schema = backupDataSchema.extend({
  cookingRecords: z
    .array(
      z.strictObject({
        id: entityIdSchema,
        recipeId: entityIdSchema,
        cookedAt: utcTimeSchema,
        finishedPhotoAssetId: assetIdSchema.nullable(),
        evaluation: cookingEvaluationSchema.nullable(),
        note: z.string().max(2000).nullable(),
      }),
    )
    .max(100000),
});
export const backupManifestV2Schema = backupManifestSchema.extend({
  formatVersion: z.literal(2),
  databaseSchemaVersion: z.literal(4),
  counts: backupManifestSchema.shape.counts.extend({
    cookingRecords: z.number().int().min(0).max(100000),
  }),
});
export type BackupDataV2 = z.infer<typeof backupDataV2Schema>;
export type BackupManifestV2 = z.infer<typeof backupManifestV2Schema>;
export function portableImageReferencesV2(data: BackupDataV2): string[] {
  return [
    ...new Set([
      ...v1Images(data),
      ...data.cookingRecords.flatMap((r) =>
        r.finishedPhotoAssetId === null ? [] : [r.finishedPhotoAssetId],
      ),
    ]),
  ].sort();
}
export function validateDataRelationsV2(input: unknown): BackupDataV2 {
  const data = backupDataV2Schema.parse(input);
  const { cookingRecords, ...oldFields } = data;
  v1Relations(oldFields);
  if (new Set(cookingRecords.map((r) => r.id)).size !== cookingRecords.length)
    throw new Error("烹饪记录ID重复");
  const recipes = new Set(data.recipes.map((r) => r.id));
  if (cookingRecords.some((r) => !recipes.has(r.recipeId)))
    throw new Error("烹饪记录引用不存在的菜谱");
  return data;
}
export function validateBackupV2(input: unknown, manifestInput: unknown) {
  const data = validateDataRelationsV2(input),
    manifest = backupManifestV2Schema.parse(manifestInput);
  if (
    new Set(manifest.media.map((m) => m.assetId)).size !== manifest.media.length
  )
    throw new Error("媒体ID重复");
  for (const key of Object.keys(manifest.counts) as Array<
    keyof BackupManifestV2["counts"]
  >) {
    if (
      manifest.counts[key] !==
      (key === "media" ? manifest.media.length : data[key].length)
    )
      throw new Error("备份数量不一致");
  }
  if (
    manifest.media.reduce((n, m) => n + m.size, manifest.dataFile.size) >
    limits.archiveBytes
  )
    throw new Error("备份超过空间限制");
  if (
    JSON.stringify(portableImageReferencesV2(data)) !==
    JSON.stringify(manifest.media.map((m) => m.assetId).sort())
  )
    throw new Error("图片引用不完整或包含未引用文件");
  return { data, manifest };
}
