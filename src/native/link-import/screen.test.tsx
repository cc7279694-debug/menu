import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { deferred, fakeAi } from "../ai/service.test-support";
import { LinkImportService } from "./service";
import { LinkImportScreen } from "./screen";
const html = '<title>测试网页菜</title><script type="application/ld+json">{"@type":"Recipe","name":"测试网页菜","recipeIngredient":["牛肉200克"],"recipeInstructions":["煮熟"]}</script><main><h2>食材</h2><p>牛肉200克</p><h2>做法</h2><p>煮熟</p></main>';
const setup = (page = html) => {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const port = { read: vi.fn(async () => ({ html: page, finalUrl: "https://recipes.example/dish", contentType: "text/html" as const })), cancel: vi.fn(async () => {}) };
  const service = new LinkImportService({ store, port, ai }), onSaved = vi.fn(), onCancel = vi.fn(), onConfigureKey = vi.fn(), onFallback = vi.fn();
  render(<LinkImportScreen service={service} onSaved={onSaved} onCancel={onCancel} onConfigureKey={onConfigureKey} onFallback={onFallback} active />);
  return { service, store, fake, port, onSaved, onCancel, onConfigureKey, onFallback };
};
afterEach(__resetLocalDatabaseForTests);
async function read() { fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://recipes.example/dish" } }); fireEvent.click(screen.getByRole("button", { name: "读取网页" })); }
it("complete parser opens editable source-free Preview and saves without AI checkbox", async () => {
  const { fake, onSaved, store } = setup(); await read(); await screen.findByRole("heading", { name: "检查网页菜谱" });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(); expect(screen.queryByText("封面照片")).not.toBeInTheDocument(); expect(fake.bridge.organize).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "自己的网页菜" } }); fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce()); expect((await store.list())[0].title).toBe("自己的网页菜");
});
it("partial page offers direct editing and explicit AI, with no automatic request", async () => {
  const { fake } = setup(html.replace(',"recipeInstructions":["煮熟"]', "")); await read();
  await screen.findByRole("button", { name: "直接完善菜谱" }); expect(fake.bridge.organize).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "使用 AI 继续整理" })); await screen.findByRole("heading", { name: "检查 AI 整理结果" }); expect(fake.bridge.organize).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" })); expect(screen.getByRole("region", { name: "AI 整理审核" })).toHaveFocus();
});
it("missing key exposes settings return path and keeps partial data", async () => {
  const { fake, onConfigureKey, service } = setup('<main><h1>牛肉</h1><p>牛肉200克煮熟</p></main>'); fake.keys.hasAiKey.mockResolvedValue({ configured: false }); await read();
  fireEvent.click(await screen.findByRole("button", { name: "使用 AI 继续整理" })); fireEvent.click(await screen.findByRole("button", { name: "前往设置 AI 密钥" }));
  expect(onConfigureKey).toHaveBeenCalledOnce(); expect(service.snapshot().visible?.text).toContain("牛肉"); expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("same-name save prompts rather than overwrites the original recipe", async () => {
  const { store, onSaved } = setup(); await store.create("测试网页菜"); await read(); await screen.findByRole("heading", { name: "检查网页菜谱" });
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" })); await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  fireEvent.click(screen.getByRole("button", { name: "返回检查" })); expect(onSaved).not.toHaveBeenCalled(); expect(await store.list()).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" })); fireEvent.click(await screen.findByRole("button", { name: "仍然新建菜谱" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce()); expect(await store.list()).toHaveLength(2);
});
it("Back during fetch asks once, does not duplicate requests, and abandon cancels native work", async () => {
  const { port, onCancel } = setup(), response = deferred<Awaited<ReturnType<typeof port.read>>>(); port.read.mockReturnValue(response.promise); await read();
  fireEvent(window, new Event("recipio:back", { cancelable: true })); fireEvent(window, new Event("recipio:back", { cancelable: true }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1); expect(port.read).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "放弃网页导入" })); await waitFor(() => expect(onCancel).toHaveBeenCalledOnce()); expect(port.cancel).toHaveBeenCalledOnce(); response.resolve({ html, finalUrl: "https://recipes.example/dish", contentType: "text/html" });
});
