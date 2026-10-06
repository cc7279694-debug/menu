import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { LibraryApp } from "../library-app";
import { AiIntakeService } from "../ai/service";
import { fakeAi, output } from "../ai/service.test-support";
import { FindRecipeService } from "./service";
afterEach(__resetLocalDatabaseForTests);
it("home typing stays local and Find entry itself sends zero paid requests", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store }); await store.create("本地啤酒鸭");
  const port = { createSession: vi.fn(async () => ({ sessionId: crypto.randomUUID() })), search: vi.fn(async () => ({ candidates: [] })), extract: vi.fn(async () => ({ rawJson: output(), sourceText: "" })), cancel: vi.fn(async () => {}), discardSession: vi.fn(async () => {}) }, finder = new FindRecipeService({ port, ai });
  render(<LibraryApp store={store} ai={ai} finder={finder}/>); fireEvent.change(screen.getByLabelText("搜索菜名或食材"), { target: { value: "啤酒鸭" } }); await screen.findByRole("button", { name: "打开 本地啤酒鸭" });
  expect(port.search).not.toHaveBeenCalled(); expect(fake.bridge.organize).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "帮我找『啤酒鸭』的做法" }));
  expect(await screen.findByLabelText("想做什么菜")).toHaveValue("啤酒鸭"); expect(port.search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "开始寻找" })); await screen.findByText("暂时没有找到适合整理的公开菜谱。"); expect(port.search).toHaveBeenCalledTimes(1);
});
