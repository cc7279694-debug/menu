import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import {
  getLocalDatabase,
  __resetLocalDatabaseForTests,
} from "@/features/offline/local-db";
import { clearOfflineData } from "@/features/offline/database";
import { saveLocalImage, resolveLocalImage } from "./media";
afterEach(__resetLocalDatabaseForTests);
it("rejects unsupported files and traversal paths", async () => {
  await expect(
    saveLocalImage(new File(["<svg/>"], "bad.svg", { type: "image/svg+xml" })),
  ).rejects.toThrow();
  await expect(resolveLocalImage("../../secret")).rejects.toThrow();
  expect(await (await getLocalDatabase()).media.count()).toBe(0);
});
it("keeps device-owned images when clearing legacy cloud caches", async () => {
  const path = await saveLocalImage(
    new File(["image"], "a.png", { type: "image/png" }),
  );
  await clearOfflineData();
  const records = await (await getLocalDatabase()).media.toArray();
  expect(records).toHaveLength(1);
  expect(records[0].sourceKey).toBe(path);
  expect(records[0].byteSize).toBe(5);
});
