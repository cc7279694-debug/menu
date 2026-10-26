// @vitest-environment node
// Entirely synthetic SQLite libraries and file-port emulation, never personal
// records, Android private directories, real SAF, or an actual ZIP round trip.
import { createHash, randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { testDatabase } from "./sqlite-test-driver.mjs";
import { SQLiteBackupRepository, canonicalSource } from "./repository";
import { DataOperationCoordinator } from "./coordinator";
import { BackupService } from "./service";
import { collectImageReferences, toPortableData } from "./references";
import { validateBackupData } from "./compatibility";
import { goldenSource, manifestFor, time } from "./test-fixtures";

const dbs = [];
afterEach(() => dbs.splice(0).forEach(db => db.close()));
function library() {
  const { db, driver } = testDatabase();
  dbs.push(db);
  return new SQLiteBackupRepository(driver, new DataOperationCoordinator(), () => new Date(time));
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
function destinationArchive(transfer) {
  const token = randomUUID(), generationId = randomUUID();
  const paths = Object.fromEntries(transfer.assets.map(a =>
    [a.assetId, "images/generation-" + generationId + "/" + a.assetId + ".png"]));
  const approved = new Set(Object.values(paths));
  let commits = 0, safeguards = 0;
  return {
    paths,
    get observed() { return { commits, safeguards }; },
    async chooseRestore() { return { token, ...validateBackupData(transfer.data, transfer.manifest) }; },
    async stageMedia() { return { generationId, paths }; },
    async verifyPaths(requested) { for (const path of requested)
      if (!approved.has(path)) throw new Error("Unexpected path"); },
    async inspectMedia() { return []; }, // New destination starts with no records.
    async createSafetySnapshot() { safeguards++; return { size: 1, sha256: "a".repeat(64) }; },
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
