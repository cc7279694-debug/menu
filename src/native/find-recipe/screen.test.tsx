import "fake-indexeddb/auto";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { fakeAi, output, deferred } from "../ai/service.test-support";
import { FindRecipeService } from "./service";
import { FindRecipeScreen } from "./screen";
afterEach(__resetLocalDatabaseForTests);
function fixture() {
  const store = new PreviewRecipeLibrary(), fake = fakeAi(), ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const candidate = { id: "c1", title: "家常啤酒鸭", sourceUrl: "https://example.com/r", sourceHost: "example.com", summary: "先煸后焖", highlights: ["清晰步骤"], totalMinutes: null, preparationHint: "" };
  const port = { createSession: vi.fn(async () => ({ sessionId: crypto.randomUUID() })), search: vi.fn(async () => ({ candidates: [candidate] })), extract: vi.fn(async () => ({ rawJson: output(), sourceText: "啤酒鸭" })), cancel: vi.fn(async () => {}), discardSession: vi.fn(async () => {}) };
  return { port, ai, store, service: new FindRecipeService({ port, ai }) };
}
function mount(service: FindRecipeService) { const onCancel = vi.fn(), onSaved = vi.fn(), onFallback = vi.fn(); render(<FindRecipeScreen service={service} active onCancel={onCancel} onSaved={onSaved} onConfigureKey={vi.fn()} onFallback={onFallback}/>); return { onCancel, onSaved, onFallback }; }
it("explicit search shows candidates; explicit choice enters existing Review with required confirmation", async () => {
  const { service, port, ai } = fixture(); mount(service); fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "啤酒鸭" } });
  expect(port.search).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  await screen.findByText("家常啤酒鸭"); expect(screen.queryByText(/分钟/)).not.toBeInTheDocument(); expect(port.extract).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "按这个做法整理" })); await screen.findByRole("heading", { name: "检查 AI 整理结果" });
  expect(ai.snapshot().confirmed).toBe(false); fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" })); expect(ai.snapshot().phase).toBe("preview");
});
it("results Back preserves query and preference without a Provider retry", async () => {
  const { service, port } = fixture(), { onCancel } = mount(service); fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "啤酒鸭" } }); fireEvent.change(screen.getByLabelText("偏好（可选）"), { target: { value: "少油" } });
  fireEvent.click(screen.getByRole("button", { name: "开始寻找" })); await screen.findByText("家常啤酒鸭");
  window.dispatchEvent(new Event("recipio:back", { cancelable: true })); await waitFor(() => expect(screen.getByLabelText("想做什么菜")).toHaveValue("啤酒鸭")); expect(screen.getByLabelText("偏好（可选）")).toHaveValue("少油"); expect(onCancel).not.toHaveBeenCalled(); expect(port.search).toHaveBeenCalledTimes(1);
});
it("zero results exposes all manual exits and no fabricated candidate", async () => {
  const { service, port } = fixture(); port.search.mockResolvedValueOnce({ candidates: [] }); mount(service); fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "鸭" } }); fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  await screen.findByText("暂时没有找到适合整理的公开菜谱。"); expect(screen.queryByRole("button", { name: "按这个做法整理" })).not.toBeInTheDocument();
  for (const name of ["重新寻找", "改用文字 / 截图", "从网页链接导入", "手动录入"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
});
it("busy Back confirms cancellation and repeated Back never creates another request", async () => {
  const { service, port } = fixture(), waiting = deferred<Awaited<ReturnType<typeof port.search>>>(); port.search.mockReturnValueOnce(waiting.promise); mount(service);
  fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "鸭" } }); fireEvent.click(screen.getByRole("button", { name: "开始寻找" })); await waitFor(() => expect(port.search).toHaveBeenCalledTimes(1));
  window.dispatchEvent(new Event("recipio:back", { cancelable: true })); await screen.findByRole("dialog"); window.dispatchEvent(new Event("recipio:back", { cancelable: true })); expect(port.search).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "取消请求" })); await screen.findByRole("button", { name: "开始寻找" }); expect(port.cancel).toHaveBeenCalledTimes(1);
});
it("same-turn repeated input Back leaves once without double navigation", async () => {
  const { service } = fixture(), { onCancel } = mount(service);
  window.dispatchEvent(new Event("recipio:back", { cancelable: true })); window.dispatchEvent(new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
});
