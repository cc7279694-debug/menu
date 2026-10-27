import "fake-indexeddb/auto";
import { useState, type ComponentProps, type ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AiPreview } from "../ai/preview";
import type { AiReviewDraft } from "../ai/contract";
import { deferred, reviewDraft } from "../ai/service.test-support";
import { emptyDetails } from "../recipe-model";
import { V2AppearanceProvider } from "../ui-v2/appearance";
import type { IntakeSourceContext } from "./source-context";

// These optional integration ports are exercised against the real preview even
// before its implementation grows them; a missing UI behavior must cause RED.
type PreviewProps = ComponentProps<typeof AiPreview> & {
  sourceContext?: IntakeSourceContext | null;
  isCurrent?: () => boolean;
};
const Preview: ComponentType<PreviewProps> = AiPreview;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function explicitDraft(title = "合成清汤"): AiReviewDraft {
  return freeze({
    recipe: emptyDetails(title),
    review: {
      fieldChecks: [{ path: "title", label: "菜名", status: "explicit", message: null }],
      requiresConfirmation: false,
    },
    warnings: [],
  });
}

function Harness({ initialConfirmed = false, ...props }: Omit<PreviewProps, "confirmed" | "onConfirmedChange"> & {
  initialConfirmed?: boolean;
  onConfirmedChange?: (value: boolean) => void;
}) {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  return <V2AppearanceProvider theme="warm-ivory" solid={false}>
    <Preview {...props} confirmed={confirmed} onConfirmedChange={next => {
      setConfirmed(next);
      props.onConfirmedChange?.(next);
    }} />
  </V2AppearanceProvider>;
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function originalReviewRow(label: string) {
  const expand = screen.queryByRole("button", { name: "查看完整来源审核" });
  if (expand) fireEvent.click(expand);
  const review = screen.getByRole("region", { name: "AI 整理审核" });
  const row = within(review).getByText(label, { selector: "strong" }).closest("li");
  if (!row) throw new Error(`Missing original review row: ${label}`);
  return row;
}

const confirmationName = "我已检查以上 AI 推断和缺失内容";

it("T01/T02/T03 current draft counts update and legal free text stays optional until explicit save", async () => {
  const draft = explicitDraft();
  const save = vi.fn(async () => {});
  render(<Harness draft={draft} onSave={save} onCancel={vi.fn()} />);
  const report = screen.getByRole("region", { name: "当前草稿检查" });
  expect(within(report).getByRole("heading", { name: "检查提示" })).toBeVisible();
  expect(report).toHaveTextContent("食材 0 项 · 步骤 0 步 · 原始份量未填写");
  expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeEnabled();
  change("约几人份", "3");
  fireEvent.click(screen.getByRole("button", { name: "添加食材" }));
  change("食材 1", "盐");
  change("用量 1", "适量");
  fireEvent.click(screen.getByRole("button", { name: "添加食材" }));
  change("食材 2", "酱汁");
  change("用量 2", "半勺或1～2勺");
  fireEvent.click(screen.getByRole("button", { name: "添加步骤" }));
  change("步骤 1", "按实际口味调味后煮熟");
  expect(report).toHaveTextContent("食材 2 项 · 步骤 1 步 · 原始 3 人份");
  expect(report).not.toHaveTextContent("原始份量未填写");
  expect(screen.getByLabelText("用量 1")).toHaveValue("适量");
  expect(screen.getByLabelText("用量 2")).toHaveValue("半勺或1～2勺");
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0]).toEqual([{
    title: "合成清汤", totalMinutes: null, servings: 3, caloriesPerServing: null,
    coverPath: null, notes: "", ingredients: [{ name: "盐", amount: "适量" }, { name: "酱汁", amount: "半勺或1～2勺" }],
    steps: [{ instruction: "按实际口味调味后煮熟", imagePath: null }], preparations: [], keyTips: [],
  }]);
  expect(draft.recipe).toEqual(emptyDetails("合成清汤"));
});

