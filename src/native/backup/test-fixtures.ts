import type { BackupData, BackupManifest } from "./format";
import type { BackupSourceSnapshot, MediaInspection } from "./references";

export const time = "2026-10-04T01:02:03.004Z";
export const imageHashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
export function goldenSource(): BackupSourceSnapshot {
  const details = {
    title: "可乐鸡翅 🍗", totalMinutes: 35, servings: 2, caloriesPerServing: null,
    coverPath: "images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png", notes: "中文\n下次少放盐 🍚\nimages/deadbeef.png 是备注",
    ingredients: [{ name: "鸡翅", amount: "6只" }, { name: "可乐", amount: "半罐" }],
    steps: [{ instruction: "洗净", imagePath: null }, { instruction: "煎至金黄", imagePath: "images/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png" }, { instruction: "小火收汁", imagePath: null }],
    preparations: [{ instruction: "腌制", minutes: 30, timingText: null }, { instruction: "解冻", minutes: null, timingText: "提前一晚" }],
    keyTips: [{ instruction: "不要煮干", stepNumber: 3 }],
  };
  return {
    sourceSchemaVersion: 3,
    recipes: [{ id: "recipe-fixed", title: details.title, createdAt: time, updatedAt: time, totalMinutes: details.totalMinutes, servings: details.servings, caloriesPerServing: null, coverPath: details.coverPath, notes: details.notes }],
    ingredients: details.ingredients.map((r, position) => ({ ...r, recipeId: "recipe-fixed", position })),
    steps: details.steps.map((r, position) => ({ ...r, recipeId: "recipe-fixed", position })),
    preparations: details.preparations.map((r, position) => ({ ...r, recipeId: "recipe-fixed", position })),
    keyTips: details.keyTips.map((r, position) => ({ ...r, recipeId: "recipe-fixed", position })),
    changes: [{ id: "change-fixed", recipeId: "recipe-fixed", changedAt: time, before: { ...details, id: "recipe-fixed", createdAt: time, updatedAt: time, coverPath: "images/cccccccc-cccc-cccc-cccc-cccccccccccc.png" }, after: details }],
    settings: {},
  };
}
export function goldenAssets(): MediaInspection[] {
  return imageHashes.map((assetId, i) => ({ sourcePath: `images/${["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "cccccccc-cccc-cccc-cccc-cccccccccccc"][i]}.png`, assetId, path: `media/${assetId}.png`, mimeType: "image/png", size: 100 + i, sha256: assetId }));
}
export function manifestFor(data: BackupData, assets = goldenAssets()): BackupManifest {
  return { format: "recipio-backup", formatVersion: 1, createdAt: time, appVersionName: "0.3.0-backup-restore", appVersionCode: 7, databaseSchemaVersion: 3, dataFile: { path: "data.json", size: new TextEncoder().encode(JSON.stringify(data)).length, sha256: "d".repeat(64) }, media: assets.map(a => ({ assetId: a.assetId, path: a.path, mimeType: a.mimeType, size: a.size, sha256: a.sha256 })), counts: { recipes: data.recipes.length, ingredients: data.ingredients.length, steps: data.steps.length, preparations: data.preparations.length, keyTips: data.keyTips.length, changes: data.changes.length, media: assets.length } };
}
