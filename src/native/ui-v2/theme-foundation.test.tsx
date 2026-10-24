import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { FindRecipeService } from "../find-recipe/service";
import { FinderError, type FinderPort } from "../find-recipe/contract";
import { LinkImportService } from "../link-import/service";
import { RecipeEditor } from "../recipe-editor";
import { V2AppearanceProvider } from "./appearance";
import { SettingsScreen } from "./settings-screen";
import { goldenSource, goldenAssets, manifestFor } from "../backup/test-fixtures";
import { toPortableData } from "../backup/references";
import type { BackupState } from "../backup/service";

const preference = "recipio.ui-v2.theme.v1";
const root = () => document.querySelector(".v2-production")!;
const nav = () => screen.getByRole("navigation", { name: "主要导航" });
const navigate = (label: string) => fireEvent.click(within(nav()).getByRole("button", { name: label }));
beforeEach(() => { localStorage.clear(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(async () => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); await __resetLocalDatabaseForTests(); });

function app() {
  const store = new PreviewRecipeLibrary(), fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const port = {
    createSession: vi.fn(async (): Promise<never> => { throw new FinderError("key_missing"); }),
    search: vi.fn(async (): Promise<never> => { throw new Error("Unexpected search"); }),
    extract: vi.fn(async (): Promise<never> => { throw new Error("Unexpected extract"); }),
    cancel: vi.fn(async () => {}), discardSession: vi.fn(async () => {}),
  } satisfies FinderPort;
  const finder = new FindRecipeService({ ai, port });
  const web = { read: vi.fn(async () => ({ finalUrl: "https://recipes.example/test", contentType: "text/html" as const, html:
    '<html><body><p>鸡翅先清洗，再焯水，加入可乐和生抽炖煮，最后收汁。收汁时请留在锅边观察。</p></body></html>' })), cancel: vi.fn(async () => {}) };
  const link = new LinkImportService({ store, ai, port: web });
  return { store, fake, ai, finder, port, web, element: <LibraryApp store={store} ai={ai} finder={finder} link={link} /> };
}

it("all three roots reuse the same V2 shell/navigation and settings never shows the old brand header", async () => {
  render(app().element);
  const shell = root(), navigation = nav();
  navigate("我的菜谱"); await screen.findByRole("heading", { name: "我的菜谱" });
  navigate("设置"); await screen.findByRole("main", { name: "设置" });
  expect(root()).toBe(shell); expect(nav()).toBe(navigation);
  expect(screen.queryByRole("heading", { name: "谱序 RECIPIO" })).not.toBeInTheDocument();
  expect(within(nav()).getByRole("button", { name: "设置" })).toHaveAttribute("aria-current", "page");
  expect(screen.getAllByRole("heading", { level: 2 }).map(e => e.textContent)).toEqual(["外观", "数据与备份", "AI 设置", "关于 / 版本"]);
  expect(screen.getByText(/此备份未加密/)).toBeInTheDocument();
});

it("theme changes update the existing shell/navigation immediately and persist only an enum", async () => {
  render(app().element); const shell = root(), navigation = nav(); navigate("设置");
  for (const [label, id] of [["Pure Glass", "pure-glass"], ["Soft Sage", "soft-sage"], ["Warm Ivory", "warm-ivory"]]) {
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(label) }));
    expect(root()).toBe(shell); expect(nav()).toBe(navigation);
    expect(root()).toHaveAttribute("data-v2-theme", id); expect(navigation).toHaveAttribute("data-v2-theme", id);
    expect(localStorage.getItem(preference)).toBe(id);
    navigate("首页"); expect(root()).toHaveAttribute("data-v2-theme", id); navigate("设置");
  }
  expect(Object.keys(localStorage)).toEqual([preference]);
});

it.each(["pure-glass", "soft-sage"])("cold mount uses persisted %s before first paint", theme => {
  localStorage.setItem(preference, theme); render(app().element);
  expect(root()).toHaveAttribute("data-v2-theme", theme);
  expect(nav()).toHaveAttribute("data-v2-theme", theme);
});

it.each(["bad-theme", '{"recipe":"not a preference"}'])("invalid preference %s falls back safely", value => {
  localStorage.setItem(preference, value); render(app().element);
  expect(root()).toHaveAttribute("data-v2-theme", "warm-ivory");
  navigate("设置"); expect(screen.getByRole("radio", { name: /Warm Ivory/ })).toBeChecked();
});

