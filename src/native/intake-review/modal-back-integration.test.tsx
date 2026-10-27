import { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RecipeEditor } from "../recipe-editor";
import { emptyDetails } from "../recipe-model";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

type ModalState = "none" | "open" | "closed" | "hidden";

function LaterModal({ state, onClose, onOwnedBack }: { state: ModalState; onClose: () => void; onOwnedBack: () => void }) {
  useEffect(() => {
    if (state !== "open") return;
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      onOwnedBack();
      onClose();
    };
    // Both listeners use the same phase so JSDOM models Chromium's observed
    // window-target registration order: the editor's older listener runs first.
    window.addEventListener("recipio:back", back);
    return () => window.removeEventListener("recipio:back", back);
  }, [state, onClose, onOwnedBack]);
  if (state === "none") return null;
  return <div className="v2-portal" hidden={state !== "open"}>
    <section className="v2-sheet" role="dialog" aria-modal="true" aria-label="后打开的测试弹窗" data-open={state === "closed" ? undefined : ""}>仅查看本轮来源</section>
  </div>;
}

function fixture() {
  const initial = emptyDetails("原始合成菜名"), onCancel = vi.fn(), onSave = vi.fn(async () => {}), onOwnedBack = vi.fn();
  function Harness({ modal }: { modal: ModalState }) {
    const [ownerClosed, setOwnerClosed] = useState(false);
    return <>
      <RecipeEditor initial={initial} onSave={onSave} onCancel={onCancel} mediaEnabled={false} />
      <LaterModal state={ownerClosed ? "closed" : modal} onClose={() => setOwnerClosed(true)} onOwnedBack={onOwnedBack} />
    </>;
  }
  const view = render(<Harness modal="none" />);
  fireEvent.change(screen.getByLabelText("菜名"), { target: { value: "已编辑但未保存的合成菜名" } });
  fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "关闭弹窗后仍要保留的备注😊" } });
  return { ...view, Harness, onCancel, onSave, onOwnedBack };
}

it("T06/T13 a later modal owns Back before the older dirty editor without confirming or leaving", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false), f = fixture();
  f.rerender(<f.Harness modal="open" />);
  expect(screen.getByRole("dialog", { name: "后打开的测试弹窗" })).toHaveAttribute("data-open");

  const back = new Event("recipio:back", { cancelable: true }); fireEvent(window, back);

  expect(f.onOwnedBack).toHaveBeenCalledOnce();
  expect(back.defaultPrevented).toBe(true);
  expect(screen.queryByRole("dialog", { name: "后打开的测试弹窗" })).not.toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled(); expect(f.onCancel).not.toHaveBeenCalled(); expect(f.onSave).not.toHaveBeenCalled();
  expect(screen.getByLabelText("菜名")).toHaveValue("已编辑但未保存的合成菜名");
  expect(screen.getByLabelText("个人备注")).toHaveValue("关闭弹窗后仍要保留的备注😊");
});

it("T06/T13 closed or hidden modal markup cannot permanently suppress the existing dirty leave guard", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false), f = fixture();
  for (const modal of ["closed", "hidden"] as const) {
    f.rerender(<f.Harness modal={modal} />);
    expect(screen.queryByRole("dialog", { name: "后打开的测试弹窗" })).not.toBeInTheDocument();
    const back = new Event("recipio:back", { cancelable: true }); fireEvent(window, back);
    expect(back.defaultPrevented).toBe(true);
    expect(screen.getByLabelText("菜名")).toHaveValue("已编辑但未保存的合成菜名");
    expect(screen.getByLabelText("个人备注")).toHaveValue("关闭弹窗后仍要保留的备注😊");
  }
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(confirm).toHaveBeenCalledWith("有未保存的修改，确定放弃吗？");
  expect(f.onOwnedBack).not.toHaveBeenCalled(); expect(f.onCancel).not.toHaveBeenCalled(); expect(f.onSave).not.toHaveBeenCalled();
});
