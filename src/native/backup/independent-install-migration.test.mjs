// @vitest-environment node
// Entirely synthetic SQLite libraries and file-port emulation, never personal
// records, Android private directories, real SAF, or a Native ZIP round trip.
// The frozen synthetic v1 ZIP is read locally; staging remains a test port.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { afterEach, expect, it } from "vitest";
import { RecipeNameStore } from "../recipe-store";
import { testDatabase } from "./sqlite-test-driver.mjs";
import { SQLiteBackupRepository, canonicalSource } from "./repository";
import { DataOperationCoordinator } from "./coordinator";
import { BackupService } from "./service";
import { collectImageReferences, fromPortableData, toPortableData } from "./references";
import { normalizeBackupData, validateBackupData } from "./compatibility";
import { goldenSource, manifestFor, time } from "./test-fixtures";

const dbs = [];
afterEach(() => dbs.splice(0).forEach(db => db.close()));
function library() {
  return libraryWithStore().repository;
}
function libraryWithStore() {
  const { db, driver } = testDatabase();
  dbs.push(db);
  const gate = new DataOperationCoordinator(), clock = () => new Date(time);
  return {
    repository: new SQLiteBackupRepository(driver, gate, clock),
    store: new RecipeNameStore(driver, clock, gate),
  };
}
const commit = () => ({ operationId: randomUUID(), generationId: randomUUID(),
  dataSha256: "e".repeat(64), committedAt: time });
