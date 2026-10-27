import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { AiIntakeScreen } from "../ai/intake-screen";
import { AiPreview } from "../ai/preview";
import { AI_LIMITS } from "../ai/contract";
import { AiIntakeService } from "../ai/service";
import { fakeAi, reviewDraft } from "../ai/service.test-support";
import { PreviewRecipeLibrary } from "../preview-store";
import { V2AppearanceProvider } from "./appearance";

afterEach(async () => {
  cleanup();
  await __resetLocalDatabaseForTests();
});

function intake() {
  const fake = fakeAi();
  const service = new AiIntakeService(fake.keys, fake.bridge, { store: new PreviewRecipeLibrary() });
  render(<V2AppearanceProvider theme="warm-ivory" solid={false}>
    <AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={vi.fn()} onConfigureKey={vi.fn()} />
  </V2AppearanceProvider>);
  return { service, ...fake };
}

it("G5 AI text retains over-limit input and identifies its existing length gate accessibly", async () => {
  const { service, bridge } = intake();
  await waitFor(() => expect(service.snapshot().operationId).not.toBeNull());
  const text = screen.getByLabelText("菜谱文字");
  const source = "🥬".repeat(AI_LIMITS.textCodePoints + 1);
  fireEvent.change(text, { target: { value: source } });
  expect(text).toHaveValue(source);
  expect(text).toHaveAttribute("aria-invalid", "true");
  expect(text).toHaveAccessibleDescription(new RegExp(`${AI_LIMITS.textCodePoints + 1} / ${AI_LIMITS.textCodePoints}`));
  expect(screen.getByRole("button", { name: "开始 AI 整理" })).toBeDisabled();
  expect(bridge.organize).not.toHaveBeenCalled();
});

it("G5 image technical limits can be opened without hiding privacy or losing source text", async () => {
  const { service, bridge } = intake();
  await waitFor(() => expect(service.snapshot().operationId).not.toBeNull());
  fireEvent.change(screen.getByLabelText("菜谱文字"), { target: { value: "测试菜谱文字" } });
  const limits = screen.getByText(/每张原图不超过/);
  expect(limits).not.toBeVisible();
  expect(screen.getByText(/截图不会成为菜谱图片，也不会进入备份/)).toBeVisible();
  expect(screen.getByText(/可能产生 API 费用/)).toBeVisible();
  fireEvent.click(screen.getByText("图片格式与大小"));
  expect(limits).toBeVisible();
  expect(screen.getByLabelText("菜谱文字")).toHaveValue("测试菜谱文字");
  expect(service.snapshot().input.text).toBe("测试菜谱文字");
  expect(bridge.organize).not.toHaveBeenCalled();
});

it("G5 safe request failure is associated with the retained source field without automatic retry", async () => {
  const { service, bridge } = intake();
  bridge.organize.mockRejectedValueOnce({ code: "network_unavailable" });
  await waitFor(() => expect(service.snapshot().operationId).not.toBeNull());
  const text = screen.getByLabelText("菜谱文字");
  fireEvent.change(text, { target: { value: "生成测试：清炒青菜" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "开始 AI 整理" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "开始 AI 整理" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("AI 整理需要联网，已有菜谱仍可正常使用。");
  expect(text).toHaveAccessibleDescription(/AI 整理需要联网，已有菜谱仍可正常使用。/);
  expect(text).toHaveValue("生成测试：清炒青菜");
  expect(screen.getByRole("button", { name: "重试 AI 整理" })).toBeEnabled();
  expect(bridge.organize).toHaveBeenCalledTimes(1);
});

it("G5 review checkbox explains the mandatory check without letting edits bypass confirmation", () => {
  const confirm = vi.fn(), save = vi.fn(async () => {});
  render(<V2AppearanceProvider theme="pure-glass" solid>
    <AiPreview draft={reviewDraft()} confirmed={false} onConfirmedChange={confirm} onSave={save} onCancel={vi.fn()} />
  </V2AppearanceProvider>);
  const checkbox = screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" });
  expect(checkbox).toHaveAccessibleDescription("请先检查并确认推断和缺失内容，再保存菜谱。");
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "我的清汤做法" } });
  expect(checkbox).not.toBeChecked();
  expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeDisabled();
  expect(confirm).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
