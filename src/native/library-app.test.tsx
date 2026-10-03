import "fake-indexeddb/auto";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
import { LibraryApp } from "./library-app";
afterEach(__resetLocalDatabaseForTests);
beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
it("routes native back from detail to list and guards unsaved editor input", async () => {
  const store = new PreviewRecipeLibrary();
  await store.create("原生返回验证");
  render(<LibraryApp store={store} />);
  fireEvent.click(await screen.findByRole("button", { name: "打开 原生返回验证" }, { timeout: 5000 }));
  await screen.findByRole("button", { name: "编辑菜谱" });
  const detailBack = new Event("recipio:back", { cancelable: true });
  fireEvent(window, detailBack);
  await screen.findByRole("button", { name: "打开 原生返回验证" });
  expect(detailBack.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "打开 原生返回验证" }));
  fireEvent.click(await screen.findByRole("button", { name: "编辑菜谱" }));
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "未保存的输入" } });
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
