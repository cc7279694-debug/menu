import "fake-indexeddb/auto";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";
import { AiIntakeService } from "../ai/service";
import { fakeAi, deferred } from "../ai/service.test-support";
import { LinkImportService } from "../link-import/service";
import { ShareTargetController } from "./controller";
import type { ShareReply } from "./contract";
import type { BackupController } from "../backup/backup-controls";
import type { BackupState } from "../backup/service";

afterEach(__resetLocalDatabaseForTests);
beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
const url = "https://generated.example/recipe?portion=2&token=generated#step";
function setup(backup?: BackupController) {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store, backup });
  const web = { read: vi.fn(), cancel: vi.fn() }, link = new LinkImportService({ store, ai, backup, port: web });
  let notify = () => {}; const queue: ShareReply[] = [];
  const share = new ShareTargetController({ consume: async () => queue.shift() ?? { status: "empty" }, listen: async fn => { notify = fn; return () => {}; } });
  const emit = async (reply: ShareReply = { status: "url", id: crypto.randomUUID(), url, replaced: false }) => { await act(async () => { queue.push(reply); notify(); }); };
  return { store, ai, fake, web, link, share, emit, backup };
}
async function menu(name: string) { fireEvent.click(screen.getByRole("button", { name: "新增菜谱" })); fireEvent.click(await screen.findByRole("button", { name })); }
function nativeBack() { fireEvent(window, new Event("recipio:back", { cancelable: true })); }

