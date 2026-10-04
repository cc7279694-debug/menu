import { expect, it } from "vitest";
import { collectImageReferences, toPortableData, fromPortableData } from "./references";
import { goldenSource, goldenAssets } from "./test-fixtures";

it("collects current and historical images but never interprets notes as paths", () => {
  expect(collectImageReferences(goldenSource()).sort()).toEqual(goldenAssets().map(a => a.sourcePath).sort());
});
it("round trips all exact entities and snapshots through portable references", () => {
  const source = goldenSource();
  const assets = goldenAssets();
  const data = toPortableData(source, assets);
  expect(data.changes[0].before.coverAssetId).toBe(assets[2].assetId);
  expect(JSON.stringify(data)).not.toContain("images/aaaaaaaa");
  expect(fromPortableData(data, Object.fromEntries(assets.map(a => [a.assetId, a.sourcePath])))).toEqual(source);
});
it("fails closed for missing references and unsafe mapped destinations", () => {
  expect(() => toPortableData(goldenSource(), goldenAssets().slice(0, 2))).toThrow();
  const data = toPortableData(goldenSource(), goldenAssets());
  expect(() => fromPortableData(data, {})).toThrow();
  expect(() => fromPortableData(data, Object.fromEntries(goldenAssets().map(a => [a.assetId, "../../secret"])))).toThrow();
});