it("T01 a title-only draft can still save while all local suggestions remain visible", async () => {
  const save = vi.fn(async () => {});
  render(<Harness draft={explicitDraft("只记菜名")} onSave={save} onCancel={vi.fn()} />);
  expect(screen.getByRole("region", { name: "当前草稿检查" })).toHaveTextContent("食材 0 项 · 步骤 0 步 · 原始份量未填写");
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(emptyDetails("只记菜名")));
});

it("T04 manual edits retain inferred/missing evidence and mark changed explicit values as unverified", () => {
  const draft: AiReviewDraft = freeze({
    recipe: { ...emptyDetails("原菜名"), ingredients: [{ name: "酱汁", amount: "20 毫升" }] },
    review: {
      fieldChecks: [
        { path: "title", label: "菜名", status: "explicit", message: "本轮原文菜名" },
        { path: "ingredients[0].amount", label: "酱汁用量", status: "inferred", message: "原结果为推断用量" },
        { path: "servings", label: "份数", status: "missing", message: "原来源未提供人数" },
      ],
      requiresConfirmation: true,
    },
    warnings: [],
  });
  const original = JSON.stringify(draft);
  render(<Harness draft={draft} onSave={vi.fn(async () => {})} onCancel={vi.fn()} />);
  change("菜名", "人工更改的菜名");
  change("用量 1", "15 毫升");
  change("约几人份", "3");
  expect(screen.getByLabelText("审核状态统计")).toHaveTextContent("来源明确 1 · AI 推断 1 · 缺失待确认 1");
  expect(originalReviewRow("菜名")).toHaveTextContent(/已编辑|人工修改/);
  expect(originalReviewRow("菜名")).toHaveTextContent(/未.*核对|未.*核实/);
  expect(originalReviewRow("酱汁用量")).toHaveTextContent("原结果为推断用量");
  expect(originalReviewRow("酱汁用量")).toHaveTextContent("已编辑");
  expect(originalReviewRow("份数")).toHaveTextContent("原来源未提供人数");
  expect(originalReviewRow("份数")).toHaveTextContent("已填写");
  expect(screen.getByRole("region", { name: "当前草稿检查" })).toHaveTextContent("原始 3 人份");
  expect(screen.getByRole("checkbox", { name: confirmationName })).not.toBeChecked();
  expect(JSON.stringify(draft)).toBe(original);
});

it("T05 source locators follow stable rows through duplicate names, reorder and removal", () => {
  const draft: AiReviewDraft = freeze({
    recipe: {
      ...emptyDetails("同名行定位夹具"),
      ingredients: [{ name: "酱汁", amount: "10 毫升" }, { name: "酱汁", amount: "20 毫升" }],
      steps: [{ instruction: "先焯水", imagePath: null }, { instruction: "后收汁", imagePath: null }],
      keyTips: [{ instruction: "收汁时看锅底", stepNumber: 2 }],
    },
    review: {
      fieldChecks: [
        { path: "ingredients[1].amount", label: "第二条用量", status: "inferred", message: "需核对后加入的酱汁" },
        { path: "steps[1].instruction", label: "收汁步骤", status: "inferred", message: "需核对收汁描述" },
      ],
      requiresConfirmation: true,
    },
    warnings: [],
  });
  render(<Harness draft={draft} onSave={vi.fn(async () => {})} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "上移食材 2" }));
  expect(screen.getByLabelText("用量 1")).toHaveValue("20 毫升");
  fireEvent.click(within(originalReviewRow("第二条用量")).getByRole("button", { name: "定位第二条用量" }));
  expect(screen.getByLabelText("用量 1")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "上移步骤 2" }));
  expect(screen.getByLabelText("关联步骤 1（可选）")).toHaveValue(1);
  fireEvent.click(within(originalReviewRow("收汁步骤")).getByRole("button", { name: "定位收汁步骤" }));
  expect(screen.getByLabelText("步骤 1")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "移除食材 1" }));
  fireEvent.click(screen.getByRole("button", { name: "移除步骤 1" }));
  fireEvent.click(screen.getByRole("button", { name: "添加食材" }));
  change("食材 2", "酱汁");
  change("用量 2", "30 毫升");
  expect(screen.getByLabelText("用量 1")).toHaveValue("10 毫升");
  expect(screen.getByLabelText("步骤 1")).toHaveValue("先焯水");
  expect(screen.getByLabelText("关联步骤 1（可选）")).toHaveValue(null);
  for (const label of ["第二条用量", "收汁步骤"]) {
    expect(originalReviewRow(label)).toHaveTextContent("原条目已移除");
    expect(within(originalReviewRow(label)).queryByRole("button", { name: `定位${label}` })).not.toBeInTheDocument();
  }
  expect(draft.recipe.ingredients[1].amount).toBe("20 毫升");
  expect(draft.recipe.keyTips[0].stepNumber).toBe(2);
});

