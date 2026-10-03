import React from "react";
import { DatabaseSync } from "node:sqlite";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RecipeNames } from "./app";
import { RecipeNameStore, schemaStatements } from "./recipe-store";

const databases = [];
afterEach(() => {
  cleanup();
  databases.splice(0).forEach((db) => db.close());
});
function renderApp() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  schemaStatements.forEach((sql) => db.exec(sql));
  const store = new RecipeNameStore({
    query: async (sql, values = []) => db.prepare(sql).all(...values),
    run: async (sql, values = []) =>
      Number(db.prepare(sql).run(...values).changes),
  });
  render(React.createElement(RecipeNames, { store }));
  return store;
}

it("creates, opens, renames, searches, deletes and undoes using the real SQLite store", async () => {
  const store = renderApp();
  fireEvent.change(screen.getByLabelText("菜名"), {
    target: { value: "啤酒鸭" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存菜名" }));
  const duck = await screen.findByRole("button", { name: "啤酒鸭" });
  fireEvent.click(duck);
  fireEvent.click(screen.getByRole("button", { name: "修改名称" }));
  fireEvent.change(screen.getByLabelText("菜名"), {
    target: { value: "家常啤酒鸭" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存菜名" }));
  await screen.findByRole("button", { name: "家常啤酒鸭" });
  fireEvent.change(screen.getByLabelText("找到一道菜"), {
    target: { value: "无匹配" },
  });
  await screen.findByText("没有找到这道菜，可以先记下名称。");
  fireEvent.change(screen.getByLabelText("找到一道菜"), {
    target: { value: "鸭" },
  });
  await screen.findByRole("button", { name: "家常啤酒鸭" });
  fireEvent.click(screen.getByRole("button", { name: "删除 家常啤酒鸭" }));
  await screen.findByRole("button", { name: "撤销" });
  await waitFor(async () => expect(await store.list()).toEqual([]));
  fireEvent.click(screen.getByRole("button", { name: "撤销" }));
  await screen.findByRole("button", { name: "家常啤酒鸭" });
  expect((await store.list())[0].title).toBe("家常啤酒鸭");
});

it("keeps unsaved input when persistence fails", async () => {
  const store = renderApp();
  store.create = async () => {
    throw new Error("磁盘写入失败");
  };
  fireEvent.change(screen.getByLabelText("菜名"), {
    target: { value: "啤酒鸭" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存菜名" }));
  await screen.findByText("磁盘写入失败");
  expect(screen.getByLabelText("菜名").value).toBe("啤酒鸭");
});
