import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { emptyDetails } from "../recipe-model";

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await __resetLocalDatabaseForTests();
});

const sourceText = "合成来源清汤。酱汁10毫升，另有酱汁20毫升。煮熟。";

async function preview() {
  const store = new PreviewRecipeLibrary(), fake = fakeAi();
  fake.bridge.organize.mockResolvedValue({ rawJson: JSON.stringify({
    recipe: {
      ...emptyDetails("合成来源清汤"),
      ingredients: [{ name: "酱汁", amount: "10 毫升" }, { name: "酱汁", amount: "20 毫升" }],
      steps: [{ instruction: "煮熟", imagePath: null }],
    },
    fieldChecks: [
      { path: "title", label: "菜名", status: "explicit", message: "原菜名有来源" },
      { path: "ingredients[1].amount", label: "第二条用量", status: "inferred", message: "原结果的第二条用量需检查" },
      { path: "servings", label: "份数", status: "missing", message: "原文没有人数" },
    ],
    warnings: [],
  }) });
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  render(<LibraryApp store={store} ai={ai} aiKeys={fake.keys} />);
  fireEvent.click(await screen.findByRole("button", { name: "新增菜谱" }));
  fireEvent.click(screen.getByRole("button", { name: "AI 整理" }));
  fireEvent.change(await screen.findByLabelText("菜谱文字"), { target: { value: sourceText } });
  await waitFor(() => expect(screen.getByRole("button", { name: "开始 AI 整理" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "开始 AI 整理" }));
  await screen.findByRole("heading", { name: "检查整理结果" });
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "人工改名的合成清汤" } });
  fireEvent.change(screen.getByLabelText("约几人份"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "上移食材 2" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
  return { store, ai, fake };
}

function originalRow(label: string) {
  const expand = screen.queryByRole("button", { name: "查看完整来源审核" });
  if (expand) fireEvent.click(expand);
  const review = screen.getByRole("region", { name: "AI 整理审核" });
  const row = within(review).getByText(label, { selector: "strong" }).closest("li");
  if (!row) throw new Error(`Missing original review row: ${label}`);
  return row;
}

it("T04/T05/T11 absence recovery preserves original evidence and row bindings across the preview remount", async () => {
  const app = await preview();
  const originalCreate = app.store.createDetails.bind(app.store), originalRead = app.store.getDetails.bind(app.store);
  const create = vi.spyOn(app.store, "createDetails").mockRejectedValueOnce(new Error("Synthetic write not committed"))
    .mockImplementation(originalCreate);
  const read = vi.spyOn(app.store, "getDetails").mockRejectedValueOnce(new Error("Synthetic reconciliation I/O failure"))
    .mockImplementation(originalRead);
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await screen.findByRole("heading", { name: "先核对保存结果" });
  expect(app.ai.snapshot().phase).toBe("uncertain");
  expect(create).toHaveBeenCalledOnce();
  const attemptedId = create.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "核对保存结果" }));
  await screen.findByRole("heading", { name: "检查整理结果" });
  expect(read).toHaveBeenCalledWith(attemptedId);
  expect(create).toHaveBeenCalledOnce();
  expect(await app.store.list()).toEqual([]);
  expect(screen.getByLabelText("菜名")).toHaveValue("人工改名的合成清汤");
  expect(screen.getByLabelText("约几人份")).toHaveValue(3);
  expect(screen.getByLabelText("用量 1")).toHaveValue("20 毫升");
  expect(originalRow("菜名")).toHaveTextContent(/已编辑|人工修改/);
  expect(originalRow("菜名")).toHaveTextContent(/未.*核对|未.*核实/);
  expect(originalRow("份数")).toHaveTextContent("已填写");
  fireEvent.click(within(originalRow("食材2用量")).getByRole("button", { name: "定位食材2用量" }));
  expect(screen.getByLabelText("用量 1")).toHaveFocus();
  expect(app.fake.bridge.organize).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await screen.findByRole("heading", { name: "人工改名的合成清汤" });
  expect(create).toHaveBeenCalledTimes(2);
  expect(await app.store.list()).toHaveLength(1);
});

it("T11/T12/T14 committed uncertain recovery reads the original ID once and persists only an ordinary recipe", async () => {
  const app = await preview();
  const originalCreate = app.store.createDetails.bind(app.store), originalRead = app.store.getDetails.bind(app.store);
  const create = vi.spyOn(app.store, "createDetails").mockImplementationOnce(async (...args) => {
    await originalCreate(...args);
    throw new Error("Synthetic committed write lost its acknowledgement");
  }).mockImplementation(originalCreate);
  const read = vi.spyOn(app.store, "getDetails").mockRejectedValueOnce(new Error("Synthetic first reconciliation failure"))
    .mockImplementation(originalRead);
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await screen.findByRole("heading", { name: "先核对保存结果" });
  const creationId = create.mock.calls[0][1];
  expect(typeof creationId).toBe("string");
  fireEvent.click(screen.getByRole("button", { name: "核对保存结果" }));
  await screen.findByRole("heading", { name: "人工改名的合成清汤" });
  expect(create).toHaveBeenCalledOnce();
  expect(read).toHaveBeenCalledWith(creationId);
  const recipes = await app.store.list();
  expect(recipes).toHaveLength(1);
  expect(recipes[0].id).toBe(creationId);
  const saved = await originalRead(recipes[0].id);
  expect(saved).toMatchObject({
    title: "人工改名的合成清汤", servings: 3, coverPath: null, notes: "",
    ingredients: [{ name: "酱汁", amount: "20 毫升" }, { name: "酱汁", amount: "10 毫升" }],
    steps: [{ instruction: "煮熟", imagePath: null }],
  });
  expect(JSON.stringify(saved)).not.toMatch(/rowKey|originalRecipe|fieldBindings|fieldChecks|sourceText|previewUri|qualityReport|Provider/);
  expect(screen.getByLabelText("本次做几人份")).toHaveValue("3");
  expect(await app.store.listCookingRecords(recipes[0].id)).toEqual([]);
  expect(await app.store.listRecipeChanges(recipes[0].id)).toEqual([]);
  expect(app.fake.bridge.organize).toHaveBeenCalledOnce();
});
