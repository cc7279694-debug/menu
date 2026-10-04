import { expect, it } from "vitest";
import { LocalMediaLifecycle } from "./media-lifecycle";
const photo = "images/11111111-1111-4111-8111-111111111111.png";
it("never unlinks live or pinned references and removes only unreferenced candidates", async () => {
  const removed: string[] = [];
  const lifecycle = new LocalMediaLifecycle(async (paths) => {
    removed.push(...paths);
  });
  await lifecycle.pruneCandidates([photo], async () => [photo]);
  expect(removed).toEqual([]);
  const release = lifecycle.pin([photo]);
  await lifecycle.pruneCandidates([photo], async () => []);
  expect(removed).toEqual([]);
  release();
  await lifecycle.pruneCandidates([photo], async () => []);
  expect(removed).toEqual([photo]);
});
it("reference read or unlink failure retains data and returns a cleanup warning", async () => {
  const lifecycle = new LocalMediaLifecycle(async () => {
    throw new Error("disk");
  });
  expect(
    (
      await lifecycle.pruneCandidates([photo], async () => {
        throw new Error("db");
      })
    ).cleanupWarning,
  ).not.toBeNull();
  expect(
    (await lifecycle.pruneCandidates([photo], async () => [])).cleanupWarning,
  ).not.toBeNull();
});
it("overlapping leases and double release do not unpin another export", async () => {
  const removed: string[] = [];
  const lifecycle = new LocalMediaLifecycle(async (paths) => {
    removed.push(...paths);
  });
  const a = lifecycle.pin([photo]),
    b = lifecycle.pin([photo]);
  a();
  a();
  await lifecycle.pruneCandidates([photo], async () => []);
  expect(removed).toEqual([]);
  b();
  await lifecycle.pruneCandidates([photo], async () => []);
  expect(removed).toEqual([photo]);
});
