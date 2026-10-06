import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "./service";
import { fakeAi, output, deferred } from "./service.test-support";
afterEach(__resetLocalDatabaseForTests);
it("verified external draft enters the same strict Preview gate without organizing again", async () => {
  const fake = fakeAi(), store = new PreviewRecipeLibrary(), service = new AiIntakeService(fake.keys, fake.bridge, { store });
  await service.acceptExternalDraft(output(), { text: "啤酒鸭", hasImages: false }, () => true);
  expect(service.snapshot().phase).toBe("preview"); expect(fake.bridge.organize).not.toHaveBeenCalled();
  await expect(service.save(service.snapshot().draft!.recipe)).rejects.toMatchObject({ code: "review_required" }); expect(await store.list()).toEqual([]);
});
it("malformed external data or invalidated owner cannot activate a draft", async () => {
  const fake = fakeAi(), store = new PreviewRecipeLibrary(), service = new AiIntakeService(fake.keys, fake.bridge, { store });
  await expect(service.acceptExternalDraft("{}", { text: "", hasImages: false }, () => true)).rejects.toMatchObject({ code: "invalid_output" });
  expect(service.snapshot().draft).toBeNull();
  const session = deferred<{ operationId: string }>(); fake.bridge.createSession.mockReturnValueOnce(session.promise);
  let current = true; const waiting = service.acceptExternalDraft(output(), { text: "啤酒鸭", hasImages: false }, () => current).catch(e => e);
  await vi.waitFor(() => expect(fake.bridge.createSession).toHaveBeenCalledTimes(1)); current = false; session.resolve({ operationId: crypto.randomUUID() });
  expect(await waiting).toMatchObject({ code: "stale_session" }); expect(service.snapshot().draft).toBeNull();
});
it("external handoff reserves the empty session before awaiting native creation", async () => {
  const fake = fakeAi(), store = new PreviewRecipeLibrary(), service = new AiIntakeService(fake.keys, fake.bridge, { store });
  const session = deferred<{ operationId: string }>(); fake.bridge.createSession.mockReturnValueOnce(session.promise);
  const handoff = service.acceptExternalDraft(output(), { text: "啤酒鸭", hasImages: false }, () => true);
  expect(() => service.updateInput({ text: "未完成输入", imageIds: [] })).toThrow();
  await expect(service.acceptExternalDraft(output("第二份"), { text: "", hasImages: false }, () => true)).rejects.toMatchObject({ code: "busy" });
  session.resolve({ operationId: crypto.randomUUID() }); await handoff;
  expect(service.snapshot()).toMatchObject({ phase: "preview", imageBusy: false, input: { text: "", imageIds: [] } });
  expect(fake.bridge.createSession).toHaveBeenCalledTimes(1);
});
