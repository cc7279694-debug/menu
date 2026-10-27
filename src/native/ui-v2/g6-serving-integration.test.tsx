import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests, getLocalDatabase } from "@/features/offline/local-db";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails, type RecipeDetails } from "../recipe-model";

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await __resetLocalDatabaseForTests();
});

async function fixture(servings: number | null = 3, title = "合成份量鸡翅") {
  const store = new PreviewRecipeLibrary();
  const recipe = await store.createDetails({
    ...emptyDetails(title), servings,
    ingredients: [
      { name: "鸡翅", amount: "600 克" }, { name: "可乐", amount: "330 毫升" },
      { name: "鸡蛋", amount: "2 个" }, { name: "盐", amount: "适量" },
      { name: "酱汁", amount: "1袋（约200克）" },
    ],
    preparations: [{ instruction: "提前把鸡翅擦干", minutes: null, timingText: "一会儿" }],
    keyTips: [{ instruction: "收汁时留意锅底", stepNumber: 2 }],
    steps: [
      { instruction: "焯水 2 分钟", imagePath: null },
      { instruction: "加入可乐后慢煮 10 分钟", imagePath: null },
    ],
  });
  const fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  return { store, recipe, fake, element: <LibraryApp store={store} ai={ai} /> };
}

async function openRecipe(title: string) {
  fireEvent.click((await screen.findAllByRole("button", { name: `打开 ${title}` }))[0]);
  await screen.findByRole("heading", { name: title });
}

function setTarget(value: string, container: HTMLElement = document.body) {
  const input = within(container).getByLabelText("本次做几人份");
  fireEvent.change(input, { target: { value } });
  return input;
}

function ingredient(name: string, container: HTMLElement = document.body) {
  const term = within(container).getByText(name, { selector: "dt" });
  const row = term.closest("div");
  if (!row) throw new Error(`Missing visible ingredient row: ${name}`);
  return within(row);
}

it("actual detail scales supported amounts, preserves free text and restores the original serving size", async () => {
  const app = await fixture();
  render(app.element); await openRecipe(app.recipe.title);
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("3");
  expect(screen.getByText(/原始.*3.*人份/)).toBeVisible();
  expect(screen.getByText("仅调整本次查看，不修改原菜谱")).toBeVisible();
  setTarget("2");
  expect(ingredient("鸡翅").getByText("400 克")).toBeVisible();
  expect(ingredient("可乐").getByText("220 毫升")).toBeVisible();
  expect(ingredient("鸡蛋").getByText("约 1.33 个")).toBeVisible();
  expect(ingredient("盐").getByText("适量")).toBeVisible();
  expect(ingredient("酱汁").getByText("1袋（约200克）")).toBeVisible();
  expect(screen.getByText("焯水 2 分钟")).toBeVisible();
  const status = screen.getByRole("status", { name: "本次份量" });
  expect(status).toHaveTextContent("2 人份");
  expect(status).not.toHaveTextContent(/鸡翅|400|可乐|220/);
  fireEvent.click(screen.getByRole("button", { name: "恢复原始份数" }));
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("3");
  expect(ingredient("鸡翅").getByText("600 克")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "减少本次份数" }));
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("2");
  fireEvent.click(screen.getByRole("button", { name: "增加本次份数" }));
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("3");
});

it("decimal serving buttons preserve the exact decimal target and do not invent approximate amounts", async () => {
  const app = await fixture(); render(app.element); await openRecipe(app.recipe.title);
  setTarget("2.3");
  fireEvent.click(screen.getByRole("button", { name: "减少本次份数" }));
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("1.3");
  expect(ingredient("鸡翅").getByText("260 克")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "增加本次份数" }));
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("2.3");
  expect(ingredient("鸡翅").getByText("460 克")).toBeVisible();
});

