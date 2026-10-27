import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests, getLocalDatabase } from "@/features/offline/local-db";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { FindRecipeService } from "../find-recipe/service";
import type { FinderPort } from "../find-recipe/contract";
import { LibraryApp } from "../library-app";
import { LinkImportService } from "../link-import/service";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";

let scrollPosition = 0;
beforeEach(() => {
  scrollPosition = 0;
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollPosition);
  vi.spyOn(window, "scrollTo").mockImplementation((left: number | ScrollToOptions, top?: number) => {
    scrollPosition = typeof left === "object" ? left.top ?? scrollPosition : top ?? 0;
  });
});
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await __resetLocalDatabaseForTests();
});

function localApp(store: PreviewRecipeLibrary) {
  const fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const unexpectedNetwork = async (): Promise<never> => { throw new Error("Unexpected external request in a local flow"); };
  const finderPort = {
    createSession: vi.fn(unexpectedNetwork), search: vi.fn(unexpectedNetwork), extract: vi.fn(unexpectedNetwork),
    cancel: vi.fn(async () => {}), discardSession: vi.fn(async () => {}),
  } satisfies FinderPort;
  const finder = new FindRecipeService({ port: finderPort, ai });
  const web = { read: vi.fn(unexpectedNetwork), cancel: vi.fn(async () => {}) };
  const link = new LinkImportService({ store, ai, port: web });
  return { fake, finderPort, web, element: <LibraryApp store={store} ai={ai} finder={finder} link={link} /> };
}

async function showLibrary() {
  fireEvent.click(within(screen.getByRole("navigation", { name: "主要导航" })).getByRole("button", { name: "我的菜谱" }));
  await screen.findByRole("heading", { name: "我的菜谱" });
}

function displayedRecipeOrder() {
  // Home may expose both its recent strip and the full rows. Compare the first
  // occurrence of each real recipe rather than relying on one visual layout.
  return [...new Set(screen.getAllByRole("button", { name: /^打开 / }).map(button => button.getAttribute("aria-label")))];
}

it("localSearch_doesNotStartNetwork", async () => {
  const store = new PreviewRecipeLibrary();
  await store.createDetails({ ...emptyDetails("凉拌黄瓜"), ingredients: [{ name: "黄瓜", amount: "1 根" }] });
  await store.create("红烧肉");
  const app = localApp(store), fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected fetch"));
  render(app.element);
  await screen.findByRole("button", { name: "打开 红烧肉" });
  fireEvent.change(screen.getByLabelText("搜索菜名或食材"), { target: { value: "黄瓜" } });
  await waitFor(() => expect(screen.queryByRole("button", { name: "打开 红烧肉" })).not.toBeInTheDocument());
  expect(screen.getAllByRole("button", { name: "打开 凉拌黄瓜" }).length).toBeGreaterThan(0);
  fireEvent.change(screen.getByLabelText("搜索菜名或食材"), { target: { value: "不存在的菜" } });
  await screen.findByText("没有符合条件的菜谱");
  expect(await store.list()).toHaveLength(2);
  expect(fetch).not.toHaveBeenCalled();
  expect(app.fake.bridge.organize).not.toHaveBeenCalled();
  expect(app.finderPort.createSession).not.toHaveBeenCalled();
  expect(app.finderPort.search).not.toHaveBeenCalled();
  expect(app.finderPort.extract).not.toHaveBeenCalled();
  expect(app.web.read).not.toHaveBeenCalled();
});

