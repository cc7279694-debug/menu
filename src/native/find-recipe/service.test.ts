import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { fakeAi, output, deferred } from "../ai/service.test-support";
import { FindRecipeService } from "./service";
import type { FinderPort } from "./contract";
import type { BackupController } from "../backup/backup-controls";
import type { BackupState } from "../backup/service";
afterEach(__resetLocalDatabaseForTests);
function fixture(backup?: BackupController) {
  const fake = fakeAi(), store = new PreviewRecipeLibrary();
  const candidate = { id: "candidate-1", title: "啤酒鸭", sourceUrl: "https://example.com/duck", sourceHost: "example.com", summary: "公开来源", highlights: ["啤酒焖制"], totalMinutes: null, preparationHint: "" };
  const port = { createSession: vi.fn(async () => ({ sessionId: crypto.randomUUID() })), discardSession: vi.fn(async () => {}), cancel: vi.fn(async () => {}), search: vi.fn(async () => ({ candidates: [candidate] })), extract: vi.fn<FinderPort["extract"]>(async () => ({ rawJson: output(), sourceText: "啤酒鸭" })) } satisfies FinderPort;
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store, backup });
  return { fake, store, ai, port, candidate, service: new FindRecipeService({ port, ai, backup }) };
}
it("typing and session creation never request a Provider or write a recipe", async () => {
  const { service, port, store, fake } = fixture(); service.updateInput("啤酒鸭", "清淡");
  expect(service.snapshot().dish).toBe("啤酒鸭"); expect(port.search).not.toHaveBeenCalled(); expect(port.extract).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled(); expect(await store.list()).toEqual([]);
});
it("one explicit search and one chosen extraction feed existing Review without another AI call", async () => {
  const { service, port, ai, fake, store } = fixture(); service.updateInput("啤酒鸭", "清淡"); await service.search();
  expect(service.snapshot().phase).toBe("results"); expect(port.search).toHaveBeenCalledTimes(1); expect(port.extract).not.toHaveBeenCalled();
  await service.extract("candidate-1"); expect(service.snapshot().phase).toBe("preview"); expect(ai.snapshot().draft?.recipe.title).toBe("啤酒鸭"); expect(fake.bridge.organize).not.toHaveBeenCalled(); expect(await store.list()).toEqual([]);
  await expect(service.save(ai.snapshot().draft!.recipe)).rejects.toMatchObject({ code: "review_required" });
  ai.setConfirmed(true); const saved = await service.save(ai.snapshot().draft!.recipe); expect((await store.list()).map(r => r.id)).toEqual([saved.id]);
  expect(service.snapshot()).toMatchObject({ dish: "", preference: "", candidates: [], selected: null, phase: "saved" });
  expect(JSON.stringify(saved)).not.toMatch(/sourceUrl|example.com|candidate-1|清淡/);
});
it("supports one three and zero candidates without forcing invented results", async () => {
  const { service, port, candidate } = fixture(); service.updateInput("鸭", "");
  for (const count of [1, 3, 0]) { port.search.mockResolvedValueOnce({ candidates: Array.from({ length: count }, (_, i) => ({ ...candidate, id: `c${i}`, sourceUrl: `https://example.com/r${i}` })) }); await service.search(); expect(service.snapshot().candidates).toHaveLength(count); }
});
it("untrusted or duplicate native candidate data cannot enter results", async () => {
  const { service, port, candidate } = fixture(); service.updateInput("鸭", ""); port.search.mockResolvedValueOnce({ candidates: [{ ...candidate, sourceHost: "other.example" }] });
  await expect(service.search()).rejects.toMatchObject({ code: "invalid_output" }); expect(service.snapshot().candidates).toEqual([]);
});
it("selected extraction uses only frozen candidate id and rejects foreign selection", async () => {
  const { service, port } = fixture(); service.updateInput("鸭", ""); await service.search();
  await expect(service.extract("foreign")).rejects.toMatchObject({ code: "stale_session" }); expect(port.extract).not.toHaveBeenCalled();
  await service.extract("candidate-1"); expect(port.extract.mock.calls[0][0]).toMatchObject({ candidateId: "candidate-1" }); expect(port.extract.mock.calls[0][0]).not.toHaveProperty("sourceUrl");
});
it("failed extraction remains in results and cannot create an unverified Preview", async () => {
  const { service, port, ai } = fixture(); service.updateInput("鸭", ""); await service.search(); port.extract.mockRejectedValueOnce({ code: "source_mismatch", message: "token" });
  await expect(service.extract("candidate-1")).rejects.toMatchObject({ code: "source_mismatch" }); expect(service.snapshot().phase).toBe("results"); expect(ai.snapshot().draft).toBeNull();
});
it("cancel search ignores a late result and never auto retries", async () => {
  const { service, port, candidate } = fixture(), reply = deferred<{ candidates: typeof candidate[] }>(); service.updateInput("鸭", ""); port.search.mockReturnValueOnce(reply.promise);
  const request = service.search().catch(e => e); await vi.waitFor(() => expect(port.search).toHaveBeenCalledTimes(1)); await service.cancelRequest(); reply.resolve({ candidates: [candidate] }); expect(await request).toMatchObject({ code: "stale_session" }); expect(service.snapshot()).toMatchObject({ phase: "input", candidates: [], dish: "鸭" }); expect(port.search).toHaveBeenCalledTimes(1);
});
it("cancel extraction keeps candidates and invalidates late Preview handoff", async () => {
  const { service, port, ai } = fixture(), reply = deferred<{ rawJson: string; sourceText: string }>(); service.updateInput("鸭", ""); await service.search(); port.extract.mockReturnValueOnce(reply.promise);
  const request = service.extract("candidate-1").catch(e => e); await vi.waitFor(() => expect(port.extract).toHaveBeenCalledTimes(1)); await service.cancelRequest(); reply.resolve({ rawJson: output(), sourceText: "鸭" }); expect(await request).toMatchObject({ code: "stale_session" }); expect(service.snapshot().phase).toBe("results"); expect(ai.snapshot().draft).toBeNull();
});
it("backup preview blocks new calls; restore invalidates an in-flight search", async () => {
  let state: BackupState = { phase: "idle" }; const listeners = new Set<() => void>();
  const backup = { getState: () => state, subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); }, export: vi.fn(), inspectRestore: vi.fn(), confirmReplace: vi.fn(), cancel: vi.fn() } satisfies BackupController;
  const { service, port, candidate } = fixture(backup), reply = deferred<{ candidates: typeof candidate[] }>(); service.updateInput("鸭", "");
  state = { phase: "preview" } as BackupState; listeners.forEach(fn => fn()); await expect(service.search()).rejects.toMatchObject({ code: "busy" }); expect(port.search).not.toHaveBeenCalled();
  state = { phase: "idle" }; listeners.forEach(fn => fn()); port.search.mockReturnValueOnce(reply.promise); const request = service.search().catch(e => e); await vi.waitFor(() => expect(port.search).toHaveBeenCalledTimes(1));
  state = { phase: "restoring" }; listeners.forEach(fn => fn()); reply.resolve({ candidates: [candidate] }); expect(await request).toMatchObject({ code: "stale_session" }); expect(service.snapshot()).toMatchObject({ dish: "", candidates: [], phase: "input" });
});
it("does not overwrite another unfinished AI input on extraction", async () => {
  const { service, port, ai } = fixture(); service.updateInput("鸭", ""); await service.search();
  ai.updateInput({ text: "还没写完的菜谱", imageIds: [] });
  await expect(service.extract("candidate-1")).rejects.toMatchObject({ code: "busy" });
  expect(port.extract).not.toHaveBeenCalled(); expect(ai.snapshot().input.text).toBe("还没写完的菜谱");
});
it("decoded escaped source URLs cannot be smuggled into ordinary Recipe notes", async () => {
  const { service, port, ai } = fixture(); service.updateInput("鸭", ""); await service.search();
  const draft = JSON.parse(output()); draft.recipe.notes = "https://example.com/duck";
  port.extract.mockResolvedValueOnce({ rawJson: JSON.stringify(draft).replaceAll("/", "\\u002f"), sourceText: "鸭" });
  await expect(service.extract("candidate-1")).rejects.toMatchObject({ code: "invalid_output" }); expect(ai.snapshot().draft).toBeNull();
});
it("uncertain save reconciles the original UUID without a second recipe or Provider request", async () => {
  const { service, ai, store, port } = fixture(); service.updateInput("鸭", "不辣"); await service.search(); await service.extract("candidate-1"); ai.setConfirmed(true);
  const original = store.createDetails.bind(store), create = vi.spyOn(store, "createDetails").mockImplementationOnce(async (...args) => { await original(...args); throw new Error("lost acknowledgement"); });
  vi.spyOn(store, "getDetails").mockRejectedValueOnce(new Error("disk read"));
  await expect(service.save(ai.snapshot().draft!.recipe)).rejects.toMatchObject({ code: "save_uncertain" }); expect(service.snapshot().phase).toBe("uncertain");
  await expect(service.search()).rejects.toMatchObject({ code: "save_uncertain" });
  expect(await service.recoverSave()).not.toBeNull(); expect(await store.list()).toHaveLength(1); expect(create).toHaveBeenCalledTimes(1);
  expect(port.search).toHaveBeenCalledTimes(1); expect(port.extract).toHaveBeenCalledTimes(1); expect(service.snapshot().candidates).toEqual([]);
});
it("Preview return serializes cleanup so repeated Back cannot overwrite a later extraction", async () => {
  const { service, ai, fake, port } = fixture(); service.updateInput("鸭", ""); await service.search(); await service.extract("candidate-1");
  const cleanup = deferred<void>(); fake.bridge.discardSession.mockReturnValueOnce(cleanup.promise);
  const returning = service.returnToResults();
  await expect(service.returnToResults()).rejects.toMatchObject({ code: "busy" });
  await expect(service.extract("candidate-1")).rejects.toMatchObject({ code: "busy" });
  cleanup.resolve(); await returning; expect(service.snapshot().phase).toBe("results");
  await service.extract("candidate-1"); expect(service.snapshot().phase).toBe("preview"); expect(ai.snapshot().draft).not.toBeNull(); expect(port.extract).toHaveBeenCalledTimes(2);
});