it.each([
  ["Guided", "开始引导烹饪", "引导烹饪"],
  ["Focus", "放大步骤 2", "单步查看"],
] as const)("actual %s reference sheet shares the target and Back preserves the current step", async (_mode, entry, name) => {
  const app = await fixture();
  render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  fireEvent.click(screen.getByRole("button", { name: entry }));
  const viewer = screen.getByRole("dialog", { name });
  if (_mode === "Guided") fireEvent.click(within(viewer).getByRole("button", { name: "下一步" }));
  expect(within(viewer).getByText("加入可乐后慢煮 10 分钟")).toBeVisible();
  fireEvent.click(within(viewer).getByRole("button", { name: "查看食材" }));
  const sheet = screen.getByRole("dialog", { name: "食材" });
  expect(within(sheet).getByLabelText("本次做几人份")).toHaveValue("2");
  expect(ingredient("鸡翅", sheet).getByText("400 克")).toBeVisible();
  expect(within(sheet).getByText("提前把鸡翅擦干")).toBeVisible();
  expect(within(sheet).getByText(/收汁时留意锅底/)).toBeVisible();
  expect(within(sheet).queryByRole("checkbox")).not.toBeInTheDocument();
  setTarget("1.5", sheet);
  expect(ingredient("鸡翅", sheet).getByText("300 克")).toBeVisible();
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "食材" })).not.toBeInTheDocument());
  expect(screen.getByRole("dialog", { name })).toBe(viewer);
  expect(within(viewer).getByText("第 2 步／共 2 步")).toBeVisible();
  expect(within(viewer).getByText("加入可乐后慢煮 10 分钟")).toBeVisible();
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("1.5");
  expect(ingredient("可乐").getByText("165 毫升")).toBeVisible();
  expect(await app.store.listCookingRecords(app.recipe.id)).toEqual([]);
});