function withCooking() {
  const source = goldenSource();
  source.cookingRecords = [{
    id: "old-cooking-record", recipeId: source.recipes[0].id, cookedAt: time,
    finishedPhotoPath: source.recipes[0].coverPath,
    evaluation: "tasty", note: "原版历史备注 🍗",
  }];
  return source;
}
function portableTransfer(source) {
  const assets = collectImageReferences(source).map((sourcePath, index) => {
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, index + 1]);
    const assetId = createHash("sha256").update(bytes).digest("hex");
    return { sourcePath, assetId, path: "media/" + assetId + ".png",
      mimeType: "image/png", size: bytes.length, sha256: assetId };
  });
  const data = toPortableData(source, assets), manifest = manifestFor(data, assets);
  validateBackupData(data, manifest);
  return { data, manifest, assets };
}
function destinationArchive(transfer, currentAssets = []) {
  const token = randomUUID(), generationId = randomUUID();
  const paths = Object.fromEntries(transfer.assets.map(a =>
    [a.assetId, "images/generation-" + generationId + "/" + a.assetId + ".png"]));
  const approved = new Set(Object.values(paths));
  let commits = 0, safeguards = 0, safety = null;
  return {
    paths,
    get observed() { return { commits, safeguards }; },
    get safety() { return safety; },
    async chooseRestore() { return { token, ...validateBackupData(transfer.data, transfer.manifest) }; },
    async stageMedia() { return { generationId, paths }; },
    async verifyPaths(requested) { for (const path of requested)
      if (!approved.has(path)) throw new Error("Unexpected path"); },
    async inspectMedia(_token, requested) {
      return requested.map(sourcePath => {
        const asset = currentAssets.find(asset => asset.sourcePath === sourcePath);
        if (!asset) throw new Error("Unregistered synthetic safety-copy asset");
        return asset;
      });
    },
    async createSafetySnapshot(_token, data, paths, schema) {
      safeguards++;
      safety = { data: structuredClone(data), paths: { ...paths }, schema };
      return { size: 1, sha256: "a".repeat(64) };
    },
    async writeJournal() { commits++; },
    async finishOperation() {},
    async discard() {},
    async status() { return { phase: "idle" }; },
    async readJournal() { return null; },
    async cleanupOrphans() {},
  };
}
it("v2 portable data migrates to a separate SQLite library only after confirmation; cancel preserves both libraries", async () => {
  const oldDb = library(), newDb = library(), source = withCooking();
  await oldDb.replace(source, commit());
  const original = canonicalSource(await oldDb.snapshot());
  const transfer = portableTransfer(await oldDb.snapshot());
  expect(transfer.manifest).toMatchObject({
    formatVersion: 2, databaseSchemaVersion: 4,
    counts: { recipes: 1, cookingRecords: 1, media: 3 },
  });
  expect(Object.keys(transfer.manifest)).not.toContain("packageName");
  const archive = destinationArchive(transfer);
  const service = new BackupService(newDb, archive, () => new Date(time));
  await service.inspectRestore();
  expect(service.getState()).toMatchObject({ phase: "preview", currentCount: 0 });
  expect((await newDb.snapshot()).recipes).toHaveLength(0);
  await service.cancel();
  expect(service.getState().phase).toBe("cancelled");
  expect(archive.observed.commits).toBe(0);
  await service.inspectRestore();
  expect((await newDb.snapshot()).recipes).toHaveLength(0);
  await service.confirmReplace();
  expect(service.getState().phase).toBe("success");
  expect(archive.observed).toEqual({ commits: 1, safeguards: 1 });
  const imported = await newDb.snapshot();
  expect(imported.recipes[0].id).toBe(source.recipes[0].id);
  expect(imported.changes).toHaveLength(source.changes.length);
  expect(imported.cookingRecords[0]).toMatchObject({
    id: "old-cooking-record", note: "原版历史备注 🍗", evaluation: "tasty"
  });
  expect(imported.cookingRecords[0].finishedPhotoPath).toBe(imported.recipes[0].coverPath);
  expect(imported.recipes[0].coverPath).not.toBe(source.recipes[0].coverPath);
  const destinationAssets = transfer.assets.map(a => ({ ...a, sourcePath: archive.paths[a.assetId] }));
  expect(toPortableData(imported, destinationAssets)).toEqual(transfer.data);
  expect(canonicalSource(await oldDb.snapshot())).toBe(original);
});
it("an invalid manifest cannot import or change the destination database", async () => {
  const target = library(), transfer = portableTransfer(withCooking());
  const original = canonicalSource(await target.snapshot());
  transfer.manifest.media.pop();
  expect(() => validateBackupData(transfer.data, transfer.manifest)).toThrow();
  const port = destinationArchive(transfer), service = new BackupService(target, port);
  await service.inspectRestore();
  expect(service.getState().phase).toBe("error");
  expect(canonicalSource(await target.snapshot())).toBe(original);
  expect(port.observed.commits).toBe(0);
});
it("frozen v1 ZIP preserves both independent libraries until explicit replacement, including recipe and child order", async () => {
  const bytes = readFileSync("android/app/src/test/resources/golden-v1.recipio");
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313",
  );
  const zip = await JSZip.loadAsync(bytes);
  const data = JSON.parse(await zip.file("data.json").async("string"));
  const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
  const frozen = JSON.stringify({ data, manifest });
  const normalized = normalizeBackupData(validateBackupData(data, manifest));
  expect(manifest).toMatchObject({ formatVersion: 1, databaseSchemaVersion: 3,
    counts: { recipes: 2, ingredients: 3, steps: 3, changes: 2, media: 3 } });
  for (const asset of manifest.media) {
    const media = await zip.file(asset.path).async("uint8array");
    expect(media.length).toBe(asset.size);
    expect(createHash("sha256").update(media).digest("hex")).toBe(asset.sha256);
  }
  const oldDb = library(), { repository: target, store } = libraryWithStore();
  const oldGeneration = randomUUID();
  const oldAssets = manifest.media.map(asset => ({ ...asset,
    sourcePath: "images/generation-" + oldGeneration + "/" + asset.assetId + ".png" }));
  await oldDb.replace(fromPortableData(normalized,
    Object.fromEntries(oldAssets.map(asset => [asset.assetId, asset.sourcePath]))), commit());
  const oldBefore = canonicalSource(await oldDb.snapshot());
  const oldCommit = await oldDb.readRestoreCommit();
  const existing = portableTransfer(withCooking());
  await target.replace(withCooking(), commit());
  const targetBefore = canonicalSource(await target.snapshot());
  const targetCommit = await target.readRestoreCommit();
  const archive = destinationArchive({ data, manifest, assets: manifest.media }, existing.assets);
  const service = new BackupService(target, archive, () => new Date(time));
  await service.inspectRestore();
  expect(service.getState()).toMatchObject({ phase: "preview", currentCount: 1 });
  expect(canonicalSource(await target.snapshot())).toBe(targetBefore);
  await service.cancel();
  expect(service.getState().phase).toBe("cancelled");
  expect(canonicalSource(await target.snapshot())).toBe(targetBefore);
  expect(await target.readRestoreCommit()).toEqual(targetCommit);
  expect(canonicalSource(await oldDb.snapshot())).toBe(oldBefore);
  expect(archive.observed).toEqual({ commits: 0, safeguards: 0 });
  await service.inspectRestore();
  expect(service.getState()).toMatchObject({ phase: "preview", currentCount: 1 });
  expect(canonicalSource(await target.snapshot())).toBe(targetBefore);
  await service.confirmReplace();
  expect(service.getState().phase).toBe("success");
  expect(archive.observed).toEqual({ commits: 1, safeguards: 1 });
  expect(archive.safety.data).toEqual(existing.data);
  expect(archive.safety.paths).toEqual(Object.fromEntries(
    existing.assets.map(asset => [asset.assetId, asset.sourcePath]),
  ));
  expect(archive.safety.schema).toBe(4);
  expect((await target.readRestoreCommit()).dataSha256).toBe(manifest.dataFile.sha256);
  const imported = await target.snapshot();
  expect(toPortableData(imported, manifest.media.map(asset => ({ ...asset,
    sourcePath: archive.paths[asset.assetId] })))).toEqual(normalized);
  expect(imported.recipes.some(recipe => recipe.id === "recipe-fixed")).toBe(false);
  expect(imported.cookingRecords).toEqual([]);
  const ordered = await store.list();
  expect(ordered.map(recipe => [recipe.id, recipe.createdAt, recipe.updatedAt])).toEqual([
    ["bdb904b2-9d5c-415c-9331-7b17cfb97f14", "2026-10-04T05:37:18.143Z", "2026-10-04T05:37:18.143Z"],
    ["e2935c4b-7f1d-446a-9b44-116b614eb19d", "2026-10-04T04:42:32.298Z", "2026-10-04T05:37:06.547Z"],
  ]);
  const details = await store.getDetails("e2935c4b-7f1d-446a-9b44-116b614eb19d");
  expect(details.ingredients).toEqual([
    { name: "鸡翅", amount: "500g" }, { name: "可乐", amount: "1罐" }, { name: "生抽", amount: "2勺" },
  ]);
  expect(details.steps.map(step => step.instruction)).toEqual([
    "鸡翅洗净划口", "加入可乐生抽小火焖煮", "最后收汁",
  ]);
  expect(details.preparations).toEqual([{ instruction: "提前腌制", minutes: 20, timingText: null }]);
  expect(details.notes).toBe("中文\n下次少放盐 🍚");
  expect(await store.list("可乐")).toHaveLength(1);
  expect(canonicalSource(await oldDb.snapshot())).toBe(oldBefore);
  expect(await oldDb.readRestoreCommit()).toEqual(oldCommit);
  expect(JSON.stringify({ data, manifest })).toBe(frozen);
});