it("recentlyAdded_preservesCreationOrder", async () => {
  let now = Date.parse("2026-10-23T01:00:00.000Z");
  const store = new PreviewRecipeLibrary(() => new Date(now++));
  const old = await store.createDetails(emptyDetails("较早加入的汤"));
  await store.create("刚加入的粥");
  render(localApp(store).element);
  await screen.findByRole("button", { name: "打开 刚加入的粥" });
  expect(displayedRecipeOrder()).toEqual(["打开 刚加入的粥", "打开 较早加入的汤"]);
  await showLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "打开 较早加入的汤" }));
  fireEvent.click(await screen.findByRole("button", { name: "编辑菜谱" }));
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "今天补充备注" } });
  fireEvent.click(screen.getByRole("button", { name: "快速保存菜谱" }));
  await screen.findByRole("heading", { name: "较早加入的汤" });
  fireEvent.click(screen.getByRole("button", { name: /返回菜谱库/ }));
  await screen.findByRole("button", { name: "打开 刚加入的粥" });
  fireEvent.click(within(screen.getByRole("navigation", { name: "主要导航" })).getByRole("button", { name: "首页" }));
  await screen.findByRole("main", { name: "首页" });
  await waitFor(() => expect(displayedRecipeOrder()).toEqual(["打开 刚加入的粥", "打开 较早加入的汤"]));
  expect((await store.getDetails(old.id))?.createdAt).toBe(old.createdAt);
  expect((await store.getDetails(old.id))?.notes).toBe("今天补充备注");
  expect((await store.listRecipeChanges(old.id))).toHaveLength(1);
});

it("recipeTitleOnly_remainsValidRecipe", async () => {
  const store = new PreviewRecipeLibrary();
  render(localApp(store).element);
  fireEvent.click(screen.getByRole("button", { name: "新增菜谱" }));
  fireEvent.click(await screen.findByRole("button", { name: "手动录入" }));
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "只有名字的绿豆汤" } });
  fireEvent.click(screen.getByRole("button", { name: "快速保存菜谱" }));
  await screen.findByRole("heading", { name: "只有名字的绿豆汤" });
  const [saved] = await store.list();
  expect(await store.getDetails(saved.id)).toMatchObject({ title: "只有名字的绿豆汤", ingredients: [], steps: [], totalMinutes: null });
  const supplement = screen.getByRole("button", { name: "补充做法" });
  expect(supplement).toBeEnabled();
  fireEvent.click(supplement);
  expect(await screen.findByLabelText("菜名")).toHaveValue("只有名字的绿豆汤");
  expect(await store.listCookingRecords(saved.id)).toEqual([]);
});

it("detailBack_restoresQueryFilterAndScroll", async () => {
  const store = new PreviewRecipeLibrary();
  const first = await store.createDetails({ ...emptyDetails("凉拌第一页"), totalMinutes: 10 });
  const second = await store.createDetails({ ...emptyDetails("凉拌第二页"), totalMinutes: 15 });
  const actualList = store.list.bind(store);
  const realRows = await actualList();
  const firstRow = realRows.find(row => row.id === first.id)!;
  const secondRow = realRows.find(row => row.id === second.id)!;
  // Only the list boundary supplies a full page. Detail reads and all data
  // remain real; this makes page 100 observable without creating 101 records.
  const fullPage = Array.from({ length: 100 }, (_, index) => index === 0 ? firstRow : { ...firstRow, id: `list-boundary-${index}`, title: `凉拌列表项 ${index}` });
  const list = vi.spyOn(store, "list").mockImplementation(async (query = "", limit = 100, offset = 0, filter = "all") => {
    if (query !== "凉拌" || filter !== "short") return actualList(query, limit, offset, filter);
    if (limit !== 100) throw new Error("The root list must keep bounded pages of 100");
    if (offset === 0) return fullPage;
    if (offset === 100) return [secondRow];
    throw new Error(`Unexpected page offset ${offset}`);
  });
  render(localApp(store).element);
  await showLibrary();
  fireEvent.change(screen.getByLabelText("搜索菜名或食材"), { target: { value: "凉拌" } });
  fireEvent.change(screen.getByLabelText("耗时筛选"), { target: { value: "short" } });
  fireEvent.click(await screen.findByRole("button", { name: "下一页" }));
  fireEvent.click(await screen.findByRole("button", { name: "打开 凉拌第二页" }));
  await screen.findByRole("heading", { name: second.title });
  // Return once, then leave from a scrolled page. Both explicit and native Back
  // must restore the same root state after Detail resets document scrolling.
  fireEvent.click(screen.getByRole("button", { name: /返回菜谱库/ }));
  await screen.findByRole("button", { name: "打开 凉拌第二页" });
  window.scrollTo(0, 780);
  fireEvent.click(screen.getByRole("button", { name: "打开 凉拌第二页" }));
  await screen.findByRole("heading", { name: second.title });
  expect(window.scrollY).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: /返回菜谱库/ }));
  await screen.findByRole("button", { name: "打开 凉拌第二页" });
  expect(screen.getByLabelText("搜索菜名或食材")).toHaveValue("凉拌");
  expect(screen.getByLabelText("耗时筛选")).toHaveValue("short");
  expect(screen.getByRole("button", { name: "上一页" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "打开 凉拌第一页" })).not.toBeInTheDocument();
  expect(list).toHaveBeenLastCalledWith("凉拌", 100, 100, "short");
  await waitFor(() => expect(window.scrollY).toBe(780));
  window.scrollTo(0, 930);
  fireEvent.click(screen.getByRole("button", { name: "打开 凉拌第二页" }));
  await screen.findByRole("heading", { name: second.title });
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await screen.findByRole("button", { name: "打开 凉拌第二页" });
  expect(list).toHaveBeenLastCalledWith("凉拌", 100, 100, "short");
  await waitFor(() => expect(window.scrollY).toBe(930));
});