it("empty, intermediate and invalid targets retain the last valid amount with an associated explanation", async () => {
  const app = await fixture(); render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  for (const value of ["", ".", "1.", "0", "-1", "10000.1", "1e3", "Infinity"]) {
    const input = setTarget(value);
    expect(input).toHaveValue(value);
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(/0\.1.*10000/);
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
    expect(ingredient("鸡翅").getByText("400 克")).toBeVisible();
    expect(screen.getByRole("status", { name: "本次份量" })).toHaveTextContent("2 人份");
  }
  const input = setTarget("0.1");
  expect(input).not.toHaveAttribute("aria-invalid", "true");
  expect(ingredient("鸡翅").getByText("20 克")).toBeVisible();
  setTarget("0.125");
  expect(ingredient("鸡翅").getByText("25 克")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("a missing real denominator explains how to fill it without inventing one serving", async () => {
  const app = await fixture(null); render(app.element); await openRecipe(app.recipe.title);
  expect(screen.getByText(/先.*编辑.*原始份数/)).toBeVisible();
  const input = screen.queryByLabelText("本次做几人份");
  if (input) expect(input).toBeDisabled();
  expect(screen.queryByText(/原始.*1.*人份/)).not.toBeInTheDocument();
  expect(ingredient("鸡翅").getByText("600 克")).toBeVisible();
  expect(await app.store.getDetails(app.recipe.id)).toMatchObject({ servings: null });
});

it("leaving and reopening or choosing a different recipe creates a fresh original target", async () => {
  const app = await fixture();
  await app.store.createDetails({ ...emptyDetails("合成四人汤"), servings: 4, ingredients: [{ name: "水", amount: "800 毫升" }] });
  render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  fireEvent.click(screen.getByRole("button", { name: "返回菜谱库" }));
  await openRecipe("合成四人汤");
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("4");
  setTarget("1");
  fireEvent.click(screen.getByRole("button", { name: "返回菜谱库" }));
  await openRecipe(app.recipe.title);
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("3");
  expect(ingredient("鸡翅").getByText("600 克")).toBeVisible();
  setTarget("2"); cleanup(); render(app.element); await openRecipe(app.recipe.title);
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("3");
});

it("edit cancellation and both related history returns retain the temporary target", async () => {
  const app = await fixture(); render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  fireEvent.click(screen.getByRole("button", { name: "编辑菜谱" }));
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "不保存的合成备注" } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(await screen.findByLabelText("本次做几人份")).toHaveValue("2");
  for (const entry of ["查看做菜记录", "查看修改记录"]) {
    fireEvent.click(screen.getByRole("button", { name: entry }));
    const back = await screen.findByRole("button", { name: "返回菜谱" });
    await waitFor(() => expect(back).toBeEnabled());
    fireEvent.click(back);
    expect(await screen.findByLabelText("本次做几人份")).toHaveValue("2");
    expect(ingredient("鸡翅").getByText("400 克")).toBeVisible();
  }
  expect((await app.store.getDetails(app.recipe.id))?.notes).toBe("");
  expect(await app.store.listRecipeChanges(app.recipe.id)).toEqual([]);
});

it("a successful edit resets to the latest real servings and amounts", async () => {
  const app = await fixture(); render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  fireEvent.click(screen.getByRole("button", { name: "编辑菜谱" }));
  fireEvent.change(screen.getByLabelText("约几人份"), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("用量 1"), { target: { value: "1200 克" } });
  fireEvent.click(screen.getByRole("button", { name: "快速保存菜谱" }));
  expect(await screen.findByLabelText("本次做几人份")).toHaveValue("6");
  expect(ingredient("鸡翅").getByText("1200 克")).toBeVisible();
  setTarget("3");
  expect(ingredient("鸡翅").getByText("600 克")).toBeVisible();
  expect(await app.store.getDetails(app.recipe.id)).toMatchObject({ servings: 6, ingredients: [{ name: "鸡翅", amount: "1200 克" }, ...app.recipe.ingredients.slice(1)] });
});

function deepFreezeRecipe(recipe: RecipeDetails): RecipeDetails {
  Object.freeze(recipe.ingredients.map(item => Object.freeze(item)));
  Object.freeze(recipe.ingredients);
  Object.freeze(recipe.steps.map(item => Object.freeze(item)));
  Object.freeze(recipe.steps);
  Object.freeze(recipe.preparations.map(item => Object.freeze(item)));
  Object.freeze(recipe.preparations);
  Object.freeze(recipe.keyTips.map(item => Object.freeze(item)));
  Object.freeze(recipe.keyTips);
  return Object.freeze(recipe);
}

it("adjustment never mutates the loaded recipe or writes business data, browser storage or history", async () => {
  const app = await fixture();
  const original = await app.store.getDetails(app.recipe.id);
  const db = await getLocalDatabase();
  const before = await Promise.all(db.tables.map(table => table.toArray()));
  const read = app.store.getDetails.bind(app.store);
  vi.spyOn(app.store, "getDetails").mockImplementation(async id => {
    const value = await read(id); return value ? deepFreezeRecipe(value) : null;
  });
  const save = vi.spyOn(app.store, "saveDetails"), record = vi.spyOn(app.store, "recordCooking"),
    update = vi.spyOn(app.store, "updateCookingRecord"), create = vi.spyOn(app.store, "createDetails"),
    remove = vi.spyOn(app.store, "remove"), storage = vi.spyOn(Storage.prototype, "setItem"),
    fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network in serving adjustment"));
  render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  fireEvent.click(screen.getByRole("button", { name: "开始引导烹饪" }));
  fireEvent.click(screen.getByRole("button", { name: "查看食材" }));
  setTarget("1.5", screen.getByRole("dialog", { name: "食材" }));
  fireEvent.click(screen.getByRole("button", { name: "恢复原始份数" }));
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "食材" })).not.toBeInTheDocument());
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(await app.store.getDetails(app.recipe.id)).toEqual(original);
  expect(await Promise.all(db.tables.map(table => table.toArray()))).toEqual(before);
  for (const write of [save, record, update, create, remove, storage, fetch, app.fake.bridge.organize]) expect(write).not.toHaveBeenCalled();
  expect(await app.store.listCookingRecords(app.recipe.id)).toEqual([]);
  expect(await app.store.listRecipeChanges(app.recipe.id)).toEqual([]);
});

it("changing servings is read-only until explicit kitchen completion records exactly once", async () => {
  const app = await fixture(); const record = vi.spyOn(app.store, "recordCooking"), update = vi.spyOn(app.store, "updateCookingRecord");
  render(app.element); await openRecipe(app.recipe.title); setTarget("2");
  fireEvent.click(screen.getByRole("button", { name: "开始引导烹饪" }));
  fireEvent.click(screen.getByRole("button", { name: "查看食材" }));
  setTarget("1.5", screen.getByRole("dialog", { name: "食材" }));
  expect(record).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "食材" })).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "下一步" }));
  const finish = screen.getByRole("button", { name: "完成这道菜" });
  fireEvent.click(finish); fireEvent.click(finish);
  await screen.findByRole("heading", { name: "已记录做过这道菜" });
  expect(record).toHaveBeenCalledOnce(); expect(update).not.toHaveBeenCalled();
  const saved = await app.store.listCookingRecords(app.recipe.id);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ recipeId: app.recipe.id, evaluation: null, note: null, finishedPhotoPath: null });
  expect(await app.store.getDetails(app.recipe.id)).toEqual(app.recipe);
});
