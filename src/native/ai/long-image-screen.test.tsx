import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { V2AppearanceProvider } from "../ui-v2/appearance";
import { AiIntakeScreen } from "./intake-screen";
import { AiIntakeService } from "./service";
import { deferred, fakeAi, image } from "./service.test-support";
import type { AiTemporaryImage } from "./native-bridge";

afterEach(__resetLocalDatabaseForTests);
function fixture() {
  const fake = fakeAi(), pickLongImage = vi.fn(async ({ operationId }: { operationId: string }) => ({ cancelled: false, images: [image(operationId), image(operationId)] }));
  const bridge = { ...fake.bridge, pickLongImage }, service = new AiIntakeService(fake.keys, bridge, { store: new PreviewRecipeLibrary() });
  return { bridge, service, onCancel: vi.fn() };
}
it.each(["warm-ivory", "pure-glass", "soft-sage"] as const)("N2 %s exposes an explicit separate long-image picker, batch previews and no automatic AI", async theme => {
  const { bridge, service, onCancel } = fixture();
  render(<V2AppearanceProvider theme={theme} solid={false}><AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={onCancel} onConfigureKey={vi.fn()} /></V2AppearanceProvider>);
  const split = screen.getByRole("button", { name: "文字长图分段导入" });
  await waitFor(() => expect(split).toBeEnabled());
  expect(bridge.pickLongImage).not.toHaveBeenCalled(); expect(bridge.organize).not.toHaveBeenCalled();
  expect(screen.getByText(/分段计入本轮/)).toHaveTextContent("剩余 6 张");
  fireEvent.click(split); await screen.findByAltText("截图 2");
  expect(bridge.pickLongImage).toHaveBeenCalledOnce(); expect(bridge.pickImage).not.toHaveBeenCalled();
  expect(screen.getByText(/分段计入本轮/)).toHaveTextContent("剩余 4 张");
  expect(bridge.organize).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "前移截图 2" }));
  expect(service.snapshot().input.imageIds).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "移除截图 2" }));
  await waitFor(() => expect(service.snapshot().images).toHaveLength(1));
});
it("N2 processing still allows explicit session abandonment and rejects its late batch", async () => {
  const { bridge, service, onCancel } = fixture(), batch = deferred<{ cancelled: boolean; images: AiTemporaryImage[] }>();
  bridge.pickLongImage.mockReturnValueOnce(batch.promise);
  render(<AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={onCancel} onConfigureKey={vi.fn()} />);
  const split = screen.getByRole("button", { name: "文字长图分段导入" }); await waitFor(() => expect(split).toBeEnabled());
  const operationId = service.snapshot().operationId!; fireEvent.click(split);
  expect(screen.getByRole("button", { name: "开始 AI 整理" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "返回" }));
  fireEvent.click(await screen.findByRole("button", { name: "放弃本轮整理" }));
  await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
  batch.resolve({ cancelled: false, images: [image(operationId)] });
  await waitFor(() => expect(service.snapshot().imageBusy).toBe(false));
  expect(service.snapshot().images).toEqual([]); expect(bridge.organize).not.toHaveBeenCalled();
});
it("N2 retrying a failed long import clears its old error after a complete batch succeeds", async () => {
  const { bridge, service, onCancel } = fixture();
  bridge.pickLongImage.mockRejectedValueOnce({ code: "long_image_limit" });
  render(<AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={onCancel} onConfigureKey={vi.fn()} />);
  const split = screen.getByRole("button", { name: "文字长图分段导入" }); await waitFor(() => expect(split).toBeEnabled());
  fireEvent.click(split); expect(await screen.findByRole("alert")).toHaveTextContent("手动分图");
  fireEvent.click(split); await screen.findByAltText("截图 2");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument(); expect(bridge.organize).not.toHaveBeenCalled();
});
