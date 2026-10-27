import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { RecipeEditor } from "../recipe-editor";
import { emptyDetails } from "../recipe-model";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { fakeAi } from "../ai/service.test-support";

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await __resetLocalDatabaseForTests(); });

it("failed manual save focuses its explanation while retaining the actual draft for retry", async () => {
  const onSave = vi.fn().mockRejectedValueOnce(new Error("本机空间不足，请整理空间后重试"))
    .mockResolvedValueOnce(undefined);
  render(<RecipeEditor appearance="v2" onSave={onSave} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "菜名" }), { target: { value: "自己调整的鸡翅 🍗" } });
  fireEvent.change(screen.getByRole("textbox", { name: "个人备注" }), { target: { value: "下次少放糖，保留原来的做法。" } });
  fireEvent.click(screen.getByRole("button", { name: "保存菜谱" }));
  const error = await screen.findByRole("alert");
  expect(error).toHaveTextContent("本机空间不足");
  await waitFor(() => expect(error).toHaveFocus());
  expect(screen.getByRole("textbox", { name: "菜名" })).toHaveValue("自己调整的鸡翅 🍗");
  expect(screen.getByRole("textbox", { name: "个人备注" })).toHaveValue("下次少放糖，保留原来的做法。");
  fireEvent.click(screen.getByRole("button", { name: "保存菜谱" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1][0]).toMatchObject({ title: "自己调整的鸡翅 🍗", notes: "下次少放糖，保留原来的做法。" });
});

it("add choices explain offline versus online without changing their existing accessible names", async () => {
  const store = new PreviewRecipeLibrary();
  await store.createDetails(emptyDetails("本机测试菜谱"));
  const fake = fakeAi(); const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  render(<LibraryApp store={store} ai={ai} />);
  fireEvent.click(await screen.findByRole("button", { name: "新增菜谱" }));
  const sheet = screen.getByRole("dialog", { name: "添加菜谱" });
  const manual = within(sheet).getByRole("button", { name: "手动录入" });
  expect(manual).toHaveAccessibleDescription("无需联网，先记菜名即可");
  expect(within(sheet).getByRole("button", { name: "AI 整理" }))
    .toHaveAccessibleDescription("文字或截图，由你确认后开始整理");
  expect(within(sheet).getByRole("button", { name: "从网页链接导入" })).toBeEnabled();
  expect(within(sheet).getByRole("button", { name: "帮我找做法" })).toBeEnabled();
  expect(fake.bridge.organize).not.toHaveBeenCalled();
});
