import { z } from "zod";
import { localImagePath } from "../recipe-model";
import { assetIdSchema, backupDataSchema, detailFields, identityFields, ingredientFields, preparationFields, tipFields, type BackupData, type BackupManifest } from "./format";

const details = z.strictObject({ ...detailFields, coverPath: localImagePath.nullable(),
  ingredients: z.array(z.strictObject(ingredientFields)).max(300),
  steps: z.array(z.strictObject({ instruction: z.string().min(1).max(10000), imagePath: localImagePath.nullable() })).max(300),
  preparations: z.array(z.strictObject(preparationFields)).max(100), keyTips: z.array(z.strictObject(tipFields)).max(100),
});
const child = { recipeId: z.string().min(1).max(128), position: z.number().int().min(0) };
export const sourceSnapshotSchema = backupDataSchema.extend({
  sourceSchemaVersion: z.literal(3),
  recipes: z.array(z.strictObject({ ...identityFields, ...detailFields, coverPath: localImagePath.nullable() })).max(10000),
  steps: z.array(z.strictObject({ ...child, instruction: z.string().min(1).max(10000), imagePath: localImagePath.nullable() })).max(100000),
  changes: z.array(z.strictObject({ id: z.string().min(1).max(128), recipeId: z.string().min(1).max(128), changedAt: identityFields.updatedAt, before: details.extend(identityFields), after: details })).max(20000),
});
export type BackupSourceSnapshot = z.infer<typeof sourceSnapshotSchema>;
export type MediaInspection = BackupManifest["media"][number] & { sourcePath: string };
export function collectImageReferences(input: BackupSourceSnapshot): string[] {
  const source = sourceSnapshotSchema.parse(input);
  const paths: Array<string | null> = [...source.recipes.map(r => r.coverPath), ...source.steps.map(s => s.imagePath)];
  for (const c of source.changes) for (const d of [c.before, c.after]) paths.push(d.coverPath, ...d.steps.map(s => s.imagePath));
  return [...new Set(paths.filter((p): p is string => p !== null))].sort();
}
export function toPortableData(input: BackupSourceSnapshot, assets: MediaInspection[]): BackupData {
  const s = sourceSnapshotSchema.parse(input);
  const map = new Map(assets.map(a => [localImagePath.parse(a.sourcePath), assetIdSchema.parse(a.assetId)]));
  const asset = (path: string | null) => { if (path === null) return null; const value = map.get(path); if (!value) throw new Error("图片未纳入备份"); return value; };
  const transform = <T extends BackupSourceSnapshot["changes"][number]["after"]>(d: T) => {
    const { coverPath, steps, ...rest } = d;
    return { ...rest, coverAssetId: asset(coverPath), steps: steps.map(({ imagePath, ...step }) => ({ ...step, imageAssetId: asset(imagePath) })) };
  };
  return backupDataSchema.parse({ ingredients: s.ingredients, preparations: s.preparations, keyTips: s.keyTips, settings: s.settings, recipes: s.recipes.map(({ coverPath, ...r }) => ({ ...r, coverAssetId: asset(coverPath) })), steps: s.steps.map(({ imagePath, ...r }) => ({ ...r, imageAssetId: asset(imagePath) })), changes: s.changes.map(c => ({ ...c, before: transform(c.before), after: transform(c.after) })) });
}
export function fromPortableData(input: BackupData, paths: Record<string, string>): BackupSourceSnapshot {
  const d = backupDataSchema.parse(input);
  const path = (asset: string | null) => { if (asset === null) return null; if (!Object.hasOwn(paths, asset)) throw new Error("恢复图片缺失"); return localImagePath.parse(paths[asset]); };
  const transform = <T extends BackupData["changes"][number]["after"]>(r: T) => {
    const { coverAssetId, steps, ...rest } = r;
    return { ...rest, coverPath: path(coverAssetId), steps: steps.map(({ imageAssetId, ...step }) => ({ ...step, imagePath: path(imageAssetId) })) };
  };
  return sourceSnapshotSchema.parse({ ...d, sourceSchemaVersion: 3, recipes: d.recipes.map(({ coverAssetId, ...r }) => ({ ...r, coverPath: path(coverAssetId) })), steps: d.steps.map(({ imageAssetId, ...r }) => ({ ...r, imagePath: path(imageAssetId) })), changes: d.changes.map(c => ({ ...c, before: transform(c.before), after: transform(c.after) })) });
}
