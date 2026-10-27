import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { deferred, fakeAi, output } from "../ai/service.test-support";
import { V2AppearanceProvider, type V2Theme } from "../ui-v2/appearance";
import { createFinderPort, type NativeFinderApi } from "./native-bridge";
import type { RecipeCandidate } from "./contract";
import { FindRecipeService } from "./service";
import { FindRecipeScreen } from "./screen";

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await __resetLocalDatabaseForTests(); });

function fixture() {
  const store = new PreviewRecipeLibrary(), fake = fakeAi();
  const ai = new AiIntakeService(fake.keys, fake.bridge, { store });
  const candidates: RecipeCandidate[] = [
    { id: "pan", title: "家常啤酒鸭", sourceUrl: "https://example.com/recipes/duck?temporary=source", sourceHost: "example.com", summary: "先煸后焖", highlights: ["收汁后出锅"], totalMinutes: 45, preparationHint: "鸭肉提前焯水" },
    { id: "pot", title: "砂锅啤酒鸭", sourceUrl: "https://example.org/duck", sourceHost: "example.org", summary: "砂锅慢焖", highlights: ["小火焖煮"], totalMinutes: null, preparationHint: "" },
    { id: "quick", title: "快手啤酒鸭", sourceUrl: "https://example.net/duck", sourceHost: "example.net", summary: "切小块快炒", highlights: [], totalMinutes: 30, preparationHint: "" },
  ];
  const native = {
    createSession: vi.fn(async () => ({ sessionId: crypto.randomUUID() })),
    search: vi.fn<NativeFinderApi["search"]>(async () => ({ candidates })),
    extract: vi.fn<NativeFinderApi["extract"]>(async () => ({ rawJson: output(), sourceText: "啤酒鸭" })),
    cancel: vi.fn(async () => ({})), discardSession: vi.fn(async () => ({})),
  } satisfies NativeFinderApi;
  const service = new FindRecipeService({ port: createFinderPort(native), ai });
  const onSaved = vi.fn(), onCancel = vi.fn(), onConfigureKey = vi.fn(), onFallback = vi.fn();
  const view = (theme: V2Theme = "warm-ivory", active = true) => <V2AppearanceProvider theme={theme} solid={theme === "soft-sage"}><FindRecipeScreen service={service} active={active} onSaved={onSaved} onCancel={onCancel} onConfigureKey={onConfigureKey} onFallback={onFallback}/></V2AppearanceProvider>;
  return { service, ai, store, fake, native, candidates, view, onSaved, onCancel, onConfigureKey };
}

it.each<V2Theme>(["warm-ivory", "pure-glass", "soft-sage"])("cancellation portal follows %s and keeps the current query and explicit request", async theme => {
  const f = fixture(), reply = deferred<{ candidates: RecipeCandidate[] }>();
  f.native.search.mockReturnValueOnce(reply.promise);
  const mounted = render(f.view());
  fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "啤酒鸭" } });
  fireEvent.change(screen.getByLabelText("偏好（可选）"), { target: { value: "少油" } });
  fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  await screen.findByRole("status");
  mounted.rerender(f.view(theme));
  expect(screen.getByLabelText("想做什么菜")).toHaveValue("啤酒鸭");
  expect(screen.getByLabelText("偏好（可选）")).toHaveValue("少油");
  fireEvent.click(screen.getByRole("button", { name: "返回" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveClass("recipio-ui-v2", "v2-themed-dialog");
  expect(dialog).toHaveAttribute("data-v2-theme", theme);
  expect(dialog).toHaveAttribute("data-v2-solid", String(theme === "soft-sage"));
  fireEvent.click(within(dialog).getByRole("button", { name: "取消请求" }));
  await screen.findByRole("button", { name: "开始寻找" });
  await act(async () => reply.resolve({ candidates: f.candidates }));
  expect(f.service.snapshot()).toMatchObject({ phase: "input", dish: "啤酒鸭", preference: "少油", candidates: [] });
  expect(f.native.search).toHaveBeenCalledTimes(1);
  expect(f.native.extract).not.toHaveBeenCalled();
});

it("the selected real source alone announces extraction while three source cards retain verified fields", async () => {
  const f = fixture(), reply = deferred<{ rawJson: string; sourceText: string }>();
  f.native.extract.mockReturnValueOnce(reply.promise);
  const mounted = render(f.view());
  fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "啤酒鸭" } });
  expect(f.native.search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  await screen.findByText("家常啤酒鸭");
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(3);
  expect(screen.getByText("来源：example.com")).toBeInTheDocument();
  expect(screen.getByText("来源耗时：45 分钟")).toBeInTheDocument();
  expect(screen.getByText("来源提前准备：鸭肉提前焯水")).toBeInTheDocument();
  expect(screen.getByText("收汁后出锅")).toBeInTheDocument();
  expect(document.body.textContent).not.toContain("https://");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(f.native.extract).not.toHaveBeenCalled();
  fireEvent.click(within(cards[1]).getByRole("button", { name: "按这个做法整理" }));
  await waitFor(() => expect(f.native.extract).toHaveBeenCalledTimes(1));
  expect(cards[1]).toHaveAttribute("aria-busy", "true");
  expect(cards[0]).not.toHaveAttribute("aria-busy", "true");
  expect(cards[2]).not.toHaveAttribute("aria-busy", "true");
  expect(within(cards[1]).getByText("已选定 · 正在整理")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("正在整理：砂锅啤酒鸭 · example.org");
  expect(f.native.extract.mock.calls[0][0]).toMatchObject({ candidateId: "pot" });
  mounted.rerender(f.view("pure-glass", false));
  mounted.rerender(f.view("soft-sage", true));
  expect(screen.getAllByRole("article")[1]).toHaveAttribute("aria-busy", "true");
  fireEvent.click(screen.getByRole("button", { name: "取消请求" }));
  await waitFor(() => expect(f.service.snapshot().phase).toBe("results"));
  await act(async () => reply.resolve({ rawJson: output(), sourceText: "啤酒鸭" }));
  expect(f.ai.snapshot().draft).toBeNull();
  expect(f.native.search).toHaveBeenCalledTimes(1);
  expect(f.native.extract).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("article")).toHaveLength(3);
  expect(screen.queryByText("已选定 · 正在整理")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("已取消请求。");
});

