import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import { __resetLocalDatabaseForTests, getLocalDatabase } from "@/features/offline/local-db";
import { PreviewBackupRepository } from "./preview-repository";
import { goldenSource, time } from "./test-fixtures";
import { PreviewRecipeLibrary } from "../preview-store";
afterEach(__resetLocalDatabaseForTests);
const commit = { operationId: "preview-op", generationId: "preview-generation", dataSha256: "a".repeat(64), committedAt: time };
it("preserves all portable fields but leaves old cloud/cache stores intact", async () => {
  const db = await getLocalDatabase();
  await db.meta.put({ id: "keep", status: "complete", completedAt: time });
  const repository = new PreviewBackupRepository();
  await repository.replace(goldenSource(), commit);
  expect(await repository.snapshot()).toEqual(goldenSource());
  expect(await db.meta.get("keep")).toBeDefined();
  expect(await repository.readRestoreCommit()).toEqual(commit);
  expect(await new PreviewRecipeLibrary().list("鸡翅")).toHaveLength(1);
});
it("rolls back actual IndexedDB rows and metadata after an insert fails", async () => {
  const repository = new PreviewBackupRepository(); const db = await getLocalDatabase();
  await repository.replace(goldenSource(), commit);
  const before = await repository.snapshot();
  const reject = () => { throw new Error("injected storage failure"); };
  db.recipeChanges.hook("creating", reject);
  await expect(repository.replace(goldenSource(), { ...commit, operationId: "failed" })).rejects.toThrow();
  db.recipeChanges.hook("creating").unsubscribe(reject);
  expect(await repository.snapshot()).toEqual(before);
  expect(await repository.readRestoreCommit()).toEqual(commit);
});
