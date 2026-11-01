import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
it("labels title-only pages honestly and offers local text supplementation before explicit AI", async () => {
  const { fake, store } = setup("<title>合成青菜汤</title>"); await read();
  await screen.findByRole("heading", { name: "仅获取到标题" });
  expect(screen.getByRole("button", { name: "使用 AI 继续整理" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("补充菜谱文字"), { target: { value: "青菜200克。洗净后煮熟。" } });
  fireEvent.click(screen.getByRole("button", { name: "加入补充文字" }));
  expect(screen.getByRole("button", { name: "使用 AI 继续整理" })).toBeEnabled();
  expect(fake.bridge.organize).not.toHaveBeenCalled(); expect(await store.list()).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "使用 AI 继续整理" }));
  await screen.findByRole("heading", { name: "整理结果仍不完整" });
  expect(screen.getByText(/整理结果没有制作步骤/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeDisabled();
  expect(fake.bridge.organize).toHaveBeenCalledOnce(); expect(await store.list()).toHaveLength(0);
});
it("explains missing steps in a video note without inventing recipe details or invoking AI", async () => {
  const state = { note: { noteDetailMap: { testnote: { note: { noteId: "testnote", title: "合成汤", desc: "食材：青菜200克。步骤见视频。", type: "video" } } } } };
  const { fake, port } = setup();
  port.read.mockResolvedValue({ html: `<script>window.__INITIAL_STATE__=${JSON.stringify(state)}</script>`, finalUrl: "https://www.xiaohongshu.com/explore/testnote", contentType: "text/html" });
  await read(); await screen.findByRole("heading", { name: "网页信息不完整" });
  expect(screen.getByText(/不会读取视频画面或口播/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "改用文字 \/ 截图" })).toBeEnabled();
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("does not present a login interstitial as a recipe result", async () => {
  const { port, fake } = setup();
  port.read.mockResolvedValue({ html: "<title>小红书</title><script>window.__INITIAL_STATE__={}</script>", finalUrl: "https://www.xiaohongshu.com/login", contentType: "text/html" });
  await read(); expect(await screen.findByRole("alert")).toHaveTextContent("目标页面要求登录");
  expect(screen.queryByRole("region", { name: "网页读取结果" })).not.toBeInTheDocument();
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});
async function read() { fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://recipes.example/dish" } }); fireEvent.click(screen.getByRole("button", { name: "读取网页" })); }
it("complete parser opens editable source-free Preview and saves without AI checkbox", async () => {
  const { fake, onSaved, store } = setup(); await read(); await screen.findByRole("heading", { name: "检查网页菜谱" });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(); expect(screen.queryByText("封面照片")).not.toBeInTheDocument(); expect(fake.bridge.organize).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "自己的网页菜" } }); fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce()); expect((await store.list())[0].title).toBe("自己的网页菜");
});
it("partial page offers direct editing and explicit AI, with no automatic request", async () => {
  const { fake, onSaved } = setup(html.replace(',"recipeInstructions":["煮熟"]', "")); await read();
  await screen.findByRole("button", { name: "直接完善菜谱" }); expect(fake.bridge.organize).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "使用 AI 继续整理" })); await screen.findByRole("heading", { name: /检查.*整理结果/ }); expect(fake.bridge.organize).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeDisabled(); fireEvent.submit(document.querySelector("form")!); expect(onSaved).not.toHaveBeenCalled(); expect(screen.getByRole("region", { name: "AI 整理审核" })).toHaveFocus();
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
  await waitFor(() => expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" })); fireEvent.click(await screen.findByRole("button", { name: "仍然新建菜谱" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce()); expect(await store.list()).toHaveLength(2);
});
it("absent UUID recovery preserves the user's attempted edits rather than original page values", async () => {
  const { store } = setup(); await read(); await screen.findByRole("heading", { name: "检查网页菜谱" });
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "认真修改过的菜" } });
  // This case isolates ambiguous-write recovery, not IndexedDB title-query timing.
  vi.spyOn(store, "hasExactTitle").mockResolvedValue(false);
  vi.spyOn(store, "createDetails").mockRejectedValueOnce(new Error("write")); vi.spyOn(store, "getDetails").mockRejectedValueOnce(new Error("read"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" })); });
  fireEvent.click(await screen.findByRole("button", { name: "核对保存结果" }));
  expect(await screen.findByLabelText("菜名")).toHaveValue("认真修改过的菜");
});
it("Back during fetch asks once, does not duplicate requests, and abandon cancels native work", async () => {
  const { port, onCancel } = setup(), response = deferred<Awaited<ReturnType<typeof port.read>>>(); port.read.mockReturnValue(response.promise); await read();
  fireEvent(window, new Event("recipio:back", { cancelable: true })); fireEvent(window, new Event("recipio:back", { cancelable: true }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1); expect(port.read).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "放弃网页导入" })); await waitFor(() => expect(onCancel).toHaveBeenCalledOnce()); expect(port.cancel).toHaveBeenCalledOnce(); response.resolve({ html, finalUrl: "https://recipes.example/dish", contentType: "text/html" });
});
