import { z } from "zod";
import {
  validateBackupData as validateV1,
  type BackupManifest as BackupManifestV1,
} from "./format";
import {
  backupDataV2Schema,
  validateBackupV2,
  type BackupDataV2,
  type BackupManifestV2,
} from "./format-v2";
export type ValidatedBackup =
  ReturnType<typeof validateV1> | ReturnType<typeof validateBackupV2>;
export type BackupManifest = BackupManifestV1 | BackupManifestV2;
export function validateBackupData(
  data: unknown,
  manifest: unknown,
): ValidatedBackup {
  const version = z
    .object({ formatVersion: z.number().int() })
    .parse(manifest).formatVersion;
  if (version === 1) return validateV1(data, manifest);
  if (version === 2) return validateBackupV2(data, manifest);
  throw new Error("不支持的备份版本，请使用匹配版本的谱序");
}
/** Validate the original v1 first; never fabricate a new manifest or data hash. */
export function normalizeBackupData(checked: ValidatedBackup): BackupDataV2 {
  return backupDataV2Schema.parse(
    checked.manifest.formatVersion === 1
      ? { ...checked.data, cookingRecords: [] }
      : checked.data,
  );
}
