import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
import { localImagePath } from "../recipe-model";
import { assetIdSchema, limits, mediaSchema } from "./format";
import { validateBackupData, type ValidatedBackup } from "./compatibility";
import {
  backupDataV2Schema,
  backupManifestV2Schema,
  type BackupDataV2,
  type BackupManifestV2,
} from "./format-v2";
import type { MediaInspection } from "./references";

const tokenSchema = z.uuid();
const resultSchema = z.strictObject({
  size: z.number().int().min(1).max(limits.archiveBytes),
  sha256: assetIdSchema,
});
export const journalSchema = z.strictObject({
  operationId: tokenSchema,
  generationId: tokenSchema,
  dataSha256: assetIdSchema,
  phase: z.enum(["staged", "committing"]),
});
export type RestoreJournal = z.infer<typeof journalSchema>;
export type ArchiveOperationStatus = { phase: string; token?: string };
export type ExportResult = {
  manifest: BackupManifestV2;
  fileName: string;
  size: number;
  sha256: string;
};
export type ChosenRestore =
  { cancelled: true } | (ValidatedBackup & { token: string });
export interface NativeBackupPlugin {
  chooseExport(options: { suggestedName: string }): Promise<unknown>;
  inspectMedia(options: { token: string; paths: string[] }): Promise<unknown>;
  writeExport(options: {
    token: string;
    data: BackupDataV2;
    sourceSchemaVersion: number;
  }): Promise<unknown>;
  chooseRestore(): Promise<unknown>;
  stageMedia(options: { token: string }): Promise<unknown>;
  discard(options: { token: string }): Promise<void>;
  status(): Promise<unknown>;
  createSafetySnapshot(options: {
    token: string;
    data: BackupDataV2;
    paths: Record<string, string>;
    sourceSchemaVersion: number;
  }): Promise<unknown>;
  writeJournal(options: {
    token: string;
    phase: "staged" | "committing";
    dataSha256: string;
    generationId: string;
  }): Promise<void>;
  readJournal(): Promise<unknown>;
  finishOperation(options: {
    token: string;
    committed: boolean;
  }): Promise<void>;
  verifyPaths(options: { paths: string[] }): Promise<void>;
  cleanupOrphans(): Promise<void>;
}
export interface ArchivePort {
  chooseExport(name: string): Promise<{ cancelled: true } | { token: string }>;
  inspectMedia(token: string, paths: string[]): Promise<MediaInspection[]>;
  writeExport(
    token: string,
    data: BackupDataV2,
    sourceSchemaVersion: number,
  ): Promise<ExportResult>;
  chooseRestore(): Promise<ChosenRestore>;
  stageMedia(
    token: string,
  ): Promise<{ generationId: string; paths: Record<string, string> }>;
  discard(token: string): Promise<void>;
  status(): Promise<ArchiveOperationStatus>;
  createSafetySnapshot(
    token: string,
    data: BackupDataV2,
    paths: Record<string, string>,
    sourceSchemaVersion: number,
  ): Promise<{ size: number; sha256: string }>;
  writeJournal(
    token: string,
    phase: "staged" | "committing",
    dataSha256: string,
    generationId: string,
  ): Promise<void>;
  readJournal(): Promise<RestoreJournal | null>;
  finishOperation(token: string, committed: boolean): Promise<void>;
  verifyPaths(paths: string[]): Promise<void>;
  cleanupOrphans(): Promise<void>;
}
const chosenSchema = z.union([
  z.strictObject({ cancelled: z.literal(true) }),
  z.strictObject({ token: tokenSchema }),
]);
function boundedJson(value: unknown, maximum: number = limits.dataBytes) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > maximum)
    throw new Error("备份数据超过本版本处理上限");
}
export class NativeArchive implements ArchivePort {
  constructor(private readonly plugin: NativeBackupPlugin) {}
  async chooseExport(suggestedName: string) {
    return chosenSchema.parse(
      await this.plugin.chooseExport({
        suggestedName: z
          .string()
          .min(1)
          .max(150)
          .regex(/^[^/\\\u0000-\u001f]+\.recipio$/)
          .parse(suggestedName),
      }),
    );
  }
  async inspectMedia(token: string, paths: string[]) {
    boundedJson(paths);
    const input = {
      token: tokenSchema.parse(token),
      paths: paths.map((p) => localImagePath.parse(p)),
    };
    const response = await this.plugin.inspectMedia(input);
    boundedJson(response);
    return z
      .strictObject({
        assets: z.array(mediaSchema.safeExtend({ sourcePath: localImagePath })),
      })
      .parse(response).assets;
  }
  async writeExport(
    token: string,
    data: BackupDataV2,
    sourceSchemaVersion: number,
  ) {
    boundedJson(data);
    return z
      .strictObject({
        ...resultSchema.shape,
        fileName: z.string().min(1).max(200),
        manifest: backupManifestV2Schema,
      })
      .parse(
        await this.plugin.writeExport({
          token: tokenSchema.parse(token),
          data: backupDataV2Schema.parse(data),
          sourceSchemaVersion: z.literal(4).parse(sourceSchemaVersion),
        }),
      );
  }
  async chooseRestore(): Promise<ChosenRestore> {
    const raw = await this.plugin.chooseRestore();
    boundedJson(raw, limits.dataBytes + limits.manifestBytes + 1024);
    if (z.strictObject({ cancelled: z.literal(true) }).safeParse(raw).success)
      return { cancelled: true };
    const response = z
      .strictObject({
        token: tokenSchema,
        manifest: z.unknown(),
        data: z.unknown(),
      })
      .parse(raw);
    try {
      return {
        token: response.token,
        ...validateBackupData(response.data, response.manifest),
      };
    } catch (error) {
      await this.plugin.discard({ token: response.token });
      throw error;
    }
  }
  async stageMedia(token: string) {
    return z
      .strictObject({
        generationId: tokenSchema,
        paths: z.record(assetIdSchema, localImagePath),
      })
      .parse(await this.plugin.stageMedia({ token: tokenSchema.parse(token) }));
  }
  async discard(token: string) {
    await this.plugin.discard({ token: tokenSchema.parse(token) });
  }
  async status() {
    return z
      .strictObject({ phase: z.string(), token: tokenSchema.optional() })
      .parse(await this.plugin.status());
  }
  async createSafetySnapshot(
    token: string,
    data: BackupDataV2,
    paths: Record<string, string>,
    sourceSchemaVersion: number,
  ) {
    boundedJson(data);
    const safePaths = z.record(assetIdSchema, localImagePath).parse(paths);
    return resultSchema.parse(
      await this.plugin.createSafetySnapshot({
        token: tokenSchema.parse(token),
        data: backupDataV2Schema.parse(data),
        paths: safePaths,
        sourceSchemaVersion: z.literal(4).parse(sourceSchemaVersion),
      }),
    );
  }
  async writeJournal(
    token: string,
    phase: "staged" | "committing",
    dataSha256: string,
    generationId: string,
  ) {
    const j = journalSchema.parse({
      operationId: token,
      phase,
      dataSha256,
      generationId,
    });
    await this.plugin.writeJournal({
      token: j.operationId,
      phase: j.phase,
      dataSha256: j.dataSha256,
      generationId: j.generationId,
    });
  }
  async readJournal() {
    return z
      .strictObject({ journal: journalSchema.nullable() })
      .parse(await this.plugin.readJournal()).journal;
  }
  async finishOperation(token: string, committed: boolean) {
    await this.plugin.finishOperation({
      token: tokenSchema.parse(token),
      committed,
    });
  }
  async verifyPaths(paths: string[]) {
    await this.plugin.verifyPaths({
      paths: paths.map((p) => localImagePath.parse(p)),
    });
  }
  async cleanupOrphans() {
    await this.plugin.cleanupOrphans();
  }
}
export function createNativeArchive(): NativeArchive {
  if (Capacitor.getPlatform() !== "android")
    throw new Error(
      "完整备份与恢复请在 Android 应用中使用；浏览器预览不代替原生文件验收。",
    );
  return new NativeArchive(registerPlugin<NativeBackupPlugin>("LocalBackup"));
}