it.each([
  ["history", "查看做菜记录", "做菜记录", "返回菜谱"],
  ["changes", "查看修改记录", "修改记录", "返回菜谱"],
  ["edit", "编辑菜谱", "编辑菜谱", "取消"],
] as const)("detailSubrouteBack_restoresScrollAfterShortPageClamp_%s", async (_route, entry, heading, backLabel) => {
  const store = new PreviewRecipeLibrary();
  const recipe = await store.createDetails({ ...emptyDetails("保留详情阅读位置的汤"), steps: [
    { instruction: "把食材洗净", imagePath: null },
    { instruction: "按照自己的做法煮熟", imagePath: null },
  ] });
  render(localApp(store).element);
  await showLibrary();
  fireEvent.click(await screen.findByRole("button", { name: `打开 ${recipe.title}` }));
  await screen.findByRole("heading", { name: recipe.title });
  window.scrollTo(0, 780);
  fireEvent.click(screen.getByRole("button", { name: entry }));
  await screen.findByRole("heading", { name: heading });
  const back = screen.getByRole("button", { name: backLabel });
  await waitFor(() => expect(back).toBeEnabled());
  // jsdom has no document layout. Model the browser clamping document scroll
  // when a long detail is replaced by a short history or editor page.
  scrollPosition = 0;
  fireEvent.click(back);
  await screen.findByRole("heading", { name: recipe.title });
  expect(await store.getDetails(recipe.id)).toEqual(recipe);
  expect(await store.listCookingRecords(recipe.id)).toEqual([]);
  expect(await store.listRecipeChanges(recipe.id)).toEqual([]);
  await waitFor(() => expect(window.scrollY).toBe(780));
});

it("rootAddSheet_nativeBackClosesBeforeListNavigation", async () => {
  const store = new PreviewRecipeLibrary();
  const recipe = await store.createDetails({ ...emptyDetails("凉拌返回保护"), totalMinutes: 15 });
  const list = vi.spyOn(store, "list");
  render(localApp(store).element);
  await showLibrary();
  fireEvent.change(screen.getByLabelText("搜索菜名或食材"), { target: { value: "凉拌" } });
  fireEvent.change(screen.getByLabelText("耗时筛选"), { target: { value: "short" } });
  await screen.findByRole("button", { name: `打开 ${recipe.title}` });
  await waitFor(() => expect(list).toHaveBeenLastCalledWith("凉拌", 100, 0, "short"));
  const root = screen.getByRole("main", { name: "我的菜谱" });
  const listReadsBeforeSheet = list.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "新增菜谱" }));
  await screen.findByRole("dialog", { name: "添加菜谱" });
  const sheetBack = new Event("recipio:back", { cancelable: true });
  fireEvent(window, sheetBack);
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "添加菜谱" })).not.toBeInTheDocument());
  expect(sheetBack.defaultPrevented).toBe(true);
  expect(screen.getByRole("main", { name: "我的菜谱" })).toBe(root);
  expect(screen.getByLabelText("搜索菜名或食材")).toHaveValue("凉拌");
  expect(screen.getByLabelText("耗时筛选")).toHaveValue("short");
  expect(list).toHaveBeenCalledTimes(listReadsBeforeSheet);
  expect(await store.getDetails(recipe.id)).toEqual(recipe);
  const listBack = new Event("recipio:back", { cancelable: true });
  fireEvent(window, listBack);
  expect(listBack.defaultPrevented).toBe(true);
  await screen.findByRole("main", { name: "首页" });
  expect(screen.getByLabelText("搜索菜名或食材")).toHaveValue("");
});