it("T06/T09 source close and consumed Back retain edits, confirmation and the parent draft", async () => {
  const draft = freeze(reviewDraft());
  const source: IntakeSourceContext = {
    kind: "ai-input", identity: {}, isCurrent: () => true,
    text: "合成本轮来源文字，不写入正式菜谱", images: [], operationId: crypto.randomUUID(),
  };
  const save = vi.fn(async () => {}), cancel = vi.fn(), confirm = vi.fn();
  render(<Harness draft={draft} sourceContext={source} onSave={save} onCancel={cancel} onConfirmedChange={confirm} />);
  change("菜名", "编辑后的清汤");
  change("约几人份", "3");
  change("个人备注", "已经写好的合成备注😊");
  fireEvent.click(screen.getByRole("checkbox", { name: confirmationName }));
  expect(screen.getByRole("checkbox", { name: confirmationName })).toBeChecked();
  confirm.mockClear();
  const opener = screen.getByRole("button", { name: "查看本轮来源" });
  for (const close of ["button", "back"] as const) {
    opener.focus();
    fireEvent.click(opener);
    const sheet = screen.getByRole("dialog", { name: "本轮来源" });
    expect(within(sheet).getByText("合成本轮来源文字，不写入正式菜谱")).toBeVisible();
    if (close === "button") fireEvent.click(within(sheet).getByRole("button", { name: "关闭本轮来源" }));
    else fireEvent(window, new Event("recipio:back", { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "本轮来源" })).not.toBeInTheDocument());
    expect(screen.getByLabelText("菜名")).toHaveValue("编辑后的清汤");
    expect(screen.getByLabelText("约几人份")).toHaveValue(3);
    expect(screen.getByLabelText("个人备注")).toHaveValue("已经写好的合成备注😊");
    expect(screen.getByRole("checkbox", { name: confirmationName })).toBeChecked();
    await waitFor(() => expect(opener).toHaveFocus());
  }
  expect(confirm).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
});