it("unavailable preference reads/writes do not block startup or in-memory switching", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  render(app().element); navigate("设置"); fireEvent.click(screen.getByRole("radio", { name: /Pure Glass/ }));
  expect(root()).toHaveAttribute("data-v2-theme", "pure-glass");
});

it("settings theme visits retain library query/filter without recreating its owner", async () => {
  const state = app(); await state.store.createDetails({ ...emptyDetails("凉拌黄瓜"), totalMinutes: 10 });
  render(state.element); navigate("我的菜谱");
  fireEvent.change(screen.getByLabelText("搜索菜名或食材"), { target: { value: "黄瓜" } });
  fireEvent.change(screen.getByLabelText("耗时筛选"), { target: { value: "short" } });
  await screen.findByRole("button", { name: "打开 凉拌黄瓜" });
  navigate("设置"); fireEvent.click(screen.getByRole("radio", { name: /Soft Sage/ })); navigate("我的菜谱");
  expect(screen.getByLabelText("搜索菜名或食材")).toHaveValue("黄瓜");
  expect(screen.getByLabelText("耗时筛选")).toHaveValue("short");
});

it("a paged settings round trip preserves the library page but switching to home still starts at the newest recipes", async () => {
  const state = app(); const first = await state.store.create("先加入的汤");
  await state.store.create("最新加入的饭");
  const actualList = state.store.list.bind(state.store), realRows = await actualList();
  vi.spyOn(state.store, "list").mockImplementation(async (query = "", limit = 100, offset = 0, filter = "all") => {
    if (filter !== "short") return actualList(query, limit, offset, filter);
    return offset === 0 ? Array.from({ length: 100 }, (_, index) => ({ ...realRows[0], id: `page-${index}` }))
      : [{ ...realRows[0], id: first.id, title: "第二页条目" }];
  });
  render(state.element); navigate("我的菜谱");
  fireEvent.change(screen.getByLabelText("耗时筛选"), { target: { value: "short" } });
  fireEvent.click(await screen.findByRole("button", { name: "下一页" }));
  await screen.findByRole("button", { name: "打开 第二页条目" });
  navigate("设置"); fireEvent.click(screen.getByRole("radio", { name: /Pure Glass/ })); navigate("我的菜谱");
  await screen.findByRole("button", { name: "打开 第二页条目" });
  navigate("设置"); navigate("首页");
  await screen.findByRole("main", { name: "首页" });
  await waitFor(() => expect(screen.getAllByRole("button", { name: "打开 最新加入的饭" }).length).toBeGreaterThan(0));
  expect(state.store.list).toHaveBeenLastCalledWith("", 100, 0, "all");
});

it("current theme reaches mounted Base UI portals and both cooking modes", async () => {
  localStorage.setItem(preference, "pure-glass"); const state = app();
  await state.store.createDetails({ ...emptyDetails("主题测试汤"), steps: [{ instruction: "小火煮熟。", imagePath: null }] });
  render(state.element); fireEvent.click(screen.getByRole("button", { name: "新增菜谱" }));
  expect((await screen.findByRole("dialog", { name: "添加菜谱" })).closest(".v2-portal")).toHaveAttribute("data-v2-theme", "pure-glass");
  fireEvent.click(screen.getByRole("button", { name: "关闭添加菜谱" }));
  fireEvent.click((await screen.findAllByRole("button", { name: "打开 主题测试汤" }))[0]);
  await screen.findByRole("heading", { name: "主题测试汤" });
  for (const [button, exit] of [["放大步骤 1", "返回完整步骤"], ["开始引导烹饪", "退出引导"]]) {
    fireEvent.click(await screen.findByRole("button", { name: button }));
    expect(document.querySelector(".v2-cooking")).toHaveAttribute("data-v2-theme", "pure-glass");
    fireEvent.click(screen.getByRole("button", { name: "查看食材" }));
    expect((await screen.findByRole("dialog", { name: "食材" })).closest(".v2-portal")).toHaveAttribute("data-v2-theme", "pure-glass");
    fireEvent.click(screen.getByRole("button", { name: "关闭食材" })); fireEvent.click(screen.getByRole("button", { name: exit }));
  }
  expect(await state.store.listCookingRecords((await state.store.list())[0].id)).toEqual([]);
});