it("cold-like late receipt opens idle Link Input exactly once without Read, AI or Save", async () => {
  const f = setup(), view = render(<LibraryApp {...f} />); await screen.findByText("自己的做法，随时翻开");
  const shared = { status: "url" as const, id: crypto.randomUUID(), url, replaced: false }; await f.emit(shared);
  expect(await screen.findByLabelText("网页链接")).toHaveValue(url);
  expect(f.web.read).not.toHaveBeenCalled(); expect(f.fake.bridge.organize).not.toHaveBeenCalled(); expect(await f.store.list()).toEqual([]);
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://generated.example/edited" } }); await f.emit(shared);
  expect(screen.getByLabelText("网页链接")).toHaveValue("https://generated.example/edited");
  view.unmount(); render(<LibraryApp {...f} />); await screen.findByText("自己的做法，随时翻开"); expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument();
});
it("new recipe draft is protected; returning home requires explicit Open and shows hostname only", async () => {
  const f = setup(); render(<LibraryApp {...f} />); await menu("手动录入");
  fireEvent.change(await screen.findByLabelText("菜名"), { target: { value: "未保存草稿" } }); await f.emit();
  expect(screen.getByLabelText("菜名")).toHaveValue("未保存草稿"); expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "打开分享的链接" })).toBeDisabled();
  expect(screen.getByLabelText("待处理分享").textContent).toContain("generated.example"); expect(screen.getByLabelText("待处理分享").textContent).not.toContain("token=");
  vi.spyOn(window, "confirm").mockReturnValue(true); fireEvent.click(screen.getByRole("button", { name: "取消" }));
  await screen.findByRole("button", { name: "新增菜谱" }); expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "打开分享的链接" })); expect(await screen.findByLabelText("网页链接")).toHaveValue(url);
});
it("dirty editing and Focus remain mounted while new pending shares visibly replace only the inbox", async () => {
  const f = setup(); await f.store.createDetails({ ...emptyDetails("测试菜"), steps: [{ instruction: "洗净", imagePath: null }] }); render(<LibraryApp {...f} />);
  fireEvent.click(await screen.findByRole("button", { name: "打开 测试菜" })); fireEvent.click(await screen.findByRole("button", { name: "编辑菜谱" }));
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "未保存改动" } }); await f.emit(); await f.emit({ status: "url", id: crypto.randomUUID(), url: "https://new.example/r", replaced: false });
  expect(screen.getByLabelText("菜名")).toHaveValue("未保存改动"); expect(screen.getByText(/较早的待处理分享已被新分享替换/)).toBeInTheDocument();
  expect((await f.store.list())[0].title).toBe("测试菜"); vi.spyOn(window, "confirm").mockReturnValue(true); fireEvent.click(screen.getByRole("button", { name: "取消" }));
  fireEvent.click(await screen.findByRole("button", { name: "放大步骤 1" })); await f.emit(); expect(screen.getByRole("dialog", { name: "单步查看" })).toBeInTheDocument();
  expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument(); nativeBack(); await screen.findByRole("button", { name: "编辑菜谱" });
  expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "打开分享的链接" })).not.toBeDisabled());
});
it("an add dialog cannot be displaced by share", async () => {
  const f = setup(); render(<LibraryApp {...f} />); fireEvent.click(screen.getByRole("button", { name: "新增菜谱" })); await f.emit();
  expect(screen.getByRole("dialog", { name: "添加菜谱" })).toBeInTheDocument(); expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument();
});
it("an existing link and its read request are never cancelled or replaced by share", async () => {
  const f = setup(); render(<LibraryApp {...f} />); await menu("从网页链接导入"); await screen.findByLabelText("网页链接");
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://old.example/r" } }); const response = deferred<unknown>(); f.web.read.mockReturnValue(response.promise);
  fireEvent.click(screen.getByRole("button", { name: "读取网页" })); await screen.findByText("正在安全读取网页…"); await f.emit();
  expect(screen.getByLabelText("网页链接")).toHaveValue("https://old.example/r"); expect(f.web.read).toHaveBeenCalledOnce(); expect(f.web.cancel).not.toHaveBeenCalled();
  await act(async () => { response.reject(new Error("generated failure")); }); expect(screen.getByLabelText("网页链接")).toHaveValue("https://old.example/r");
});
it("empty idle link input may be prefilled without triggering network", async () => {
  const f = setup(); render(<LibraryApp {...f} />); await menu("从网页链接导入"); await screen.findByLabelText("网页链接"); await f.emit();
  expect(screen.getByLabelText("网页链接")).toHaveValue(url); expect(f.web.read).not.toHaveBeenCalled();
});
it("clearing an occupied idle URL enables explicit pending Open without automatic replacement", async () => {
  const f = setup(); render(<LibraryApp {...f} />); await menu("从网页链接导入"); await screen.findByLabelText("网页链接");
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://old.example/r" } }); await f.emit();
  expect(screen.getByRole("button", { name: "打开分享的链接" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "打开分享的链接" })).not.toBeDisabled());
  expect(screen.getByLabelText("网页链接")).toHaveValue(""); fireEvent.click(screen.getByRole("button", { name: "打开分享的链接" }));
  expect(screen.getByLabelText("网页链接")).toHaveValue(url); expect(f.web.read).not.toHaveBeenCalled();
});
it("AI request and its Preview edits/gate survive share without a second request", async () => {
  const f = setup(); render(<LibraryApp {...f} />); await menu("AI 整理"); fireEvent.change(await screen.findByLabelText("菜谱文字"), { target: { value: "测试输入" } });
  const response = deferred<{ rawJson: string }>(); f.fake.bridge.organize.mockReturnValue(response.promise);
  fireEvent.click(await screen.findByRole("button", { name: "开始 AI 整理" })); await waitFor(() => expect(f.fake.bridge.organize).toHaveBeenCalledOnce()); await f.emit();
  expect(f.ai.snapshot().input.text).toBe("测试输入"); expect(f.fake.bridge.cancel).not.toHaveBeenCalled();
  await act(async () => { response.resolve({ rawJson: JSON.stringify({ recipe: emptyDetails("AI 测试菜"), fieldChecks: [], warnings: [] }) }); }); await screen.findByRole("heading", { name: "检查 AI 整理结果" });
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "Preview 修改" } }); await f.emit(); expect(screen.getByLabelText("菜名")).toHaveValue("Preview 修改"); expect(f.ai.snapshot().confirmed).toBe(false);
  expect(f.fake.bridge.organize).toHaveBeenCalledOnce(); expect(f.fake.bridge.discardSession).not.toHaveBeenCalled(); expect(await f.store.list()).toEqual([]);
});
it.each(["preview", "restoring", "uncertain", "validating"] as const)("backup %s defers share without invoking cancel", async phase => {
  let state: BackupState = { phase }; const listeners = new Set<() => void>();
  const backup: BackupController = { getState: () => state, subscribe: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, export: vi.fn(), inspectRestore: vi.fn(), confirmReplace: vi.fn(), cancel: vi.fn() };
  const f = setup(backup); render(<LibraryApp {...f} />); await f.emit(); expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument(); expect(backup.cancel).not.toHaveBeenCalled();
  await act(async () => { state = { phase: "idle" }; listeners.forEach(fn => fn()); }); expect(screen.queryByLabelText("网页链接")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "打开分享的链接" })); expect(await screen.findByLabelText("网页链接")).toHaveValue(url);
});
it("invalid and multiple links stay out of AI and preserve a manual draft", async () => {
  const f = setup(); render(<LibraryApp {...f} />); await menu("手动录入"); fireEvent.change(await screen.findByLabelText("菜名"), { target: { value: "原草稿" } });
  await f.emit({ status: "invalid", id: crypto.randomUUID(), reason: "multiple_links", replaced: false }); expect(screen.getByText(/多个不同链接/)).toBeInTheDocument(); expect(screen.getByLabelText("菜名")).toHaveValue("原草稿");
  fireEvent.click(screen.getByRole("button", { name: "忽略这次分享" })); expect(screen.queryByLabelText("待处理分享")).not.toBeInTheDocument(); expect(f.fake.bridge.organize).not.toHaveBeenCalled();
});