it("code point limits keep overlong text visible but stop paid search and expose field-linked counts", () => {
  const f = fixture(); render(f.view());
  const dish = screen.getByLabelText("想做什么菜"), preference = screen.getByLabelText("偏好（可选）");
  fireEvent.change(dish, { target: { value: "鸭".repeat(121) } });
  expect(dish).toHaveValue("鸭".repeat(121));
  expect(dish).toHaveAttribute("aria-invalid", "true");
  expect(dish).toHaveAccessibleDescription("菜名 121/120");
  expect(screen.getByRole("button", { name: "开始寻找" })).toBeDisabled();
  fireEvent.change(dish, { target: { value: "🥬".repeat(120) } });
  expect(dish).toHaveAccessibleDescription("菜名 120/120");
  expect(screen.getByRole("button", { name: "开始寻找" })).toBeEnabled();
  fireEvent.change(preference, { target: { value: "🥬".repeat(501) } });
  expect(preference).toHaveAccessibleDescription("偏好 501/500");
  expect(preference).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("button", { name: "开始寻找" })).toBeDisabled();
  expect(f.native.search).not.toHaveBeenCalled(); expect(f.native.extract).not.toHaveBeenCalled();
});

it("missing-key settings round trip retains input and requires another explicit search", async () => {
  const f = fixture(); f.native.search.mockRejectedValueOnce({ code: "key_missing", message: "private diagnostic" });
  const mounted = render(f.view());
  fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "啤酒鸭" } });
  fireEvent.change(screen.getByLabelText("偏好（可选）"), { target: { value: "少油" } });
  fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("请先在设置中配置本机 AI 密钥。");
  fireEvent.click(screen.getByRole("button", { name: "前往设置 AI 密钥" }));
  expect(f.onConfigureKey).toHaveBeenCalledOnce();
  mounted.rerender(f.view("soft-sage", false)); mounted.rerender(f.view("pure-glass", true));
  expect(screen.getByLabelText("想做什么菜")).toHaveValue("啤酒鸭");
  expect(screen.getByLabelText("偏好（可选）")).toHaveValue("少油");
  expect(f.native.search).toHaveBeenCalledTimes(1); expect(f.native.extract).not.toHaveBeenCalled();
  expect(document.body.textContent).not.toContain("private diagnostic");
});

it("unreadable selected source keeps all candidates and exposes retry only through explicit choice", async () => {
  const f = fixture(); f.native.extract.mockRejectedValueOnce({ code: "source_mismatch", message: "private url" });
  render(f.view());
  fireEvent.change(screen.getByLabelText("想做什么菜"), { target: { value: "啤酒鸭" } });
  fireEvent.click(screen.getByRole("button", { name: "开始寻找" }));
  await screen.findByText("家常啤酒鸭");
  fireEvent.click(screen.getAllByRole("button", { name: "按这个做法整理" })[1]);
  expect(await screen.findByRole("alert")).toHaveTextContent("这个来源暂时无法读取。");
  expect(screen.getAllByRole("article")).toHaveLength(3);
  for (const button of screen.getAllByRole("button", { name: "按这个做法整理" })) expect(button).toBeEnabled();
  expect(f.ai.snapshot().draft).toBeNull(); expect(f.native.extract).toHaveBeenCalledTimes(1);
  expect(f.native.search).toHaveBeenCalledTimes(1); expect(document.body.textContent).not.toContain("private url");
});

it("uncertain save offers only recovery and checks the original recipe instead of creating again", async () => {
  const f = fixture(), originalCreate = f.store.createDetails.bind(f.store);
  const create = vi.spyOn(f.store, "createDetails").mockImplementationOnce(async (...args) => { await originalCreate(...args); throw new Error("lost acknowledgement"); });
  const get = vi.spyOn(f.store, "getDetails").mockRejectedValueOnce(new Error("temporary read failure"));
  f.service.updateInput("啤酒鸭", ""); await f.service.search(); await f.service.extract("pan");
  f.ai.setConfirmed(true);
  await expect(f.service.save(f.ai.snapshot().draft!.recipe)).rejects.toMatchObject({ code: "save_uncertain" });
  render(f.view("soft-sage"));
  expect(screen.getByRole("heading", { name: "先核对保存结果" })).toBeInTheDocument();
  expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual(["核对保存结果"]);
  const back = new Event("recipio:back", { cancelable: true }); fireEvent(window, back);
  expect(back.defaultPrevented).toBe(true); expect(f.onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "核对保存结果" }));
  await waitFor(() => expect(f.onSaved).toHaveBeenCalledOnce());
  expect(create).toHaveBeenCalledTimes(1);
  const id = create.mock.calls[0][1];
  expect(get.mock.calls.map(args => args[0])).toEqual([id, id]);
  expect(f.onSaved.mock.calls[0][0].id).toBe(id);
  expect((await f.store.list()).map(recipe => recipe.id)).toEqual([id]);
});
