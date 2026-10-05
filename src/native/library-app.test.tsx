import "fake-indexeddb/auto";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
import { LibraryApp } from "./library-app";
import { emptyDetails } from "./recipe-model";
import { AiIntakeService } from "./ai/service";
import { fakeAi } from "./ai/service.test-support";
import { LinkImportService } from "./link-import/service";
afterEach(__resetLocalDatabaseForTests);
beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
it("add menu opens independent link intake without touching AI or the database", async () => {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const port = { read: vi.fn(), cancel: vi.fn() }, link = new LinkImportService({ store, port, ai });
  render(<LibraryApp store={store} ai={ai} link={link} />);
  fireEvent.click(screen.getByRole("button", { name: "新增菜谱" })); fireEvent.click(await screen.findByRole("button", { name: "从网页链接导入" }));
  await screen.findByLabelText("网页链接"); expect(port.read).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled(); expect(await store.list()).toEqual([]);
});
it("add menu preserves manual entry and provides explicit AI path without sending on entry",async()=>{
  const store=new PreviewRecipeLibrary(),fake=fakeAi(),ai=new AiIntakeService(fake.keys,fake.bridge,{store});render(<LibraryApp store={store} ai={ai}/>);
  fireEvent.click(screen.getByRole("button",{name:"新增菜谱"}));expect(await screen.findByRole("button",{name:"手动录入"})).toBeInTheDocument();expect(screen.getByRole("button",{name:"AI 整理"})).toBeInTheDocument();expect(fake.bridge.organize).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"AI 整理"}));await screen.findByLabelText("菜谱文字");expect(fake.bridge.organize).not.toHaveBeenCalled();
});
it("AI settings detour and Preview renderer keep the same session without auto requests",async()=>{
  const store=new PreviewRecipeLibrary(),fake=fakeAi();fake.keys.hasAiKey.mockResolvedValue({configured:false});const ai=new AiIntakeService(fake.keys,fake.bridge,{store});render(<LibraryApp store={store} ai={ai}/>);
  fireEvent.click(screen.getByRole("button",{name:"新增菜谱"}));fireEvent.click(await screen.findByRole("button",{name:"AI 整理"}));await screen.findByLabelText("菜谱文字");fireEvent.change(screen.getByLabelText("菜谱文字"),{target:{value:"啤酒鸭"}});
  fireEvent.click(await screen.findByRole("button",{name:"前往设置 AI 密钥"}));await screen.findByText("未配置");fake.keys.hasAiKey.mockResolvedValue({configured:true});fireEvent.click(screen.getByRole("button",{name:"返回本轮 AI 整理"}));expect(await screen.findByLabelText("菜谱文字")).toHaveValue("啤酒鸭");expect(fake.bridge.organize).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button",{name:"开始 AI 整理"}));await screen.findByRole("heading",{name:"检查 AI 整理结果"});expect(ai.snapshot().draft?.recipe.title).toBe("啤酒鸭");expect(fake.bridge.discardSession).not.toHaveBeenCalled();
});
it("a delayed completion cannot navigate over an editor or history while its record is saving", async () => {
  const store = new PreviewRecipeLibrary(),
    r = await store.create("慢保存鸭"),
    original = store.recordCooking.bind(store);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(store, "recordCooking").mockImplementation(async (...args) => {
    await waiting;
    return original(...args);
  });
  render(<LibraryApp store={store} />);
  fireEvent.click(await screen.findByRole("button", { name: "打开 慢保存鸭" }));
  fireEvent.click(await screen.findByRole("button", { name: "完成这道菜" }));
  try {
    for (const name of [
      "编辑菜谱",
      "返回菜谱库",
      "删除这道菜",
      "查看修改记录",
      "查看做菜记录",
      "设置",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    fireEvent.click(screen.getByRole("button", { name: "编辑菜谱" }));
    expect(screen.queryByLabelText("菜名")).not.toBeInTheDocument();
  } finally {
    release();
  }
  await screen.findByRole("heading", { name: "已记录做过这道菜" });
  expect(await store.getCookingSummary(r.id)).toMatchObject({ count: 1 });
});
it("home last-cooked labels use actual records without changing creation order or library card layout", async () => {
  let time = Date.parse("2026-10-04T01:00:00.000Z");
  const store = new PreviewRecipeLibrary(() => new Date(time++)),
    old = await store.create("旧菜"),
    latest = await store.create("新菜");
  await store.recordCooking(old.id, "actual-record");
  render(<LibraryApp store={store} />);
  await screen.findByText(/上次做过：/);
  expect(
    screen
      .getAllByRole("button", { name: /打开 / })
      .map((e) => e.getAttribute("aria-label")),
  ).toEqual([`打开 ${latest.title}`, `打开 ${old.title}`]);
  fireEvent.click(screen.getByRole("button", { name: "我的菜谱" }));
  await screen.findByRole("heading", { name: "我的菜谱" });
  expect(screen.queryByText(/上次做过：/)).not.toBeInTheDocument();
});
it("browsing Focus/Guided never records cooking and Back restores the original trigger", async () => {
  const store = new PreviewRecipeLibrary(),
    r = await store.createDetails({
      ...emptyDetails("查看鸭"),
      steps: [
        { instruction: "洗净", imagePath: null },
        { instruction: "焖煮", imagePath: null },
      ],
    }),
    insert = vi.spyOn(store, "recordCooking");
  render(<LibraryApp store={store} />);
  fireEvent.click(await screen.findByRole("button", { name: "打开 查看鸭" }));
  await screen.findByRole("button", { name: "编辑菜谱" });
  const trigger = screen.getByRole("button", { name: "放大步骤 2" });
  trigger.focus();
  fireEvent.click(trigger);
  await screen.findByRole("dialog", { name: "单步查看" });
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(trigger).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: "开始引导烹饪" }));
  await screen.findByRole("dialog", { name: "引导烹饪" });
  fireEvent.click(screen.getByRole("button", { name: "退出引导" }));
  expect(insert).not.toHaveBeenCalled();
  expect(await store.getCookingSummary(r.id)).toMatchObject({ count: 0 });
});
it("explicit completion double click and retry after lost acknowledgment save one original record", async () => {
  const store = new PreviewRecipeLibrary(),
    r = await store.create("完成鸭"),
    original = store.recordCooking.bind(store);
  let lost = true;
  const insert = vi
    .spyOn(store, "recordCooking")
    .mockImplementation(async (id, operation) => {
      const saved = await original(id, operation);
      if (lost) {
        lost = false;
        throw new Error("提交响应丢失");
      }
      return saved;
    });
  render(<LibraryApp store={store} />);
  fireEvent.click(await screen.findByRole("button", { name: "打开 完成鸭" }));
  const complete = await screen.findByRole("button", { name: "完成这道菜" });
  fireEvent.click(complete);
  fireEvent.click(complete);
  await screen.findByText("提交响应丢失");
  const first = (await store.listCookingRecords(r.id))[0];
  fireEvent.click(screen.getByRole("button", { name: "完成这道菜" }));
  await screen.findByRole("heading", { name: "已记录做过这道菜" });
  expect(insert).toHaveBeenCalledTimes(2);
  expect(insert.mock.calls[0][1]).toBe(insert.mock.calls[1][1]);
  expect(await store.listCookingRecords(r.id)).toEqual([first]);
  fireEvent.click(screen.getByRole("button", { name: "完成并返回" }));
  await screen.findByRole("button", { name: "编辑菜谱" });
});
it("routes native back from detail to list and guards unsaved editor input", async () => {
  const store = new PreviewRecipeLibrary();
  await store.create("原生返回验证");
  render(<LibraryApp store={store} />);
  fireEvent.click(
    await screen.findByRole(
      "button",
      { name: "打开 原生返回验证" },
      { timeout: 5000 },
    ),
  );
  await screen.findByRole("button", { name: "编辑菜谱" });
  const detailBack = new Event("recipio:back", { cancelable: true });
  fireEvent(window, detailBack);
  await screen.findByRole("button", { name: "打开 原生返回验证" });
  expect(detailBack.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "打开 原生返回验证" }));
  fireEvent.click(await screen.findByRole("button", { name: "编辑菜谱" }));
  fireEvent.change(screen.getByLabelText("个人备注"), {
    target: { value: "未保存的输入" },
  });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const editBack = new Event("recipio:back", { cancelable: true });
  fireEvent(window, editBack);
  expect(editBack.defaultPrevented).toBe(true);
  expect(screen.getByLabelText("个人备注")).toHaveValue("未保存的输入");
  confirm.mockReturnValue(true);
  fireEvent(window, new Event("recipio:back", { cancelable: true }));
  await screen.findByRole("button", { name: "编辑菜谱" });
  expect((await store.list()).length).toBe(1);
});
it("can save a name without scrolling through optional fields", async () => {
  const store = new PreviewRecipeLibrary();
  render(<LibraryApp store={store} />);
  fireEvent.click(screen.getByRole("button", { name: "新增菜谱" }));
  fireEvent.click(await screen.findByRole("button",{name:"手动录入"}));
  fireEvent.change(screen.getByLabelText("菜名"), {
    target: { value: "绿豆汤" },
  });
  fireEvent.click(screen.getByRole("button", { name: "快速保存菜谱" }));
  await screen.findByRole("heading", { name: "绿豆汤" }, { timeout: 5000 });
  expect((await store.list())[0]?.title).toBe("绿豆汤");
});
it("creates a name-only recipe then edits ingredients, steps and notes and sees persisted detail", async () => {
  const store = new PreviewRecipeLibrary();
  render(<LibraryApp store={store} />);
  fireEvent.click(screen.getByRole("button", { name: "新增菜谱" }));
  fireEvent.click(await screen.findByRole("button",{name:"手动录入"}));
  fireEvent.change(screen.getByLabelText("菜名"), {
    target: { value: "啤酒鸭" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存菜谱" }));
  await screen.findByRole("heading", { name: "啤酒鸭" }, { timeout: 5000 });
  fireEvent.click(screen.getByRole("button", { name: "编辑菜谱" }));
  fireEvent.click(screen.getByRole("button", { name: "添加食材" }));
  fireEvent.change(screen.getByLabelText("食材 1"), {
    target: { value: "鸭肉" },
  });
  fireEvent.change(screen.getByLabelText("用量 1"), {
    target: { value: "500克" },
  });
  fireEvent.click(screen.getByRole("button", { name: "添加步骤" }));
  fireEvent.change(screen.getByLabelText("步骤 1"), {
    target: { value: "小火焖煮" },
  });
  fireEvent.change(screen.getByLabelText("个人备注"), {
    target: { value: "少放盐" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存菜谱" }));
  await screen.findByText("500克");
  await screen.findByText("小火焖煮");
  expect((await store.list())[0]?.title).toBe("啤酒鸭");
  expect((await store.getDetails((await store.list())[0].id))?.notes).toBe(
    "少放盐",
  );
});
it("does not lose unsaved input when a write fails", async () => {
  const store = new PreviewRecipeLibrary();
  const r = await store.create("鸭");
  render(<LibraryApp store={store} />);
  fireEvent.click(await screen.findByRole("button", { name: "打开 鸭" }));
  fireEvent.click(await screen.findByRole("button", { name: "编辑菜谱" }));
  store.saveDetails = async () => {
    throw new Error("磁盘空间不足");
  };
  fireEvent.change(screen.getByLabelText("个人备注"), {
    target: { value: "保留我的输入" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存菜谱" }));
  await screen.findByText("磁盘空间不足");
  expect(screen.getByLabelText("个人备注")).toHaveValue("保留我的输入");
  await waitFor(async () =>
    expect((await store.getDetails(r.id))?.notes).toBe(""),
  );
});
