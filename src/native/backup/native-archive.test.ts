import { expect, it, vi } from "vitest";
import { NativeArchive, type NativeBackupPlugin } from "./native-archive";
import { goldenAssets, goldenSource, manifestFor } from "./test-fixtures";
import { toPortableData } from "./references";
const token = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const data = toPortableData(goldenSource(), goldenAssets());
function plugin(): NativeBackupPlugin {
  return { chooseExport: vi.fn(async () => ({ token })), inspectMedia: vi.fn(async () => ({ assets: goldenAssets() })), writeExport: vi.fn(async () => ({ manifest: manifestFor(data), fileName: "测试.recipio", size: 1000, sha256: "e".repeat(64) })), chooseRestore: vi.fn(async () => ({ token, manifest: manifestFor(data), data })), stageMedia: vi.fn(async () => ({ generationId: token, paths: {} })), discard: vi.fn(async () => undefined), status: vi.fn(async () => ({ phase: "idle" })), createSafetySnapshot: vi.fn(async () => ({ size: 1000, sha256: "e".repeat(64) })), writeJournal: vi.fn(async () => undefined), readJournal: vi.fn(async () => ({ journal: null })), finishOperation: vi.fn(async () => undefined), verifyPaths: vi.fn(async () => undefined), cleanupOrphans: vi.fn(async () => undefined) };
}
it("rejects invalid tokens and source paths before reaching the bridge", async () => {
  const p = plugin(); const archive = new NativeArchive(p);
  await expect(archive.inspectMedia("../../bad", [])).rejects.toThrow();
  await expect(archive.inspectMedia(token, ["../../secret"])).rejects.toThrow();
  expect(p.inspectMedia).not.toHaveBeenCalled();
});
it("validates untrusted bridge response and respects picker cancellation", async () => {
  const p = plugin(); const archive = new NativeArchive(p);
  expect((await archive.chooseRestore())).toEqual({ token, manifest: manifestFor(data), data });
  vi.mocked(p.chooseExport).mockResolvedValue({ cancelled: true });
  expect(await archive.chooseExport("test.recipio")).toEqual({ cancelled: true });
  vi.mocked(p.chooseRestore).mockResolvedValue({ token, manifest: { ...manifestFor(data), formatVersion: 99 }, data });
  await expect(archive.chooseRestore()).rejects.toThrow();
});
