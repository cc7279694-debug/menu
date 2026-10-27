import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { LinkImportService } from "../link-import/service";
import { FindRecipeService } from "../find-recipe/service";
import { FinderError, type FinderPort } from "../find-recipe/contract";
import { ShareTargetController } from "../share-target/controller";
import type { SharePort, ShareReply } from "../share-target/contract";

beforeEach(() => { localStorage.clear(); localStorage.setItem("recipio.ui-v2.theme.v1", "pure-glass"); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(async () => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); await __resetLocalDatabaseForTests(); });
function app() {
  const store = new PreviewRecipeLibrary(), fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const read = vi.fn(async () => ({ finalUrl: "https://recipes.example/test", contentType: "text/html" as const, html: "<p>Generated text only</p>" }));
  const link = new LinkImportService({ store, ai, port: { read, cancel: vi.fn(async () => {}) } });
  const port = { createSession: vi.fn(async (): Promise<never> => { throw new FinderError("key_missing"); }), search: vi.fn(async (): Promise<never> => { throw new Error("Unexpected search"); }), extract: vi.fn(async (): Promise<never> => { throw new Error("Unexpected extract"); }), cancel: vi.fn(async () => {}), discardSession: vi.fn(async () => {}) } satisfies FinderPort;
  const finder = new FindRecipeService({ ai, port });
  const queue: ShareReply[] = []; let available = () => {};
  const sharePort = { consume: async () => queue.shift() ?? { status: "empty" as const }, listen: async (callback: () => void) => { available = callback; return () => {}; }, release: vi.fn(async () => {}), transferImages: async () => [] } satisfies SharePort;
  const share = new ShareTargetController(sharePort);
  return { fake, ai, read, port, element: <LibraryApp store={store} ai={ai} link={link} finder={finder} share={share} />, emit: async (value: ShareReply) => { await act(async () => { queue.push(value); available(); }); } };
}

it.each(["AI 整理", "从网页链接导入", "帮我找做法"])("task %s retains current V2 shell without old brand or root tabs; entry never requests", async name => {
  const f = app(); const view = render(f.element);
  fireEvent.click(await screen.findByRole("button", { name: "新增菜谱" }));
  fireEvent.click(await screen.findByRole("button", { name }));
  await screen.findByLabelText(name === "AI 整理" ? "菜谱文字" : name === "从网页链接导入" ? "网页链接" : "想做什么菜");
  expect(view.container.firstElementChild).toHaveClass("recipio-ui-v2", "v2-production");
  expect(view.container.firstElementChild).toHaveAttribute("data-v2-theme", "pure-glass");
  expect(screen.queryByRole("heading", { name: "谱序 RECIPIO" })).not.toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "主要导航" })).not.toBeInTheDocument();
  expect(f.fake.bridge.organize).not.toHaveBeenCalled(); expect(f.read).not.toHaveBeenCalled(); expect(f.port.search).not.toHaveBeenCalled(); expect(f.port.extract).not.toHaveBeenCalled();
});

it("V2 pending share shows only a host while dirty editor and replacement stay protected", async () => {
  const f = app(); render(f.element);
  fireEvent.click(await screen.findByRole("button", { name: "新增菜谱" })); fireEvent.click(await screen.findByRole("button", { name: "手动录入" }));
  fireEvent.change(await screen.findByLabelText("菜名"), { target: { value: "GENERATED 未保存汤" } });
  await f.emit({ status: "url", id: crypto.randomUUID(), replaced: false, url: "https://recipes.example/private/path?private-token=never-show" });
  const pending = await screen.findByLabelText("待处理分享");
  expect(pending).toHaveClass("v2-share-notice"); expect(pending).toHaveTextContent("recipes.example");
  expect(pending).not.toHaveTextContent("private/path"); expect(pending).not.toHaveTextContent("private-token");
  expect(screen.getByRole("button", { name: "打开分享的链接" })).toBeDisabled();
  expect(screen.getByLabelText("菜名")).toHaveValue("GENERATED 未保存汤");
  await f.emit({ status: "text", id: crypto.randomUUID(), replaced: true, text: "GENERATED PRIVATE SHARE BODY" });
  await waitFor(() => expect(screen.getByLabelText("待处理分享")).toHaveTextContent("分享文字"));
  expect(screen.getByLabelText("待处理分享")).not.toHaveTextContent("PRIVATE SHARE BODY");
  expect(screen.getByLabelText("菜名")).toHaveValue("GENERATED 未保存汤");
  expect(f.fake.bridge.organize).not.toHaveBeenCalled(); expect(f.read).not.toHaveBeenCalled();
});
