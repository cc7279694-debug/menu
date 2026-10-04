// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { testDatabase } from "./sqlite-test-driver.mjs";
import { SQLiteBackupRepository, canonicalSource } from "./repository";
import { RecipeNameStore } from "../recipe-store";
import { LocalMediaLifecycle, readSqlImagePaths } from "../media-lifecycle";
import { DataOperationCoordinator } from "./coordinator";
import { goldenSource, goldenAssets, manifestFor, time } from "./test-fixtures";
import { toPortableData, fromPortableData } from "./references";
import { validateBackupData } from "./compatibility";
const databases = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));
const commit = {
  operationId: "op",
  generationId: "generation",
  dataSha256: "a".repeat(64),
  committedAt: time,
};
function setup() {
  const { db, driver } = testDatabase();
  databases.push(db);
  const deleted = [],
    media = new LocalMediaLifecycle(async (paths) => {
      deleted.push(...paths);
    }),
    gate = new DataOperationCoordinator();
  return {
    db,
    driver,
    deleted,
    media,
    repo: new SQLiteBackupRepository(driver, gate, () => new Date(time), media),
    store: new RecipeNameStore(driver, () => new Date(time), gate, media),
  };
}
function cookedSource() {
  const s = goldenSource();
  s.cookingRecords = [
    {
      id: "cooked",
      recipeId: s.recipes[0].id,
      cookedAt: time,
      finishedPhotoPath: s.recipes[0].coverPath,
      evaluation: "tasty",
      note: "  中文\n🍗  ",
    },
  ];
  return s;
}
it("round trips seven tables and one shared photo/cover asset with exact fields", async () => {
  const { repo } = setup(),
    s = cookedSource();
  await repo.replace(s, commit);
  expect(await repo.snapshot()).toEqual(s);
  const data = toPortableData(s, goldenAssets()),
    checked = validateBackupData(data, manifestFor(data));
  expect(checked.manifest.formatVersion).toBe(2);
  expect(data.cookingRecords[0].finishedPhotoAssetId).toBe(
    data.recipes[0].coverAssetId,
  );
  expect(
    fromPortableData(
      data,
      Object.fromEntries(goldenAssets().map((a) => [a.assetId, a.sourcePath])),
    ),
  ).toEqual(s);
});
it("a failing cooking insert rolls back every table and restore metadata", async () => {
  const { repo, db } = setup();
  await repo.replace(cookedSource(), commit);
  const before = canonicalSource(await repo.snapshot());
  db.exec(
    "CREATE TRIGGER fail_cooking BEFORE INSERT ON cooking_records WHEN NEW.id='fail' BEGIN SELECT RAISE(ABORT,'injected'); END",
  );
  const next = cookedSource();
  next.recipes[0].title = "不得残留";
  next.cookingRecords.push({ ...next.cookingRecords[0], id: "fail" });
  await expect(
    repo.replace(next, { ...commit, operationId: "failed" }),
  ).rejects.toThrow();
  expect(canonicalSource(await repo.snapshot())).toBe(before);
  expect(await repo.readRestoreCommit()).toEqual(commit);
});
it("snapshot pins precede unlocking and retain cooking-only files during concurrent deletion", async () => {
  const { repo, store, media, driver, deleted } = setup();
  await repo.replace(goldenSource(), commit);
  const path = "images/dddddddd-dddd-dddd-dddd-dddddddddddd.png";
  await store.recordCooking("recipe-fixed", "photo-only");
  await store.updateCookingRecord("photo-only", {
    finishedPhotoPath: path,
    evaluation: null,
    note: null,
  });
  let release, started;
  const waiting = new Promise((r) => {
      release = r;
    }),
    ready = new Promise((r) => {
      started = r;
    });
  const exporting = repo.withPinnedSnapshot(async (source) => {
    expect(source.cookingRecords[0].finishedPhotoPath).toBe(path);
    started();
    await waiting;
  });
  await ready;
  await store.deleteCookingRecord("photo-only");
  expect(deleted).toEqual([]);
  release();
  await exporting;
  await media.pruneCandidates([path], () => readSqlImagePaths(driver));
  expect(deleted).toEqual([path]);
});
it("failed export work releases its pin without changing existing data", async () => {
  const { repo, store, media, driver, deleted } = setup();
  await repo.replace(goldenSource(), commit);
  const path = "images/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.png";
  await store.recordCooking("recipe-fixed", "photo-only");
  await store.updateCookingRecord("photo-only", {
    finishedPhotoPath: path,
    evaluation: null,
    note: null,
  });
  await expect(
    repo.withPinnedSnapshot(async () => {
      throw new Error("archive IO");
    }),
  ).rejects.toThrow();
  await store.deleteCookingRecord("photo-only");
  await media.pruneCandidates([path], () => readSqlImagePaths(driver));
  expect(deleted).toContain(path);
});
