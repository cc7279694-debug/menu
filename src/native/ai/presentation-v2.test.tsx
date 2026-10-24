import "fake-indexeddb/auto";
import { createRef } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { V2AppearanceProvider } from "../ui-v2/appearance";
import { AiIntakeScreen } from "./intake-screen";
import { AiPreview } from "./preview";
import { AiReviewPanel } from "./review-panel";
import { AiSaveRecovery } from "./save-recovery";
import { AiIntakeService } from "./service";
import { deferred, fakeAi, reviewDraft } from "./service.test-support";

afterEach(__resetLocalDatabaseForTests);
function intake() {
  const fake = fakeAi(), store = new PreviewRecipeLibrary();
  return { ...fake, store, service: new AiIntakeService(fake.keys, fake.bridge, { store }) };
}
const wrap = (children: React.ReactNode) => <V2AppearanceProvider theme="soft-sage" solid={false}>{children}</V2AppearanceProvider>;

it("task input keeps fees visible and text local until an explicit request", async () => {
  const { service, bridge } = intake();
  render(wrap(<AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={vi.fn()} onConfigureKey={vi.fn()} />));
  expect(screen.getByRole("heading", { name: "整理菜谱" })).toBeInTheDocument();
  expect(screen.getByText(/可能产生 API 费用/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("菜谱文字"), { target: { value: "GENERATED 姜汤\n姜适量" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "开始 AI 整理" })).toBeEnabled());
  expect(bridge.organize).not.toHaveBeenCalled();
});

