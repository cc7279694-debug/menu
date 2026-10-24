import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { V2AppearanceProvider, type V2Theme } from "../ui-v2/appearance";
import { LinkImportService } from "./service";
import { LinkImportScreen } from "./screen";
import { LinkImportError, type LinkErrorCode } from "./contract";

const recipe = { "@type": "Recipe", name: "网页清汤", recipeIngredient: ["青菜200克"], recipeInstructions: ["煮熟。"] };
const page = (data: unknown = recipe) => `<script type="application/ld+json">${JSON.stringify(data)}</script><main><h1>网页清汤</h1><p>青菜200克，煮熟后食用。</p></main>`;
const setup = (html = page()) => {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const port = { read: vi.fn(async () => ({ html, finalUrl: "https://recipes.example/soup", contentType: "text/html" as const })), cancel: vi.fn(async () => {}) };
  const service = new LinkImportService({ store, port, ai });
  const callbacks = { onSaved: vi.fn(), onCancel: vi.fn(), onConfigureKey: vi.fn(), onFallback: vi.fn() };
  const tree = (theme: V2Theme = "warm-ivory", active = true) => <V2AppearanceProvider theme={theme} solid={false}><div hidden={!active}><LinkImportScreen service={service} active={active} {...callbacks} /></div></V2AppearanceProvider>;
  const mounted = render(tree());
  return { store, fake, port, service, mounted, tree, ...callbacks };
};
afterEach(__resetLocalDatabaseForTests);
async function read() {
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://recipes.example/soup" } });
  fireEvent.click(screen.getByRole("button", { name: "读取网页" }));
}

