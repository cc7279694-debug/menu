import { useLayoutEffect, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NativeV2Sheet } from "./native-sheet";

// Only isolate the visual portal. The real NativeV2Sheet must register/consume Back;
// this fixture neither represents nor bypasses Android keyboard handling.
vi.mock("./components", () => ({
  V2Sheet: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) =>
    open ? <section role="dialog" aria-label={title}>{children}</section> : null,
}));

it("T13 a reopened sheet owns cancelable Back in its opening commit before passive registration or page interaction", () => {
  const onOpenChange = vi.fn(), dispatches: Event[] = [], visibleDuringCommit: boolean[] = [];
  function Owner({ open, dispatchInCommit }: { open: boolean; dispatchInCommit: boolean }) {
    useLayoutEffect(() => {
      if (!open || !dispatchInCommit) return;
      visibleDuringCommit.push(!!screen.queryByRole("dialog", { name: "本轮来源" }));
      const back = new Event("recipio:back", { cancelable: true });
      dispatches.push(back);
      window.dispatchEvent(back);
    }, [open, dispatchInCommit]);
    return <NativeV2Sheet open={open} onOpenChange={onOpenChange} title="本轮来源" description="只检查监听注册时序。">保留当前草稿</NativeV2Sheet>;
  }

  const view = render(<Owner open={false} dispatchInCommit={false} />);
  view.rerender(<Owner open dispatchInCommit={false} />);
  expect(screen.getByRole("dialog", { name: "本轮来源" })).toBeInTheDocument();
  view.rerender(<Owner open={false} dispatchInCommit={false} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  // A child layout registration runs before this parent's layout dispatch;
  // a passive registration cannot own the event from the already committed DOM.
  view.rerender(<Owner open dispatchInCommit />);
  expect(visibleDuringCommit).toEqual([true]);
  expect(dispatches).toHaveLength(1);
  expect(onOpenChange).toHaveBeenCalledOnce();
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(dispatches[0].defaultPrevented).toBe(true);
});