it("stepNavigation_doesNotCreateCookingRecord", async () => {
  const store = new PreviewRecipeLibrary();
  const recipe = await store.createDetails({ ...emptyDetails("步骤浏览汤"), steps: [{ instruction: "把食材洗净", imagePath: null }, { instruction: "放入锅里煮熟", imagePath: null }] });
  render(localApp(store).element);
  await showLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "打开 步骤浏览汤" }));
  fireEvent.click(await screen.findByRole("button", { name: "放大步骤 1" }));
  const focus = await screen.findByRole("dialog", { name: "单步查看" });
  fireEvent.click(within(focus).getByRole("button", { name: "下一步" }));
  expect(within(focus).getByText("放入锅里煮熟")).toBeInTheDocument();
  fireEvent.click(within(focus).getByRole("button", { name: "返回完整步骤" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /开始引导烹饪/ }));
  const guided = await screen.findByRole("dialog", { name: "引导烹饪" });
  fireEvent.click(within(guided).getByRole("button", { name: "下一步" }));
  expect(within(guided).getByRole("button", { name: "完成这道菜" })).toBeEnabled();
  expect(await store.listCookingRecords(recipe.id)).toEqual([]);
  fireEvent.click(within(guided).getByRole("button", { name: "上一步" }));
  fireEvent.click(within(guided).getByRole("button", { name: "退出引导" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(await store.getCookingSummary(recipe.id)).toEqual({ count: 0, lastCookedAt: null });
});

it("guidedIngredientsBack_keepsTheRealRootViewerAndItsStep", async () => {
  const store = new PreviewRecipeLibrary();
  const recipe = await store.createDetails({ ...emptyDetails("烹饪面板返回保护"), ingredients: [{ name: "盐", amount: "适量" }],
    steps: [{ instruction: "先洗净", imagePath: null }, { instruction: "再煮熟", imagePath: null }] });
  render(localApp(store).element);
  fireEvent.click(await screen.findByRole("button", { name: `打开 ${recipe.title}` }));
  fireEvent.click(await screen.findByRole("button", { name: "开始引导烹饪" }));
  const viewer = screen.getByRole("dialog", { name: "引导烹饪" });
  fireEvent.click(within(viewer).getByRole("button", { name: "下一步" }));
  fireEvent.click(within(viewer).getByRole("button", { name: "查看食材" }));
  await screen.findByRole("dialog", { name: "食材" });
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "食材" })).not.toBeInTheDocument());
  expect(screen.getByRole("dialog", { name: "引导烹饪" })).toBe(viewer);
  expect(within(viewer).getByText("再煮熟")).toBeVisible();
  expect(await store.listCookingRecords(recipe.id)).toEqual([]);
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("heading", { name: recipe.title })).toBeVisible();
});

