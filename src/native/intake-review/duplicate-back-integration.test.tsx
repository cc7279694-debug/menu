import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { AiPreview } from "../ai/preview";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { LinkImportScreen } from "../link-import/screen";
import { LinkImportService } from "../link-import/service";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";
import { V2AppearanceProvider } from "../ui-v2/appearance";

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await __resetLocalDatabaseForTests();
});

it("T10/T13 AI duplicate Back closes only the pending decision and preserves the edited draft", async () => {
  const onSave = vi.fn(async () => {}), onCancel = vi.fn();
  const hasExactTitle = vi.fn(async () => true);
  render(<V2AppearanceProvider theme="warm-ivory" solid={false}>
    <AiPreview draft={{
      recipe: emptyDetails("AI 原始合成菜名"),
      review: { fieldChecks: [{ path: "title", label: "菜名", status: "explicit", message: null }], requiresConfirmation: false },
      warnings: [],
    }} confirmed={false} onConfirmedChange={vi.fn()} onSave={onSave} onCancel={onCancel} hasExactTitle={hasExactTitle} />
  </V2AppearanceProvider>);
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "AI 最终同名菜谱" } });
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "同名返回时保留的 AI 编辑备注😊" } });
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  expect(hasExactTitle).toHaveBeenCalledWith("AI 最终同名菜谱");
  const back = new Event("recipio:back", { cancelable: true });
  fireEvent(window, back);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "已存在同名菜谱" })).not.toBeInTheDocument());
  expect(back.defaultPrevented).toBe(true);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "检查整理结果" })).toBeVisible();
  expect(screen.getByLabelText("菜名")).toHaveValue("AI 最终同名菜谱");
  expect(screen.getByLabelText("个人备注")).toHaveValue("同名返回时保留的 AI 编辑备注😊");
  await waitFor(() => expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeEnabled());
  expect(onSave).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  expect(hasExactTitle).toHaveBeenCalledOnce();
});

it("T10/T13 Parser duplicate Back closes only its decision and keeps the current parser editor", async () => {
  const store = new PreviewRecipeLibrary();
  await store.createDetails(emptyDetails("Parser 最终同名菜谱"));
  const create = vi.spyOn(store, "createDetails"), fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const port = {
    read: vi.fn(async () => ({
      finalUrl: "https://recipes.example/g7-back", contentType: "text/html" as const,
      html: '<title>Parser 原始合成菜名</title><script type="application/ld+json">{"@type":"Recipe","name":"Parser 原始合成菜名","recipeIngredient":["酱汁20毫升"],"recipeInstructions":["煮熟"]}</script><main><h2>食材</h2><p>酱汁20毫升</p><h2>做法</h2><p>煮熟</p></main>',
    })), cancel: vi.fn(async () => {}),
  };
  const service = new LinkImportService({ store, port, ai });
  const onSaved = vi.fn(), onCancel = vi.fn(), onFallback = vi.fn();
  render(<V2AppearanceProvider theme="warm-ivory" solid={false}>
    <LinkImportScreen service={service} active onSaved={onSaved} onCancel={onCancel} onConfigureKey={vi.fn()} onFallback={onFallback} />
  </V2AppearanceProvider>);
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://recipes.example/g7-back" } });
  fireEvent.click(screen.getByRole("button", { name: "读取网页" }));
  await screen.findByRole("heading", { name: "检查网页菜谱" });
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "Parser 最终同名菜谱" } });
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "同名返回时保留的网页编辑备注😊" } });
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  const back = new Event("recipio:back", { cancelable: true });
  fireEvent(window, back);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "已存在同名菜谱" })).not.toBeInTheDocument());
  expect(back.defaultPrevented).toBe(true);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "检查网页菜谱" })).toBeVisible();
  expect(screen.getByLabelText("菜名")).toHaveValue("Parser 最终同名菜谱");
  expect(screen.getByLabelText("个人备注")).toHaveValue("同名返回时保留的网页编辑备注😊");
  await waitFor(() => expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeEnabled());
  expect(onSaved).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  expect(onFallback).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  expect(await store.list()).toHaveLength(1);
  expect(port.read).toHaveBeenCalledOnce();
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});