it("T09 only a real changed value revokes a previous acknowledgement and keeps the save gate closed", async () => {
  const save = vi.fn(async () => {}), confirm = vi.fn();
  const draft = freeze(reviewDraft());
  const view = render(<Harness draft={draft} initialConfirmed onSave={save} onCancel={vi.fn()} onConfirmedChange={confirm} />);
  const checkbox = screen.getByRole("checkbox", { name: confirmationName });
  const title = screen.getByLabelText("菜名");
  title.focus();
  fireEvent.focus(title);
  fireEvent.blur(title);
  const expand = screen.queryByRole("button", { name: "查看完整来源审核" });
  if (expand) fireEvent.click(expand);
  fireEvent.click(screen.getByText("AI 推断 1"));
  change("菜名", "啤酒鸭");
  expect(checkbox).toBeChecked();
  expect(confirm).not.toHaveBeenCalled();
  change("菜名", "自己调整的啤酒鸭");
  expect(checkbox).not.toBeChecked();
  expect(confirm).toHaveBeenCalledOnce();
  expect(confirm).toHaveBeenCalledWith(false);
  expect(screen.getByRole("button", { name: "快速保存菜谱" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeDisabled();
  fireEvent.submit(view.container.querySelector("form")!);
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0]).toEqual([{ ...emptyDetails("自己调整的啤酒鸭") }]);
});

it("T10 exact-title checks use the final title; returning keeps the draft and accepting creates once", async () => {
  const hasExactTitle = vi.fn(async () => true), save = vi.fn(async () => {});
  render(<Harness draft={explicitDraft("初始菜名")} hasExactTitle={hasExactTitle} onSave={save} onCancel={vi.fn()} />);
  change("菜名", "  最终同名菜谱  ");
  change("个人备注", "返回检查后仍保留");
  expect(hasExactTitle).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  const duplicate = await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  expect(hasExactTitle).toHaveBeenCalledWith("最终同名菜谱");
  expect(duplicate).toHaveTextContent(/新建另一条.*不覆盖或合并原菜谱/);
  fireEvent.click(within(duplicate).getByRole("button", { name: "返回检查" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "确认保存菜谱" })).toBeEnabled());
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByLabelText("菜名")).toHaveValue("  最终同名菜谱  ");
  expect(screen.getByLabelText("个人备注")).toHaveValue("返回检查后仍保留");
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  const second = await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  const accept = within(second).getByRole("button", { name: "仍然新建菜谱" });
  fireEvent.click(accept);
  fireEvent.click(accept);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0]).toEqual([{ ...emptyDetails("最终同名菜谱"), notes: "返回检查后仍保留" }]);
  expect(hasExactTitle).toHaveBeenCalledTimes(2);
});

it("T10 query failure stays closed and preserves current input for an explicit retry", async () => {
  const hasExactTitle = vi.fn(async () => false).mockRejectedValueOnce(new Error("合成查询失败"));
  const save = vi.fn(async () => {});
  render(<Harness draft={explicitDraft()} hasExactTitle={hasExactTitle} onSave={save} onCancel={vi.fn()} />);
  change("菜名", "出错后保留的标题");
  change("个人备注", "尚未保存的备注");
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("同名检查未完成");
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByLabelText("菜名")).toHaveValue("出错后保留的标题");
  expect(screen.getByLabelText("个人备注")).toHaveValue("尚未保存的备注");
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(hasExactTitle).toHaveBeenCalledTimes(2);
});

it.each(["unmounted", "invalidated"] as const)("T08/T11 late title lookup cannot save an %s preview", async lifecycle => {
  const query = deferred<boolean>();
  const hasExactTitle = vi.fn(() => query.promise), save = vi.fn(async () => {});
  let current = true;
  const view = render(<Harness draft={explicitDraft()} isCurrent={() => current} hasExactTitle={hasExactTitle} onSave={save} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  await waitFor(() => expect(hasExactTitle).toHaveBeenCalledOnce());
  if (lifecycle === "unmounted") view.unmount();
  else current = false;
  await act(async () => { query.resolve(false); });
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog", { name: "已存在同名菜谱" })).not.toBeInTheDocument();
});

it("T08/T11 a pending duplicate decision cannot save after its owning session becomes invalid", async () => {
  let current = true;
  const save = vi.fn(async () => {});
  render(<Harness draft={explicitDraft()} isCurrent={() => current} hasExactTitle={async () => true} onSave={save} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "确认保存菜谱" }));
  const duplicate = await screen.findByRole("dialog", { name: "已存在同名菜谱" });
  current = false;
  await act(async () => { fireEvent.click(within(duplicate).getByRole("button", { name: "仍然新建菜谱" })); });
  expect(save).not.toHaveBeenCalled();
});
