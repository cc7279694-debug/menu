import { z } from "zod";

export const limits = {
  manifestBytes: 1048576, dataBytes: 16777216, archiveBytes: 4294967296,
  media: 10000, entries: 10002, recipes: 10000, children: 100000,
  changes: 20000, jsonDepth: 32, entryName: 128,
} as const;
const id = z.string().min(1).max(128);
export const assetIdSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const utcTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v, "时间无效");
const text = z.string().min(1).max(10000).refine(v => v.trim().length > 0);
const title = z.string().min(1).max(120).refine(v => v.trim().length > 0);
const minutes = z.number().int().min(1).max(525600).nullable();
export const detailFields = {
  title, totalMinutes: minutes, servings: z.number().min(0.1).max(10000).nullable(),
  caloriesPerServing: z.number().min(0).max(100000).nullable(), notes: z.string().max(20000),
};
export const ingredientFields = { name: text, amount: z.string().max(500) };
export const preparationFields = { instruction: text, minutes, timingText: z.string().max(500).nullable() };
export const tipFields = { instruction: text, stepNumber: z.number().int().min(1).nullable() };
export const identityFields = { id, createdAt: utcTimeSchema, updatedAt: utcTimeSchema };
const portableDetails = z.strictObject({ ...detailFields, coverAssetId: assetIdSchema.nullable(),
  ingredients: z.array(z.strictObject(ingredientFields)).max(300),
  steps: z.array(z.strictObject({ instruction: text, imageAssetId: assetIdSchema.nullable() })).max(300),
  preparations: z.array(z.strictObject(preparationFields)).max(100),
  keyTips: z.array(z.strictObject(tipFields)).max(100),
});
export const portableBeforeSchema = portableDetails.extend(identityFields);
const child = { recipeId: id, position: z.number().int().min(0) };
export const backupDataSchema = z.strictObject({
  recipes: z.array(z.strictObject({ ...identityFields, ...detailFields, coverAssetId: assetIdSchema.nullable() })).max(limits.recipes),
  ingredients: z.array(z.strictObject({ ...child, ...ingredientFields })).max(limits.children),
  steps: z.array(z.strictObject({ ...child, instruction: text, imageAssetId: assetIdSchema.nullable() })).max(limits.children),
  preparations: z.array(z.strictObject({ ...child, ...preparationFields })).max(limits.children),
  keyTips: z.array(z.strictObject({ ...child, ...tipFields })).max(limits.children),
  changes: z.array(z.strictObject({ id, recipeId: id, changedAt: utcTimeSchema, before: portableBeforeSchema, after: portableDetails })).max(limits.changes),
  settings: z.strictObject({}),
});
const boundedCount = z.number().int().min(0).max(limits.children);
export const mediaSchema = z.strictObject({
  assetId: assetIdSchema, path: z.string().max(limits.entryName).regex(/^media\/[a-f0-9]{64}\.(jpg|png|webp|avif)$/),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  size: z.number().int().min(1).max(limits.archiveBytes), sha256: assetIdSchema,
}).superRefine((m, ctx) => {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[m.mimeType];
  if (m.assetId !== m.sha256 || m.path !== `media/${m.assetId}.${ext}`) ctx.addIssue({ code: "custom", message: "媒体标识、路径或类型不一致" });
});
export const backupManifestSchema = z.strictObject({
  format: z.literal("recipio-backup"), formatVersion: z.literal(1), createdAt: utcTimeSchema,
  appVersionName: z.string().min(1).max(100), appVersionCode: z.number().int().min(1).max(2147483647),
  databaseSchemaVersion: z.literal(3),
  dataFile: z.strictObject({ path: z.literal("data.json"), size: z.number().int().min(1).max(limits.dataBytes), sha256: assetIdSchema }),
  media: z.array(mediaSchema).max(limits.media),
  counts: z.strictObject({ recipes: boundedCount, ingredients: boundedCount, steps: boundedCount, preparations: boundedCount, keyTips: boundedCount, changes: boundedCount, media: boundedCount }),
});
export type BackupData = z.infer<typeof backupDataSchema>;
export type BackupManifest = z.infer<typeof backupManifestSchema>;
export type PortableDetails = z.infer<typeof portableDetails>;

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`${label}重复`);
}
function checkDetails(d: PortableDetails) {
  if (d.keyTips.some(t => t.stepNumber !== null && t.stepNumber > d.steps.length)) throw new Error("关键事项引用不存在的步骤");
}
export function portableImageReferences(data: BackupData): string[] {
  const refs: Array<string | null> = [...data.recipes.map(r => r.coverAssetId), ...data.steps.map(r => r.imageAssetId)];
  for (const change of data.changes) for (const d of [change.before, change.after]) refs.push(d.coverAssetId, ...d.steps.map(s => s.imageAssetId));
  return [...new Set(refs.filter((v): v is string => v !== null))].sort();
}
export function validateBackupData(input: unknown, manifestInput: unknown): { data: BackupData; manifest: BackupManifest } {
  const data = backupDataSchema.parse(input);
  const manifest = backupManifestSchema.parse(manifestInput);
  unique(data.recipes.map(r => r.id), "菜谱ID"); unique(data.changes.map(r => r.id), "修改记录ID");
  unique(manifest.media.map(m => m.assetId), "媒体ID");
  const recipes = new Map(data.recipes.map(r => [r.id, r]));
  for (const r of data.recipes) if (r.updatedAt < r.createdAt) throw new Error("更新时间早于创建时间");
  for (const [name, max] of [["ingredients", 300], ["steps", 300], ["preparations", 100], ["keyTips", 100]] as const) {
    const positions = new Map<string, number[]>();
    for (const row of data[name]) {
      if (!recipes.has(row.recipeId)) throw new Error("子项引用不存在的菜谱");
      const list = positions.get(row.recipeId) ?? []; list.push(row.position); positions.set(row.recipeId, list);
    }
    for (const list of positions.values()) if (list.length > max || list.sort((a,b) => a-b).some((p,i) => p !== i)) throw new Error("子项顺序不连续或超出限制");
  }
  const stepCounts = new Map<string, number>();
  for (const s of data.steps) stepCounts.set(s.recipeId, (stepCounts.get(s.recipeId) ?? 0) + 1);
  for (const t of data.keyTips) if (t.stepNumber !== null && t.stepNumber > (stepCounts.get(t.recipeId) ?? 0)) throw new Error("步骤引用无效");
  for (const c of data.changes) {
    const r = recipes.get(c.recipeId);
    if (!r || c.before.id !== c.recipeId || c.before.updatedAt < c.before.createdAt || c.changedAt < c.before.updatedAt || c.changedAt > r.updatedAt) throw new Error("修改快照所属菜谱或时间无效");
    checkDetails(c.before); checkDetails(c.after);
  }
  for (const key of Object.keys(manifest.counts) as Array<keyof BackupManifest["counts"]>) {
    const count = key === "media" ? manifest.media.length : data[key].length;
    if (manifest.counts[key] !== count) throw new Error("备份数量不一致");
  }
  if (manifest.media.reduce((sum, m) => sum + m.size, manifest.dataFile.size) > limits.archiveBytes) throw new Error("备份超过空间限制");
  if (JSON.stringify(portableImageReferences(data)) !== JSON.stringify(manifest.media.map(m => m.assetId).sort())) throw new Error("图片引用不完整或包含未引用文件");
  return { data, manifest };
}