it("explicitCompletion_createsExactlyOneRecord", async () => {
  const store = new PreviewRecipeLibrary(), recipe = await store.create("显式完成汤");
  const recordCooking = store.recordCooking.bind(store);
  let loseAcknowledgement = true;
  vi.spyOn(store, "recordCooking").mockImplementation(async (id, operation) => {
    const record = await recordCooking(id, operation);
    if (loseAcknowledgement) { loseAcknowledgement = false; throw new Error("完成响应丢失"); }
    return record;
  });
  render(localApp(store).element);
  await showLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "打开 显式完成汤" }));
  const complete = await screen.findByRole("button", { name: "完成这道菜" });
  fireEvent.click(complete);
  fireEvent.click(complete);
  await screen.findByText("完成响应丢失");
  const [first] = await store.listCookingRecords(recipe.id);
  expect(first).toMatchObject({ recipeId: recipe.id, evaluation: null, note: null, finishedPhotoPath: null });
  fireEvent.click(screen.getByRole("button", { name: "完成这道菜" }));
  await screen.findByRole("heading", { name: "已记录做过这道菜" });
  expect(await store.listCookingRecords(recipe.id)).toEqual([first]);
  expect(await store.getCookingSummary(recipe.id)).toEqual({ count: 1, lastCookedAt: first.cookedAt });
});

it("dirtyEditor_survivesDialogAndNavigationCancel", async () => {
  const store = new PreviewRecipeLibrary(), recipe = await store.create("草稿保护汤");
  render(localApp(store).element);
  await showLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "打开 草稿保护汤" }));
  fireEvent.click(await screen.findByRole("button", { name: "编辑菜谱" }));
  const title = screen.getByLabelText("菜名"), notes = screen.getByLabelText("个人备注");
  fireEvent.change(title, { target: { value: "未保存的新菜名" } });
  fireEvent.change(notes, { target: { value: "保留未保存的盐量" } });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(confirm).toHaveBeenCalledWith("有未保存的修改，确定放弃吗？");
  expect(screen.getByLabelText("菜名")).toBe(title);
  expect(notes).toHaveValue("保留未保存的盐量");
  const back = new Event("recipio:back", { cancelable: true });
  fireEvent(window, back);
  expect(back.defaultPrevented).toBe(true);
  expect(screen.getByLabelText("菜名")).toBe(title);
  expect(title).toHaveValue("未保存的新菜名");
  expect(await store.getDetails(recipe.id)).toMatchObject({ title: "草稿保护汤", notes: "" });
  expect(await store.listRecipeChanges(recipe.id)).toEqual([]);
});

it("deleteUndo_preservesOriginalFiveSecondWindow", async () => {
  const store = new PreviewRecipeLibrary();
  const first = await store.create("先删除的汤"), second = await store.create("后删除的粥");
  const details = vi.spyOn(store, "getDetails"), remove = vi.spyOn(store, "remove"), undo = vi.spyOn(store, "undo"), purge = vi.spyOn(store, "purgeExpired");
  render(localApp(store).element);
  await showLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "打开 先删除的汤" }));
  fireEvent.click(await screen.findByRole("button", { name: "更多菜谱操作" }));
  await screen.findByRole("button", { name: "删除这道菜" });
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-10-23T02:00:00.000Z"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "删除这道菜" }));
    await remove.mock.results.at(-1)?.value;
    await store.list();
  });
  expect(await store.getDetails(first.id)).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "打开 后删除的粥" }));
    await details.mock.results.at(-1)?.value;
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "更多菜谱操作" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "删除这道菜" }));
    await remove.mock.results.at(-1)?.value;
    await store.list();
  });
  expect(screen.getByText("已删除 先删除的汤")).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
    await purge.mock.results.at(-1)?.value;
  });
  const db = await getLocalDatabase();
  expect(await db.localRecipes.get(first.id)).toBeUndefined();
  expect(screen.queryByText("已删除 先删除的汤")).not.toBeInTheDocument();
  expect(screen.getByText("已删除 后删除的粥")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(3999); });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    await undo.mock.results.at(-1)?.value;
    await store.list();
  });
  expect((await store.getDetails(second.id))?.title).toBe("后删除的粥");
  expect(screen.queryByText("已删除 后删除的粥")).not.toBeInTheDocument();
  expect(await store.getDetails(first.id)).toBeNull();
});
