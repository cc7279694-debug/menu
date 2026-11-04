import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AI_LIMITS } from "./contract";
import { createAiBridge, type AiTemporaryImage } from "./native-bridge";
import { AiIntakeService } from "./service";
import { deferred, fakeAi, image } from "./service.test-support";

afterEach(__resetLocalDatabaseForTests);
const fixture = () => {
  const fake = fakeAi();
  const pickLongImage = vi.fn(async ({ operationId }: { operationId: string }) => ({ cancelled: false, images: [image(operationId), image(operationId)] }));
  const bridge = { ...fake.bridge, pickLongImage };
  const store = new PreviewRecipeLibrary();
  return { ...fake, bridge, store, service: new AiIntakeService(fake.keys, bridge, { store }) };
};

it("N2 bridge passes only the session and preserves the complete ordered owned batch", async () => {
  const fake = fakeAi(), { operationId } = await fake.bridge.createSession();
  const images = [image(operationId), image(operationId)];
  const pickLongImage = vi.fn(async () => ({ cancelled: false, images }));
  const bridge = createAiBridge({ ...fake.bridge, pickLongImage });
  expect(await bridge.pickLongImage!({ operationId })).toEqual({ cancelled: false, images });
  expect(pickLongImage.mock.calls).toEqual([[{ operationId }]]);
  await expect(bridge.pickLongImage!({ operationId, file: "file:///unowned.png" } as { operationId: string })).rejects.toMatchObject({ code: "input_invalid" });
  expect(pickLongImage).toHaveBeenCalledTimes(1);
  expect(fake.bridge.pickImage).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it("N2 bridge rejects partial, oversized, duplicate or unowned batch metadata and requires empty cancellation", async () => {
  const fake = fakeAi(), { operationId } = await fake.bridge.createSession(), valid = image(operationId);
  const invalid = [
    { cancelled: false, images: [] },
    { cancelled: false, images: [valid, valid] },
    { cancelled: false, images: Array.from({ length: 7 }, () => image(operationId)) },
    { cancelled: false, images: [{ ...valid, byteSize: AI_LIMITS.imageBytes + 1 }] },
    { cancelled: false, images: [{ ...valid, width: 2049 }] },
    { cancelled: false, images: [{ ...valid, previewUri: "file:///unowned.jpg" }] },
    { cancelled: true, images: [valid] },
  ];
  for (const reply of invalid) {
    const bridge = createAiBridge({ ...fake.bridge, pickLongImage: async () => reply });
    await expect(bridge.pickLongImage!({ operationId })).rejects.toMatchObject({ code: "invalid_output" });
  }
  const cancelled = createAiBridge({ ...fake.bridge, pickLongImage: async () => ({ cancelled: true, images: [] }) });
  expect(await cancelled.pickLongImage!({ operationId })).toEqual({ cancelled: true, images: [] });
});

it("N2 appends a batch atomically after existing images and sends its chosen order only on explicit organize", async () => {
  const { service, bridge, keys } = fixture(); await service.startSession();
  service.updateInput({ text: "用户补充：盐适量", imageIds: [] }); await service.pickImage();
  const first = service.snapshot().images[0]; await service.pickLongImage();
  const [a, b, c] = service.snapshot().images;
  expect(a).toEqual(first); expect(service.snapshot().input.imageIds).toEqual([a.id, b.id, c.id]);
  expect(keys.hasAiKey).not.toHaveBeenCalled(); expect(bridge.organize).not.toHaveBeenCalled();
  service.moveImage(c.id, -1); await service.removeImage(b.id);
  await service.organize(service.snapshot().input);
  expect(bridge.organize).toHaveBeenCalledWith(expect.objectContaining({ text: "用户补充：盐适量", imageIds: [a.id, c.id] }));
  expect(service.snapshot().confirmed).toBe(false);
  expect(() => service.assertCanSave()).toThrow();
  service.setConfirmed(true); service.assertCanSave();
});

it("N2 cancellation and batch failure retain existing input/images; full slots refuse before picker", async () => {
  const { service, bridge } = fixture(); await service.startSession();
  service.updateInput({ text: "保留输入", imageIds: [] }); await service.pickImage();
  const before = service.snapshot().images;
  bridge.pickLongImage.mockResolvedValueOnce({ cancelled: true, images: [] });
  await service.pickLongImage(); expect(service.snapshot().images).toEqual(before);
  bridge.pickLongImage.mockRejectedValueOnce({ code: "long_image_limit" });
  await expect(service.pickLongImage()).rejects.toMatchObject({ code: "long_image_limit" });
  expect(service.snapshot().input.text).toBe("保留输入"); expect(service.snapshot().images).toEqual(before);
  expect(service.snapshot().error?.message).toContain("手动分图");
  for (let i = 1; i < 6; i++) await service.pickImage();
  await expect(service.pickLongImage()).rejects.toMatchObject({ code: "image_too_large" });
  expect(bridge.pickLongImage).toHaveBeenCalledTimes(2); expect(bridge.organize).not.toHaveBeenCalled();
});

it("N2 malformed or overflowing batches never partially enter JS state", async () => {
  const { service, bridge } = fixture(); const operationId = await service.startSession(); await service.pickImage();
  const before = service.snapshot().images;
  for (const images of [[before[0]], Array.from({ length: 6 }, () => image(operationId)), [{ ...image(operationId), byteSize: AI_LIMITS.imageBytes + 1 }]]) {
    bridge.pickLongImage.mockResolvedValueOnce({ cancelled: false, images });
    await expect(service.pickLongImage()).rejects.toMatchObject({ code: "invalid_output" });
    expect(service.snapshot().images).toEqual(before); expect(service.snapshot().input.imageIds).toEqual(before.map(x => x.id));
  }
});

it("N2 discard during processing prevents a late whole batch from entering a replacement session", async () => {
  const { service, bridge } = fixture(); const old = await service.startSession();
  const batch = deferred<{ cancelled: boolean; images: AiTemporaryImage[] }>(); bridge.pickLongImage.mockReturnValueOnce(batch.promise);
  const pending = service.pickLongImage().catch(e => e);
  expect(service.snapshot().imageBusy).toBe(true);
  await expect(service.pickImage()).rejects.toMatchObject({ code: "busy" });
  await expect(service.organize({ text: "不应请求", imageIds: [] })).rejects.toMatchObject({ code: "busy" });
  await service.discard(); const fresh = await service.startSession();
  batch.resolve({ cancelled: false, images: [image(old), image(old)] });
  expect(await pending).toMatchObject({ code: "stale_session" });
  expect(service.snapshot()).toMatchObject({ operationId: fresh, images: [], imageBusy: false });
  expect(bridge.discardSession).toHaveBeenCalledWith({ operationId: old }); expect(bridge.organize).not.toHaveBeenCalled();
});