it("temporary screenshot preview uses current theme and Back closes only that view", async () => {
  const { service, bridge } = intake();
  render(wrap(<AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={vi.fn()} onConfigureKey={vi.fn()} />));
  const add = screen.getByRole("button", { name: "添加截图" });
  await waitFor(() => expect(add).toBeEnabled()); fireEvent.click(add);
  await screen.findByAltText("截图 1");
  const ids = service.snapshot().input.imageIds;
  fireEvent.click(screen.getByRole("button", { name: "预览截图 1" }));
  const dialog = await screen.findByRole("dialog", { name: "查看截图" });
  expect(dialog.closest("[data-v2-theme]")).toHaveAttribute("data-v2-theme", "soft-sage");
  expect(within(dialog).getByAltText("本轮截图 1")).toBeInTheDocument();
  window.dispatchEvent(new Event("recipio:back", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByText("放弃本轮整理？")).not.toBeInTheDocument();
  expect(service.snapshot().input.imageIds).toEqual(ids);
  expect(bridge.organize).not.toHaveBeenCalled(); expect(bridge.discardSession).not.toHaveBeenCalled();
});

it("review blocks both visible saves and forged submit until the full acknowledgement", () => {
  const save = vi.fn(async () => {});
  const view = render(wrap(<AiPreview draft={reviewDraft()} confirmed={false} onConfirmedChange={vi.fn()} onSave={save} onCancel={vi.fn()} />));
  expect(screen.getByRole("heading", { name: "检查整理结果" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "检查整理结果" }).compareDocumentPosition(screen.getByText(/截图只是本轮识别来源/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(view.container.querySelector("form")).toHaveClass("v2-production-form");
  expect(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" })).not.toBeChecked();
  expect(screen.getByRole("button", { name: "快速保存菜谱" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeDisabled();
  fireEvent.submit(view.container.querySelector("form")!);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("region", { name: "AI 整理审核" })).toHaveFocus();
});

it("review summary exposes source states without relying on colour, preserving manual-source labels", () => {
  render(<AiReviewPanel draft={reviewDraft()} confirmed={false} onConfirmedChange={vi.fn()} alertRef={createRef()} />);
  const summary = screen.getByLabelText("审核状态统计");
  expect(summary).toHaveTextContent("来源明确 1");
  expect(summary).toHaveTextContent("AI 推断 1");
  expect(summary).toHaveTextContent("缺失待确认 1");
  expect(screen.getByText(/手动修改不会自动变成/)).toBeInTheDocument();
});

it("same-title decision portal is themed and cancel leaves the edited input intact", async () => {
  const save = vi.fn(async () => {});
  render(wrap(<AiPreview draft={reviewDraft()} confirmed onConfirmedChange={vi.fn()} hasExactTitle={async () => true} onSave={save} onCancel={vi.fn()} />));
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "GENERATED 同名汤" } });
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  const dialog = await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  expect(dialog).toHaveAttribute("data-v2-theme", "soft-sage");
  fireEvent.click(within(dialog).getByRole("button", { name: "返回检查" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByLabelText("菜名")).toHaveValue("GENERATED 同名汤"); expect(save).not.toHaveBeenCalled();
});

it("review location focuses the actual array field or missing-section action without editing or confirming", () => {
  const draft = reviewDraft(); draft.recipe.ingredients = [{ name: "姜", amount: "适量" }];
  draft.review.fieldChecks = [{ path: "ingredients[0].amount", label: "食材1用量", status: "inferred", message: "请核对用量" }, { path: "steps", label: "步骤未提供", status: "missing", message: "请补充" }];
  const save = vi.fn(async () => {}), confirm = vi.fn();
  render(wrap(<AiPreview draft={draft} confirmed={false} onConfirmedChange={confirm} onSave={save} onCancel={vi.fn()} />));
  fireEvent.click(screen.getByRole("button", { name: "定位食材1用量" }));
  expect(screen.getByLabelText("用量 1")).toHaveFocus(); expect(screen.getByLabelText("用量 1")).toHaveValue("适量");
  fireEvent.click(screen.getByRole("button", { name: "定位步骤未提供" }));
  expect(screen.getByRole("button", { name: "添加步骤" })).toHaveFocus();
  expect(screen.queryByLabelText("步骤 1")).not.toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
});

it("uncertain save recovery remains read-only by the original ID in the V2 task", async () => {
  const { service, store } = intake(); await service.startSession(); await service.organize({ text: "测试汤", imageIds: [] }); service.setConfirmed(true);
  const original = store.createDetails.bind(store);
  const create = vi.spyOn(store, "createDetails").mockImplementationOnce(async (...args) => { await original(...args); throw new Error("lost acknowledgement"); });
  vi.spyOn(store, "getDetails").mockRejectedValueOnce(new Error("read unavailable"));
  await expect(service.save(service.snapshot().draft!.recipe)).rejects.toMatchObject({ code: "save_uncertain" });
  const saved = vi.fn(), view = render(wrap(<AiSaveRecovery service={service} onSaved={saved} onAbsent={vi.fn()} onLibrary={vi.fn()} />));
  expect(view.container.querySelector("section")).toHaveClass("v2-task");
  fireEvent.click(screen.getByRole("button", { name: "核对保存结果" }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(create).toHaveBeenCalledTimes(1);
  expect(saved.mock.calls[0][0].id).toBe(create.mock.calls[0][1]);
});

it("cancel-in-progress disables repeated cancel and never restarts a paid request", async () => {
  const { service, bridge } = intake(), pending = deferred<{ rawJson: string }>(), cancelled = deferred<void>();
  bridge.organize.mockReturnValueOnce(pending.promise); bridge.cancel.mockReturnValueOnce(cancelled.promise);
  render(wrap(<AiIntakeScreen service={service} onPreview={vi.fn()} onCancel={vi.fn()} onConfigureKey={vi.fn()} />));
  await waitFor(() => expect(service.snapshot().operationId).not.toBeNull());
  fireEvent.change(screen.getByLabelText("菜谱文字"), { target: { value: "GENERATED 姜汤" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "开始 AI 整理" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "开始 AI 整理" }));
  await waitFor(() => expect(bridge.organize).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "取消请求" }));
  expect(await screen.findByRole("button", { name: "正在取消…" })).toBeDisabled();
  cancelled.resolve(); pending.reject({ code: "cancelled" });
  await waitFor(() => expect(screen.queryByRole("button", { name: "正在取消…" })).not.toBeInTheDocument());
  expect(bridge.organize).toHaveBeenCalledOnce();
});