it("an appearance rerender does not recreate the real editor or discard unsaved text", () => {
  const props = { appearance: "v2" as const, onSave: vi.fn(async () => {}), onCancel: vi.fn() };
  const tree = (theme: "warm-ivory" | "soft-sage") => <V2AppearanceProvider theme={theme} solid={false}><RecipeEditor {...props} /></V2AppearanceProvider>;
  const mounted = render(tree("warm-ivory")); const input = screen.getByLabelText("菜名");
  fireEvent.change(input, { target: { value: "未保存的面 🍜" } }); mounted.rerender(tree("soft-sage"));
  expect(screen.getByLabelText("菜名")).toBe(input); expect(input).toHaveValue("未保存的面 🍜");
});

it("AI settings confirmation portals inherit the selected theme without sending a request", async () => {
  const state = app(); render(state.element); navigate("设置"); fireEvent.click(screen.getByRole("radio", { name: /Soft Sage/ }));
  fireEvent.click(await screen.findByRole("button", { name: "删除 AI 密钥" }));
  expect(screen.getByRole("dialog", { name: "删除本机 AI 密钥？" })).toHaveAttribute("data-v2-theme", "soft-sage");
  fireEvent.click(screen.getByRole("button", { name: "保留密钥" }));
  fireEvent.click(screen.getByRole("button", { name: "验证模型访问" }));
  expect(screen.getByRole("dialog", { name: "验证 qwen3.8-flash 访问？" })).toHaveAttribute("data-v2-theme", "soft-sage");
  expect(state.fake.bridge.preflight).not.toHaveBeenCalled(); expect(state.fake.keys.deleteAiKey).not.toHaveBeenCalled();
});

it("restore confirmation portal inherits appearance without replacing data", () => {
  const state: BackupState = { phase: "preview", mode: "restore", currentCount: 7,
    manifest: manifestFor(toPortableData(goldenSource(), goldenAssets())) };
  const backup = { getState: () => state, subscribe: () => () => {}, export: vi.fn(async () => {}),
    inspectRestore: vi.fn(async () => {}), confirmReplace: vi.fn(async () => {}), cancel: vi.fn(async () => {}) };
  render(<V2AppearanceProvider theme="pure-glass" solid={false}><SettingsScreen theme="pure-glass"
    onTheme={vi.fn()} backup={backup} keys={fakeAi().keys} onKeyChanged={vi.fn()} /></V2AppearanceProvider>);
  fireEvent.click(screen.getByRole("button", { name: "恢复并替换当前数据" }));
  expect(screen.getByRole("button", { name: "确认替换 7 道菜谱" }).closest('[role="dialog"]')).toHaveAttribute("data-v2-theme", "pure-glass");
  expect(backup.confirmReplace).not.toHaveBeenCalled();
});

it.each(["ai", "link", "finder"])("%s key settings preserve its original return flow and draft, without root navigation", async source => {
  const state = app(); state.fake.keys.hasAiKey.mockResolvedValue({ configured: false }); render(state.element);
  fireEvent.click(screen.getByRole("button", { name: "新增菜谱" }));
  if (source === "ai") {
    fireEvent.click(await screen.findByRole("button", { name: "AI 整理" }));
    fireEvent.change(await screen.findByLabelText("菜谱文字"), { target: { value: "保留这份草稿 🍳" } });
  } else if (source === "link") {
    fireEvent.click(await screen.findByRole("button", { name: "从网页链接导入" }));
    fireEvent.change(await screen.findByLabelText("网页链接"), { target: { value: "https://recipes.example/test" } });
    fireEvent.click(screen.getByRole("button", { name: "读取网页" }));
    fireEvent.click(await screen.findByRole("button", { name: "使用 AI 继续整理" }));
  } else {
    fireEvent.click(await screen.findByRole("button", { name: "帮我找做法" }));
    fireEvent.change(await screen.findByLabelText("想做什么菜"), { target: { value: "保留这道汤" } });
    expect(state.port.createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  }
  fireEvent.click(await screen.findByRole("button", { name: "前往设置 AI 密钥" }));
  await screen.findByRole("main", { name: "设置" }); expect(screen.queryByRole("navigation", { name: "主要导航" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: /Soft Sage/ }));
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("main", { name: "设置" })).not.toBeInTheDocument());
  if (source === "ai") expect(screen.getByLabelText("菜谱文字")).toHaveValue("保留这份草稿 🍳");
  if (source === "link") expect(screen.getByLabelText("网页链接")).toHaveValue("https://recipes.example/test");
  if (source === "finder") expect(screen.getByLabelText("想做什么菜")).toHaveValue("保留这道汤");
  expect(state.fake.bridge.organize).not.toHaveBeenCalled(); expect(state.port.search).not.toHaveBeenCalled();
});