it("offers a V2 task form with parser-first disclosure before any explicit read", () => {
  const { fake, port } = setup();
  expect(screen.getByRole("heading", { name: "从网页导入" }).closest("section")).toHaveClass("v2-task", "v2-link-intake");
  expect(screen.getByLabelText("网页链接")).toHaveAccessibleDescription("优先读取网页自带的菜谱信息，不会自动调用 AI。");
  expect(screen.getByRole("button", { name: "读取网页" })).toBeDisabled();
  expect(port.read).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it("uses the actual V2 editor for parser data and retains unsaved fields across theme changes", async () => {
  const { mounted, tree, fake } = setup(); await read();
  const title = await screen.findByLabelText("菜名");
  expect(title.closest("form")).toHaveClass("v2-production-form");
  expect(title.closest(".v2-import-preview")).toBeInTheDocument();
  expect(screen.getByText("已从网页读取")).toBeInTheDocument();
  fireEvent.change(title, { target: { value: "保留手改清汤" } }); mounted.rerender(tree("soft-sage"));
  expect(screen.getByLabelText("菜名")).toBe(title); expect(title).toHaveValue("保留手改清汤");
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(); expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it.each<V2Theme>(["warm-ivory", "pure-glass", "soft-sage"])("the leave confirmation inherits %s without clearing the URL", async theme => {
  const { mounted, tree, service } = setup(); mounted.rerender(tree(theme));
  fireEvent.change(screen.getByLabelText("网页链接"), { target: { value: "https://recipes.example/keep" } });
  fireEvent.click(screen.getByRole("button", { name: "返回" }));
  expect(await screen.findByRole("dialog", { name: "放弃本轮网页导入？" })).toHaveAttribute("data-v2-theme", theme);
  fireEvent.click(screen.getByRole("button", { name: "继续导入" }));
  expect(service.snapshot().url).toBe("https://recipes.example/keep");
});

it.each<V2Theme>(["warm-ivory", "pure-glass", "soft-sage"])("the parser duplicate confirmation inherits %s and retains the original recipe", async theme => {
  const { mounted, tree, store, onSaved } = setup(); mounted.rerender(tree(theme));
  await store.create("网页清汤"); await read();
  fireEvent.click(await screen.findByRole("button", { name: "确认保存菜谱" }));
  expect(await screen.findByRole("dialog", { name: "已存在同名菜谱" })).toHaveAttribute("data-v2-theme", theme);
  fireEvent.click(screen.getByRole("button", { name: "返回检查" }));
  expect(onSaved).not.toHaveBeenCalled(); expect(await store.list()).toHaveLength(1);
});

it("renders multiple source candidates with counts and opens only the explicitly selected recipe", async () => {
  const { fake, store } = setup(page([recipe, { ...recipe, name: "第二道清汤" }])); await read();
  const results = await screen.findByRole("region", { name: "网页读取结果" });
  expect(results).toHaveClass("v2-task-results");
  expect(results.querySelectorAll(".v2-source-card")).toHaveLength(2);
  expect(screen.queryByLabelText("菜名")).not.toBeInTheDocument();
  const second = within(results).getByRole("heading", { name: "第二道清汤" }).closest("article")!;
  expect(within(second).getByText("1 项食材 · 1 个步骤")).toBeInTheDocument();
  fireEvent.click(within(second).getByRole("button", { name: "选择 第二道清汤" }));
  expect(await screen.findByLabelText("菜名")).toHaveValue("第二道清汤");
  expect(fake.bridge.organize).not.toHaveBeenCalled(); expect(await store.list()).toHaveLength(0);
});

it("keeps partial data editable in V2 without requiring an AI request", async () => {
  const { recipeInstructions: omitted, ...partial } = recipe; void omitted;
  const { fake } = setup(page(partial)); await read();
  expect(await screen.findByText("网页信息不完整")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "直接完善菜谱" }));
  expect(await screen.findByLabelText("菜名")).toHaveValue("网页清汤");
  expect(screen.getByLabelText("菜名").closest("form")).toHaveClass("v2-production-form");
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it("readable body without structured data exposes explicit AI and manual fallbacks in the task results", async () => {
  const { fake } = setup(page(null)); await read();
  const results = await screen.findByRole("region", { name: "网页读取结果" });
  expect(results).toHaveClass("v2-task-results");
  expect(within(results).getByText(/没有完整的结构化菜谱/)).toBeInTheDocument();
  expect(within(results).getByRole("button", { name: "使用 AI 继续整理" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "改为手动录入" })).toBeEnabled();
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it.each<LinkErrorCode>(["unsafe_url", "network_unavailable", "timeout", "page_too_large", "page_unreadable"])("preserves the %s category with an associated URL error and safe retry", async code => {
  const { port, fake } = setup(); port.read.mockRejectedValueOnce(new LinkImportError(code)); await read();
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(new LinkImportError(code).message);
  expect(alert).toHaveClass("v2-task-status");
  expect(screen.getByLabelText("网页链接")).toHaveAccessibleDescription(expect.stringContaining(new LinkImportError(code).message));
  expect(screen.getByRole("button", { name: "重试读取网页" })).toBeEnabled();
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it("a hidden settings visit and theme rerender retain the source and resume without extra network requests", async () => {
  const { fake, service, mounted, tree, onConfigureKey, port } = setup(page(null)); fake.keys.hasAiKey.mockResolvedValue({ configured: false }); await read();
  fireEvent.click(await screen.findByRole("button", { name: "使用 AI 继续整理" }));
  fireEvent.click(await screen.findByRole("button", { name: "前往设置 AI 密钥" })); expect(onConfigureKey).toHaveBeenCalledOnce();
  const parsed = service.snapshot().parsed;
  mounted.rerender(tree("pure-glass", false)); mounted.rerender(tree("soft-sage"));
  expect(service.snapshot().parsed).toBe(parsed); expect(screen.getByLabelText("网页链接")).toHaveValue("https://recipes.example/soup");
  expect(screen.getByRole("region", { name: "网页读取结果" })).toHaveClass("v2-task-results");
  expect(port.read).toHaveBeenCalledOnce(); expect(fake.bridge.organize).not.toHaveBeenCalled();
});

it("the V2 uncertain-save screen blocks new saves and only checks the original attempt", async () => {
  const { store, fake, onSaved } = setup(); await read(); await screen.findByLabelText("菜名");
  vi.spyOn(store, "hasExactTitle").mockResolvedValue(false);
  const create = vi.spyOn(store, "createDetails").mockRejectedValueOnce(new Error("write"));
  vi.spyOn(store, "getDetails").mockRejectedValueOnce(new Error("read"));
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  const recovery = await screen.findByRole("heading", { name: "先核对保存结果" });
  expect(recovery.closest("section")).toHaveClass("v2-task", "v2-link-intake");
  expect(screen.queryByRole("button", { name: "确认保存菜谱" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "核对保存结果" }));
  await waitFor(() => expect(screen.getByLabelText("菜名")).toHaveValue("网页清汤"));
  expect(create).toHaveBeenCalledOnce(); expect(onSaved).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled();
});
