// @vitest-environment node
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { validateBackupData, normalizeBackupData } from "./compatibility";
const time = "2026-10-04T01:02:03.004Z";
const v1 = () => ({
  recipes: [
    {
      id: "duck",
      title: "啤酒鸭 🍗",
      createdAt: time,
      updatedAt: time,
      totalMinutes: null,
      servings: null,
      caloriesPerServing: null,
      coverAssetId: null,
      notes: "中文\n换行",
    },
  ],
  ingredients: [],
  steps: [],
  preparations: [],
  keyTips: [],
  changes: [],
  settings: {},
});
const record = () => ({
  id: "cooked",
  recipeId: "duck",
  cookedAt: time,
  finishedPhotoAssetId: null,
  evaluation: null,
  note: null,
});
function manifest(data, version = 1) {
  const counts = Object.fromEntries(
    Object.entries(data)
      .filter(([k]) => k !== "settings")
      .map(([k, v]) => [k, v.length]),
  );
  return {
    format: "recipio-backup",
    formatVersion: version,
    createdAt: time,
    appVersionName: "test",
    appVersionCode: 11,
    databaseSchemaVersion: version === 1 ? 3 : 4,
    dataFile: {
      path: "data.json",
      size: Buffer.byteLength(JSON.stringify(data)),
      sha256: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
    },
    media: [],
    counts: { ...counts, media: 0 },
  };
}
it("validates the unchanged real v1 Golden and normalizes only missing cooking records", async () => {
  const bytes = readFileSync(
    "android/app/src/test/resources/golden-v1.recipio",
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313",
  );
  const zip = await JSZip.loadAsync(bytes);
  const data = JSON.parse(await zip.file("data.json").async("string")),
    original = JSON.parse(await zip.file("manifest.json").async("string"));
  const checked = validateBackupData(data, original);
  expect(checked.manifest).toEqual(original);
  expect(normalizeBackupData(checked)).toEqual({ ...data, cookingRecords: [] });
  expect(data.changes).toHaveLength(2);
});
it("retains frozen v1 required/unknown fields and original hash", () => {
  const data = v1(),
    m = manifest(data);
  const { changes, ...missing } = data;
  expect(changes).toEqual([]);
  expect(() => validateBackupData(missing, m)).toThrow();
  expect(() =>
    validateBackupData({ ...data, cookingRecords: [] }, m),
  ).toThrow();
  const checked = validateBackupData(data, m);
  expect(checked.manifest.dataFile.sha256).toBe(m.dataFile.sha256);
  expect(normalizeBackupData(checked).cookingRecords).toEqual([]);
});
it("accepts strict v2 cooking fields without changing identity or nullable extras", () => {
  const data = { ...v1(), cookingRecords: [record()] };
  expect(validateBackupData(data, manifest(data, 2)).data).toEqual(data);
  expect(
    normalizeBackupData(validateBackupData(data, manifest(data, 2))),
  ).toEqual(data);
});
it.each([
  "recipeId",
  "evaluation",
  "note",
  "asset",
  "count",
  "version",
  "schema",
  "required",
  "duplicate",
])("rejects invalid v2 %s before mutation", (field) => {
  const data = { ...v1(), cookingRecords: [record()] },
    m = manifest(data, 2);
  if (field === "recipeId") data.cookingRecords[0].recipeId = "missing";
  if (field === "evaluation") data.cookingRecords[0].evaluation = "great";
  if (field === "note") data.cookingRecords[0].note = "x".repeat(2001);
  if (field === "asset")
    data.cookingRecords[0].finishedPhotoAssetId = "a".repeat(64);
  if (field === "count") m.counts.cookingRecords = 5;
  if (field === "version") m.formatVersion = 3;
  if (field === "schema") m.databaseSchemaVersion = 3;
  if (field === "required") delete data.cookingRecords[0].note;
  if (field === "duplicate") data.cookingRecords.push(record());
  const before = JSON.stringify(data);
  expect(() => validateBackupData(data, m)).toThrow();
  expect(JSON.stringify(data)).toBe(before);
});
