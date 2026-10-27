import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { image } from "../ai/service.test-support";
import { aiImagePreviewUri } from "../ai/native-bridge";
import { V2AppearanceProvider } from "../ui-v2/appearance";
import type { IntakeSourceContext } from "./source-context";
import { IntakeSourcePanel } from "./source-panel";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const wrap = (children: React.ReactNode) => <V2AppearanceProvider theme="soft-sage" solid={false}>{children}</V2AppearanceProvider>;
function textSource(text = "提供的做法\n盐适量 🥬"): IntakeSourceContext {
  return { kind: "ai-input", identity: {}, isCurrent: () => true, text, images: [], operationId: crypto.randomUUID() };
}
function Harness({ source }: { source: IntakeSourceContext | null }) {
  const [open, setOpen] = useState(false);
  return <><label>当前编辑<input defaultValue="已经修改的菜名" /></label><button onClick={() => setOpen(true)}>查看本轮来源</button><IntakeSourcePanel source={source} open={open} onOpenChange={setOpen} /></>;
}

it("T07 source text is rendered literally and cannot execute HTML or load embedded remote resources", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const malicious = '<script>window.__g7source = true</script><img src="https://untrusted.example/a.jpg">盐适量';
  render(wrap(<IntakeSourcePanel source={textSource(malicious)} open onOpenChange={vi.fn()} />));
  const dialog = await screen.findByRole("dialog", { name: "本轮来源" });
  expect(within(dialog).getByText(malicious)).toBeVisible();
  expect(dialog.querySelector("script,img,iframe,a")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("T07 web AI keeps cleaned text and actual truncation separate from the AI result", async () => {
  const source: IntakeSourceContext = { kind: "web-ai", identity: {}, isCurrent: () => true, visible: { title: "原网页标题", text: "仅清洗后的网页文字", wasTruncated: true }, selected: null };
  render(wrap(<IntakeSourcePanel source={source} open onOpenChange={vi.fn()} />));
  const dialog = await screen.findByRole("dialog", { name: "本轮来源" });
  expect(within(dialog).getByText("仅清洗后的网页文字")).toBeVisible();
  expect(within(dialog).getByText(/正文过长.*部分/)).toBeVisible();
  expect(within(dialog).getByText(/网页文字.*AI 整理结果.*不同/)).toBeVisible();
});

it("T07 Finder labels selected title, site and summary as metadata with no retained body", async () => {
  const source: IntakeSourceContext = { kind: "finder", identity: {}, isCurrent: () => true, selected: { title: "选定汤", sourceHost: "cook.example.org", summary: "摘要只是候选信息" } };
  render(wrap(<IntakeSourcePanel source={source} open onOpenChange={vi.fn()} />));
  const dialog = await screen.findByRole("dialog", { name: "本轮来源" });
  expect(within(dialog).getByText("选定汤")).toBeVisible(); expect(within(dialog).getByText("cook.example.org")).toBeVisible();
  expect(within(dialog).getByText("摘要只是候选信息")).toBeVisible();
  expect(within(dialog).getByText("本轮选定来源信息，非完整正文。")).toBeVisible();
  expect(within(dialog).getByText("本轮未保留来源正文。")).toBeVisible();
  expect(within(dialog).getByText(/候选摘要.*不是.*逐字/)).toBeVisible();
});

it("T08 loss of session validity removes old text immediately and asks the existing owner to close", async () => {
  let current = true;
  const source: IntakeSourceContext = { ...textSource("失效后不可出现的旧文字"), isCurrent: () => current }, close = vi.fn();
  const view = render(wrap(<IntakeSourcePanel source={source} open onOpenChange={close} />));
  await screen.findByText("失效后不可出现的旧文字");
  current = false; view.rerender(wrap(<IntakeSourcePanel source={source} open onOpenChange={close} />));
  expect(screen.queryByText("失效后不可出现的旧文字")).not.toBeInTheDocument();
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
});

it("T08 a replacement result cannot reuse the previous open source panel", async () => {
  const close = vi.fn(), old = textSource("上一轮来源"), replacement = textSource("另一轮来源");
  const view = render(wrap(<IntakeSourcePanel source={old} open onOpenChange={close} />));
  await screen.findByText("上一轮来源");
  view.rerender(wrap(<IntakeSourcePanel source={replacement} open onOpenChange={close} />));
  expect(screen.queryByText("上一轮来源")).not.toBeInTheDocument();
  expect(screen.queryByText("另一轮来源")).not.toBeInTheDocument();
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
});

it("T08 null or already stale contexts cannot flash retained source content", () => {
  const close = vi.fn(), source = { ...textSource("旧轮来源"), isCurrent: () => false };
  const view = render(wrap(<IntakeSourcePanel source={source} open onOpenChange={close} />));
  expect(screen.queryByText("旧轮来源")).not.toBeInTheDocument(); expect(close).toHaveBeenCalledWith(false);
  view.rerender(wrap(<IntakeSourcePanel source={null} open onOpenChange={close} />));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("T07 temporary screenshot enlargement stays in the same sheet and uses the existing preview method", async () => {
  const operationId = crypto.randomUUID(), first = image(operationId), second = image(operationId);
  const source: IntakeSourceContext = { ...textSource(), kind: "ai-input", text: "", operationId, images: [first, second] };
  render(wrap(<IntakeSourcePanel source={source} open onOpenChange={vi.fn()} />));
  const dialog = await screen.findByRole("dialog", { name: "本轮来源" });
  expect(within(dialog).getByRole("heading", { name: "本轮提供的截图" })).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "查看截图 2" }));
  expect(within(dialog).getByAltText("本轮截图 2")).toHaveAttribute("src", aiImagePreviewUri(second));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});

it.each(["https://untrusted.example/image.jpg", "file:///data/images/a.jpg", "file:///data/user/0/app.recipio.local/cache/ai-import/other-session/image.jpg"])("T07 unsafe or unowned screenshot URI is unavailable without fallback: %s", async previewUri => {
  const operationId = crypto.randomUUID(), screenshot = { ...image(operationId), previewUri };
  const source: IntakeSourceContext = { ...textSource(), kind: "ai-input", text: "", operationId, images: [screenshot] };
  render(wrap(<IntakeSourcePanel source={source} open onOpenChange={vi.fn()} />));
  const dialog = await screen.findByRole("dialog", { name: "本轮来源" });
  expect(within(dialog).getByText("截图暂不可用。")).toBeVisible();
  expect(dialog.querySelector("img")).toBeNull();
});

it("T07 failed controlled image load stays unavailable instead of trying another source", async () => {
  const operationId = crypto.randomUUID(), screenshot = image(operationId);
  const source: IntakeSourceContext = { ...textSource(), kind: "ai-input", text: "", operationId, images: [screenshot] };
  render(wrap(<IntakeSourcePanel source={source} open onOpenChange={vi.fn()} />));
  const preview = await screen.findByAltText("本轮截图 1");
  fireEvent.error(preview);
  expect(screen.getByText("图片暂不可用")).toBeVisible(); expect(screen.queryByAltText("本轮截图 1")).not.toBeInTheDocument();
});

it("T06 T12 existing sheet close restores focus and leaves edited input unchanged without source writes", async () => {
  const fetch = vi.fn(), setItem = vi.spyOn(Storage.prototype, "setItem"); vi.stubGlobal("fetch", fetch);
  render(wrap(<Harness source={textSource()} />));
  const trigger = screen.getByRole("button", { name: "查看本轮来源" }); trigger.focus(); fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "本轮来源" });
  expect(dialog.closest("[data-v2-theme]")).toHaveAttribute("data-v2-theme", "soft-sage");
  fireEvent.click(within(dialog).getByRole("button", { name: "关闭本轮来源" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.getByLabelText("当前编辑")).toHaveValue("已经修改的菜名");
  expect(fetch).not.toHaveBeenCalled(); expect(setItem).not.toHaveBeenCalled();
});

it("T13 page Back is consumed by the existing sheet and closes only the reference panel", async () => {
  render(wrap(<Harness source={textSource()} />));
  fireEvent.click(screen.getByRole("button", { name: "查看本轮来源" }));
  await screen.findByRole("dialog", { name: "本轮来源" });
  const event = new Event("recipio:back", { cancelable: true }); window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByLabelText("当前编辑")).toHaveValue("已经修改的菜名");
});
