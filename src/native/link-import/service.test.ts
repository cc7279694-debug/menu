// @vitest-environment node
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { AiIntakeService } from "../ai/service";
import { deferred, fakeAi, output } from "../ai/service.test-support";
import type { FetchedPage } from "./contract";
import { LinkImportService } from "./service";
import { PreviewBackupRepository } from "../backup/preview-repository";
import { collectImageReferences, toPortableData } from "../backup/references";
import type { BackupController } from "../backup/backup-controls";
import type { BackupState } from "../backup/service";
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8");
const fetched = (name = "standard-recipe"): FetchedPage => ({ html: fixture(name), finalUrl: "https://recipes.example/dish", contentType: "text/html" });
const setup = () => {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const port = { read: vi.fn(async () => fetched()), cancel: vi.fn(async () => {}) };
  const service = new LinkImportService({ store, port, ai }); return { store, fake, ai, port, service };
};
afterEach(__resetLocalDatabaseForTests);
it.each(["absent", "mismatched", "resolved"])("BLOCKING-01: excludes unrelated XHS JSON-LD with %s target state", async status => {
  const { service, port, fake, store } = setup();
  const unrelated = { "@type": "Recipe", name: "推荐红烧肉", url: "https://www.xiaohongshu.com/explore/other", recipeIngredient: ["五花肉500克"], recipeInstructions: ["焯水后炖熟。"] };
  const id = status === "resolved" ? "target" : "other";
  const data = { note: { noteDetailMap: { [id]: { note: { noteId: id, title: status === "resolved" ? "合成目标汤" : "推荐红烧肉", desc: status === "resolved" ? "青菜200克，洗净后煮熟。" : "五花肉500克，焯水后炖熟。" } } } } };
  const state = status === "absent" ? "" : `<script>window.__INITIAL_STATE__=${JSON.stringify(data)}</script>`;
  const url = "https://www.xiaohongshu.com/explore/target?xsec_token=synthetic";
  port.read.mockResolvedValue({ html: `<title>合成目标汤</title>${state}<script type="application/ld+json">${JSON.stringify(unrelated)}</script><main>推荐红烧肉：五花肉500克。打开App查看更多。</main>`, finalUrl: url, contentType: "text/html" });
  await service.read(url);
  expect(service.snapshot().parsed).toMatchObject({ candidates: [], needsSelection: false });
  expect(service.selected()).toBeNull();
  expect(service.snapshot().visible).toMatchObject({ title: "合成目标汤", text: status === "resolved" ? "青菜200克，洗净后煮熟。" : "" });
  expect(service.readQuality()).toBe(status === "resolved" ? "partial" : "title_only");
  await expect(service.saveParser({ ...emptyDetails("推荐红烧肉"), ingredients: [{ name: "五花肉", amount: "500克" }], steps: [{ instruction: "炖熟。", imagePath: null }] })).rejects.toMatchObject({ code: "stale_session" });
  expect(await store.list()).toEqual([]);
  expect(fake.bridge.organize).not.toHaveBeenCalled();
  if (status !== "resolved") await expect(service.useAi()).rejects.toMatchObject({ code: "page_unreadable" });
  else {
    await service.useAi();
    const request = vi.mocked(service.dependencies.ai.bridge.organize).mock.calls[0][0];
    expect(request.text).toContain("青菜200克");
    expect(request.text).not.toMatch(/推荐红烧肉|五花肉|打开App/u);
  }
});
it.each([["登录后查看笔记", "login_required"], ["安全验证", "challenge_required"]])("BLOCKING-01: unrelated complete JSON-LD cannot hide XHS %s", async (title, code) => {
  const { service, port, fake, store } = setup();
  const unrelated = { "@type": "Recipe", name: "推荐菜", recipeIngredient: ["盐适量"], recipeInstructions: ["煮熟。"] };
  port.read.mockResolvedValue({ html: `<title>${title}</title><script type="application/ld+json">${JSON.stringify(unrelated)}</script><main>推荐菜</main>`, finalUrl: "https://www.xiaohongshu.com/explore/target", contentType: "text/html" });
  await expect(service.read("https://www.xiaohongshu.com/explore/target")).rejects.toMatchObject({ code });
  expect(service.snapshot().parsed).toBeNull(); expect(await store.list()).toEqual([]);
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("keeps title-only pages distinct and requires actual recipe text before AI", async () => {
  const { service, port, fake } = setup();
  port.read.mockResolvedValue({ ...fetched(), html: "<title>合成青菜汤</title>" });
  await service.read("https://recipes.example/dish");
  expect(service.readQuality()).toBe("title_only");
  await expect(service.useAi()).rejects.toMatchObject({ code: "page_unreadable" });
  expect(fake.bridge.organize).not.toHaveBeenCalled();
  service.addText("青菜200克，水500毫升。1. 洗净青菜。2. 煮熟。https://private.example/token");
  expect(service.readQuality()).toBe("partial");
  expect(fake.bridge.organize).not.toHaveBeenCalled();
  await service.useAi();
  const request = vi.mocked(service.dependencies.ai.bridge.organize).mock.calls[0][0];
  expect(request.text).toContain("用户补充文字");
  expect(request.text).toContain("洗净青菜");
  expect(request.text).not.toContain("private.example");
  expect(fake.bridge.organize).toHaveBeenCalledOnce();
  await service.discard();
  expect(service.snapshot().visible).toBeNull();
});
it.each([
  ["<title>登录后查看</title><main>请先登录后继续访问</main>", "login_required"],
  ["<title>安全验证</title><main>请完成验证码</main>", "challenge_required"],
])("distinguishes a restricted HTML page from readable recipe text", async (html, code) => {
  const { service, port, fake } = setup(); port.read.mockResolvedValue({ ...fetched(), html });
  await expect(service.read("https://recipes.example/dish")).rejects.toMatchObject({ code });
  expect(service.snapshot().parsed).toBeNull(); expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("does not treat a normal login button or recipe prose as an access restriction", async () => {
  const { service, port } = setup();
  port.read.mockResolvedValue({ ...fetched(), html: "<title>测试清汤</title><nav>登录</nav><main><h1>测试清汤</h1><p>青菜200克煮熟；登录只是页眉按钮。</p></main>" });
  await service.read("https://recipes.example/dish"); expect(service.readQuality()).toBe("partial");
});
it("does not treat partial recipe metadata as readable access through a login wall", async () => {
  const { service, port, fake } = setup();
  const metadata = { "@type": "Recipe", name: "合成汤", recipeIngredient: ["青菜200克"] };
  port.read.mockResolvedValue({ ...fetched(), html: `<title>登录后查看</title><script type="application/ld+json">${JSON.stringify(metadata)}</script><main>请先登录后查看完整内容</main>` });
  await expect(service.read("https://recipes.example/dish")).rejects.toMatchObject({ code: "login_required" });
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("reports an ingredient-only recipe as partial and preserves missing steps and time", async () => {
  const { service, port } = setup(); port.read.mockResolvedValue(fetched("partial-recipe"));
  await service.read("https://recipes.example/dish");
  expect(service.readQuality()).toBe("partial"); expect(service.selected()?.recipe.steps).toEqual([]);
  expect(service.selected()?.recipe.totalMinutes).toBeNull();
});
it("rejects oversized supplementary input without changing the current source", async () => {
  const { service } = setup(); await service.read("https://recipes.example/dish");
  const source = service.snapshot().visible;
  expect(() => service.addText("菜".repeat(8001))).toThrow();
  expect(service.snapshot().visible).toBe(source);
});
it("parser complete enters Preview without key access, AI, network images or database writes", async () => {
  const { service, store, fake } = setup(); const create = vi.spyOn(store, "createDetails");
  service.setUrl("https://recipes.example/dish"); await service.read();
  expect(service.snapshot()).toMatchObject({ phase: "ready", selectedId: "candidate-0" });
  expect(service.selected()?.recipe.title).toBe("测试可乐鸡翅"); expect(fake.keys.hasAiKey).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
});
it.each(["partial-recipe", "no-jsonld-readable"])("%s never automatically falls back to AI", async name => {
  const { service, port, fake } = setup(); port.read.mockResolvedValue(fetched(name)); await service.read("https://recipes.example/dish");
  expect(service.snapshot().phase).toBe("ready"); expect(fake.bridge.organize).not.toHaveBeenCalled();
  await service.useAi(); expect(fake.bridge.organize).toHaveBeenCalledTimes(1);
  const request = vi.mocked(service.dependencies.ai.bridge.organize).mock.calls[0][0]; expect(request.imageIds).toEqual([]); expect(request.text).not.toMatch(/https?:|<script|Authorization/iu);
  expect(service.snapshot().phase).toBe("ai-preview"); expect(await service.dependencies.store.list()).toEqual([]);
});
it("missing key retains source through settings and sends no request", async () => {
  const { service, fake } = setup(); await service.read("https://recipes.example/dish"); fake.keys.hasAiKey.mockResolvedValue({ configured: false });
  await expect(service.useAi()).rejects.toMatchObject({ code: "ai_key_missing" }); expect(service.snapshot().visible?.text).toContain("鸡翅"); expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("cancellation invalidates late fetch and duplicate read is rejected", async () => {
  const { service, port } = setup(), late = deferred<FetchedPage>(); port.read.mockReturnValueOnce(late.promise);
  const flight = service.read("https://recipes.example/dish").catch(error => error);
  await expect(service.read("https://recipes.example/other")).rejects.toMatchObject({ code: "busy" });
  await service.cancelRead(); late.resolve(fetched()); expect(await flight).toMatchObject({ code: "stale_session" }); expect(service.snapshot().parsed).toBeNull(); expect(port.cancel).toHaveBeenCalledTimes(1);
});
it("multiple comparable candidates require explicit selection", async () => {
  const { service, port } = setup(); port.read.mockResolvedValue(fetched("multiple-recipes")); await service.read("https://recipes.example/dish");
  expect(service.selected()).toBeNull(); service.select("candidate-1"); expect(service.selected()?.recipe.title).toBe("绿豆汤");
});
it("parser save is idempotent, source-free, and drops all source after success", async () => {
  const { service, store } = setup(); await service.read("https://recipes.example/dish"); const input = service.selected()!.recipe;
  const [a, b] = await Promise.all([service.saveParser(input), service.saveParser(input)]); expect(a.id).toBe(b.id); expect(await store.list()).toHaveLength(1);
  expect(JSON.stringify(a)).not.toMatch(/recipes.example|images.example|script|candidate-/iu);
  expect(service.snapshot()).toMatchObject({ phase: "saved", url: "", parsed: null, visible: null });
});
it("commit acknowledgement failure recovers same UUID rather than duplicates", async () => {
  const { service, store } = setup(); const create = store.createDetails.bind(store);
  vi.spyOn(store, "createDetails").mockImplementationOnce(async (...args) => { await create(...args); throw new Error("lost acknowledgement"); });
  await service.read("https://recipes.example/dish"); const saved = await service.saveParser(service.selected()!.recipe); expect((await store.list())[0].id).toBe(saved.id); expect(await store.list()).toHaveLength(1);
});
it("unknown save result blocks retries until UUID readback", async () => {
  const { service, store } = setup(); await service.read("https://recipes.example/dish"); const input = service.selected()!.recipe;
  vi.spyOn(store, "createDetails").mockRejectedValueOnce(new Error("write")); vi.spyOn(store, "getDetails").mockRejectedValueOnce(new Error("read"));
  await expect(service.saveParser(input)).rejects.toMatchObject({ code: "save_uncertain" }); await expect(service.saveParser(input)).rejects.toMatchObject({ code: "save_uncertain" });
  expect(await service.recoverSave()).toBeNull(); expect(service.snapshot().phase).toBe("ready");
});
it("AI inferred/missing gate is still enforced by service; save creates only ordinary recipe", async () => {
  const { service, fake, ai, store } = setup(); fake.bridge.organize.mockResolvedValue({ rawJson: output("测试新菜") });
  await service.read("https://recipes.example/dish"); await service.useAi(); const draft = ai.snapshot().draft!;
  await expect(service.saveAi(draft.recipe)).rejects.toMatchObject({ code: "review_required" }); ai.setConfirmed(true);
  const saved = await service.saveAi(draft.recipe); expect(saved.title).toBe("测试新菜"); expect(await store.list()).toHaveLength(1); expect(ai.snapshot().input.text).toBe(""); expect(service.snapshot().visible).toBeNull();
});
it("busy AI Back/cancel cannot submit a second provider request", async () => {
  const { service, fake } = setup(), late = deferred<{ rawJson: string }>(); fake.bridge.organize.mockReturnValueOnce(late.promise);
  await service.read("https://recipes.example/dish"); const flight = service.useAi().catch(error => error); await vi.waitFor(() => expect(fake.bridge.organize).toHaveBeenCalledTimes(1));
  await expect(service.useAi()).rejects.toMatchObject({ code: "busy" }); await service.discard(); late.resolve({ rawJson: output() }); expect(await flight).toMatchObject({ code: "stale_session" }); expect(service.snapshot().visible).toBeNull();
});
it("source HTML, URL, script metadata and remote media do not enter backup or history", async () => {
  const { service, store } = setup(); await service.read("https://recipes.example/dish"); const saved = await service.saveParser(service.selected()!.recipe);
  await store.saveDetails(saved.id, { ...saved, title: "自己的可乐鸡翅" });
  const source = await new PreviewBackupRepository().snapshot(), portable = toPortableData(source, []);
  expect(source.sourceSchemaVersion).toBe(4); expect(collectImageReferences(source)).toEqual([]);
  expect(JSON.stringify(portable)).not.toMatch(/https?:|script|recipes.example|images.example|candidate-|finalUrl|wasTruncated/iu);
  expect(source.changes).toHaveLength(1); expect(source.recipes).toHaveLength(1);
});
it("restoring backup invalidates late page results and prevents new reads", async () => {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(); let state: BackupState = { phase: "idle" }; const listeners = new Set<() => void>();
  const backup = { getState: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, export: vi.fn(), inspectRestore: vi.fn(), confirmReplace: vi.fn(), cancel: vi.fn() } satisfies BackupController;
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store, backup }), late = deferred<FetchedPage>();
  const port = { read: vi.fn(() => late.promise), cancel: vi.fn(async () => {}) }; const service = new LinkImportService({ store, port, ai, backup });
  const reading = service.read("https://recipes.example/dish").catch(error => error); state = { phase: "restoring" }; listeners.forEach(fn => fn());
  late.resolve(fetched()); expect(await reading).toMatchObject({ code: "stale_session" }); expect(service.snapshot().parsed).toBeNull();
  await expect(service.read("https://recipes.example/dish")).rejects.toMatchObject({ code: "busy" }); expect(await store.list()).toEqual([]);
});
it("an in-flight parser save cannot be discarded and duplicated", async () => {
  const { service, store } = setup(); await service.read("https://recipes.example/dish"); const input = service.selected()!.recipe;
  const original = store.createDetails.bind(store), gate = deferred<void>();
  vi.spyOn(store, "createDetails").mockImplementationOnce(async (...args) => { await gate.promise; return original(...args); });
  const saving = service.saveParser(input).catch(error => error);
  // A view cannot drop an uncertain in-flight write and start another one.
  await expect(service.discard()).rejects.toMatchObject({ code: "save_uncertain" }); gate.resolve(); expect((await saving).title).toBe(input.title); expect(await store.list()).toHaveLength(1);
});
it("manual completion after failed AI releases source held by the reused AI service", async () => {
  const { service, fake, ai } = setup(); await service.read("https://recipes.example/dish"); fake.bridge.organize.mockRejectedValueOnce({ code: "network_unavailable" });
  await expect(service.useAi()).rejects.toMatchObject({ code: "network_unavailable" }); expect(ai.snapshot().input.text).not.toBe("");
  await service.saveParser(service.selected()!.recipe); expect(ai.snapshot().input.text).toBe(""); expect(ai.snapshot().operationId).toBeNull();
});
it("failed native page cancellation still releases a previously owned AI source", async () => {
  const { service, fake, ai, port } = setup(); await service.read("https://recipes.example/dish"); fake.bridge.organize.mockRejectedValueOnce({ code: "network_unavailable" });
  await expect(service.useAi()).rejects.toMatchObject({ code: "network_unavailable" }); const late = deferred<FetchedPage>(); port.read.mockReturnValueOnce(late.promise); port.cancel.mockRejectedValueOnce(new Error("native cancel"));
  const reading = service.read().catch(error => error); await service.discard().catch(() => {});
  expect(ai.snapshot().input.text).toBe(""); expect(ai.snapshot().operationId).toBeNull(); late.resolve(fetched()); await reading;
});
it("AI save acknowledgement cannot resurrect a pre-restore recipe", async () => {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(); let state: BackupState = { phase: "idle" }; const listeners = new Set<() => void>();
  const backup = { getState: () => state, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, export: vi.fn(), inspectRestore: vi.fn(), confirmReplace: vi.fn(), cancel: vi.fn() } satisfies BackupController;
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store, backup }), service = new LinkImportService({ store, ai, backup, port: { read: async () => fetched(), cancel: async () => {} } });
  await service.read("https://recipes.example/dish"); await service.useAi(); const details = ai.snapshot().draft!.recipe, gate = deferred<Awaited<ReturnType<typeof ai.save>>>();
  vi.spyOn(ai, "save").mockReturnValue(gate.promise); const saving = service.saveAi(details).catch(error => error);
  gate.resolve({ ...details, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  state = { phase: "restoring" }; listeners.forEach(fn => fn());
  expect(await saving).toMatchObject({ code: "stale_session" }); expect(service.snapshot().phase).toBe("input");
});
