import { describe, expect, it } from "vitest";
import {
  backupDataSchema,
  backupManifestSchema,
  validateBackupData,
  limits,
  type BackupData,
} from "./format";
import { goldenV1Data, goldenAssets, manifestFor } from "./test-fixtures";

describe("Backup Format v1", () => {
  it("validates empty and name-only data without making up values", () => {
    const empty = {
      recipes: [],
      ingredients: [],
      steps: [],
      preparations: [],
      keyTips: [],
      changes: [],
      settings: {},
    };
    expect(validateBackupData(empty, manifestFor(empty, [])).data).toEqual(
      empty,
    );
    const data = {
      ...empty,
      recipes: [
        {
          id: "duck",
          title: "啤酒鸭",
          createdAt: "2026-10-04T00:00:00.000Z",
          updatedAt: "2026-10-04T00:00:00.000Z",
          totalMinutes: null,
          servings: null,
          caloriesPerServing: null,
          coverAssetId: null,
          notes: "",
        },
      ],
    };
    expect(validateBackupData(data, manifestFor(data, [])).data).toEqual(data);
  });
  it("preserves exact fields, whitespace, Chinese, newline and emoji", () => {
    const data = goldenV1Data();
    data.recipes[0].notes = "  中文\n🍗  ";
    const original = JSON.stringify(data);
    expect(validateBackupData(data, manifestFor(data)).data).toEqual(data);
    expect(JSON.stringify(data)).toBe(original);
    expect(data.changes[0].id).toBe("change-fixed");
  });
  it.each([
    ["duplicate recipe", (d: BackupData) => d.recipes.push(d.recipes[0])],
    ["duplicate change", (d: BackupData) => d.changes.push(d.changes[0])],
    ["duplicate composite key", (d: BackupData) => d.steps.push(d.steps[0])],
    [
      "position gap",
      (d: BackupData) => {
        d.steps[1].position = 10;
      },
    ],
    [
      "dangling recipe",
      (d: BackupData) => {
        d.ingredients[0].recipeId = "missing";
      },
    ],
    [
      "dangling step",
      (d: BackupData) => {
        d.keyTips[0].stepNumber = 9;
      },
    ],
    [
      "dangling media",
      (d: BackupData) => {
        d.recipes[0].coverAssetId = "e".repeat(64);
      },
    ],
    [
      "wrong historical identity",
      (d: BackupData) => {
        d.changes[0].before.id = "other";
      },
    ],
    [
      "negative time",
      (d: BackupData) => {
        d.recipes[0].totalMinutes = -1;
      },
    ],
    [
      "invalid UTC",
      (d: BackupData) => {
        d.recipes[0].updatedAt = "2026-99-04T00:00:00.000Z";
      },
    ],
    [
      "reverse time",
      (d: BackupData) => {
        d.recipes[0].updatedAt = "2025-10-04T00:00:00.000Z";
      },
    ],
  ])("rejects %s before mutation", (_name, mutate) => {
    const data = goldenV1Data();
    mutate(data);
    const original = JSON.stringify(data);
    expect(() => validateBackupData(data, manifestFor(data))).toThrow();
    expect(JSON.stringify(data)).toBe(original);
  });
  it("rejects unknown fields, wrong counts, unused assets and future versions", () => {
    const data = goldenV1Data();
    const m = manifestFor(data);
    expect(() => backupDataSchema.parse({ ...data, surprise: true })).toThrow();
    expect(() =>
      backupManifestSchema.parse({ ...m, formatVersion: 2 }),
    ).toThrow();
    expect(() =>
      backupManifestSchema.parse({ ...m, databaseSchemaVersion: 4 }),
    ).toThrow();
    expect(() =>
      validateBackupData(data, { ...m, counts: { ...m.counts, steps: 1 } }),
    ).toThrow();
    expect(() =>
      validateBackupData(
        data,
        manifestFor(data, [
          ...goldenAssets(),
          {
            ...goldenAssets()[0],
            assetId: "e".repeat(64),
            sha256: "e".repeat(64),
            path: `media/${"e".repeat(64)}.png`,
          },
        ]),
      ),
    ).toThrow();
    expect(() =>
      backupDataSchema.parse({
        ...data,
        recipes: Array(limits.recipes + 1).fill(data.recipes[0]),
      }),
    ).toThrow();
  });
  it("checks manifest path, MIME/hash agreement and safe bounded lengths", () => {
    const m = manifestFor(goldenV1Data());
    for (const invalid of [
      { ...m, dataFile: { ...m.dataFile, path: "../data.json" } },
      {
        ...m,
        media: [{ ...m.media[0], path: `media/${m.media[0].assetId}.jpg` }],
      },
      { ...m, media: [{ ...m.media[0], sha256: "f".repeat(64) }] },
    ])
      expect(() => backupManifestSchema.parse(invalid)).toThrow();
  });
});
