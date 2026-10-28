import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RecipeListItem } from "../recipe-model";
import { CoreLibraryScreen } from "./library-screens";

type Props = ComponentProps<typeof CoreLibraryScreen>;
function props(overrides: Partial<Props> = {}): Props {
  return {
    records: [], library: false, query: "", filter: "all", loading: false,
    busy: false, page: 0, onQuery: vi.fn(), onFilter: vi.fn(), onPage: vi.fn(),
    onOpen: vi.fn(), onAdd: vi.fn(), onFind: vi.fn(), onLibrary: vi.fn(),
    ...overrides,
  };
}
function recipe(id: string, title: string, totalMinutes: number | null): RecipeListItem {
  return {
    id, title, totalMinutes, coverPath: null, lastCookedAt: null,
    createdAt: "2026-10-26T00:00:00.000Z", updatedAt: "2026-10-26T00:00:00.000Z",
  };
}

it("keeps pointer focus distinct from keyboard navigation without changing the query", () => {
  const p = props();
  render(<CoreLibraryScreen {...p} />);
  const input = screen.getByRole("searchbox", { name: "搜索菜名或食材" });
  const container = input.closest(".v2-search");
  expect(container).not.toHaveAttribute("data-pointer-focus", "true");
  if (!container) throw new Error("Search container missing");
  fireEvent.pointerDown(container, { pointerType: "touch" });
  expect(container).not.toHaveAttribute("data-pointer-focus", "true");
  fireEvent.pointerDown(input, { pointerType: "touch" });
  fireEvent.focus(input);
  expect(container).toHaveAttribute("data-pointer-focus", "true");
  fireEvent.keyDown(input, { key: "Process", isComposing: true });
  expect(container).toHaveAttribute("data-pointer-focus", "true");
  fireEvent.keyDown(input, { key: "a" });
  expect(container).not.toHaveAttribute("data-pointer-focus", "true");
  fireEvent.pointerDown(input, { pointerType: "touch" });
  fireEvent.keyDown(input, { key: "Tab" });
  expect(container).not.toHaveAttribute("data-pointer-focus", "true");
  expect(p.onQuery).not.toHaveBeenCalled();
});

it("a search miss offers local query recovery instead of pretending the library is empty", () => {
  const p = props({ query: "不在本机的菜" });
  render(<CoreLibraryScreen {...p} />);
  expect(screen.getByRole("heading", { name: "没有符合条件的菜谱" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "添加第一道菜" })).not.toBeInTheDocument();
  expect(p.onFind).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "清空搜索词" }));
  expect(p.onQuery).toHaveBeenCalledExactlyOnceWith("");
  expect(screen.getByRole("searchbox", { name: "搜索菜名或食材" })).toHaveFocus();
  expect(p.onFilter).not.toHaveBeenCalled();
  expect(p.onFind).not.toHaveBeenCalled();
});

it("an empty duration range can be removed without changing the current query", () => {
  const p = props({ library: true, query: "汤", filter: "short" });
  render(<CoreLibraryScreen {...p} />);
  expect(screen.queryByRole("button", { name: "添加第一道菜" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "取消耗时筛选" }));
  expect(p.onFilter).toHaveBeenCalledExactlyOnceWith("all");
  expect(p.onQuery).not.toHaveBeenCalled();
  expect(screen.getByRole("searchbox")).toHaveValue("汤");
  expect(p.onFind).not.toHaveBeenCalled();
});

it("a genuinely empty first page keeps name-only creation available", () => {
  const p = props();
  render(<CoreLibraryScreen {...p} />);
  expect(screen.getByRole("heading", { name: "先记下第一道想做的菜" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "添加第一道菜" }));
  expect(p.onAdd).toHaveBeenCalledOnce();
  expect(p.onFind).not.toHaveBeenCalled();
});

it("a failed library read never claims an empty collection or an empty search result", () => {
  const p = props({ library: true, readError: true });
  const { rerender } = render(<CoreLibraryScreen {...p} />);
  expect(screen.queryByRole("heading", { name: "先记下第一道想做的菜" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "没有符合条件的菜谱" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "添加第一道菜" })).not.toBeInTheDocument();
  rerender(<CoreLibraryScreen {...p} query="汤" />);
  expect(screen.queryByRole("heading", { name: "没有符合条件的菜谱" })).not.toBeInTheDocument();
  expect(p.onAdd).not.toHaveBeenCalled();
  expect(p.onFind).not.toHaveBeenCalled();
});

it("an empty later page points back to existing recipes rather than first-time creation", () => {
  const p = props({ library: true, page: 2 });
  render(<CoreLibraryScreen {...p} />);
  expect(screen.getByRole("heading", { name: "这一页没有菜谱" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "添加第一道菜" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "上一页" }));
  expect(p.onPage).toHaveBeenCalledExactlyOnceWith(1);
  expect(p.onQuery).not.toHaveBeenCalled();
  expect(p.onFilter).not.toHaveBeenCalled();
});

it("recent cards foreground real duration and retain the supplied order and IDs", () => {
  const first = recipe("supplied-first", "姜葱鸡", 25);
  const second = { ...recipe("supplied-second", "只有菜名".repeat(10), null), createdAt: "2026-10-27T00:00:00.000Z" };
  const p = props({ records: [first, second] });
  render(<CoreLibraryScreen {...p} />);
  const recent = screen.getByRole("region", { name: "最近加入" });
  const cards = within(recent).getAllByRole("button", { name: /^查看最近加入的 / });
  expect(cards.map(card => card.getAttribute("aria-label"))).toEqual([
    `查看最近加入的 ${first.title}`, `查看最近加入的 ${second.title}`,
  ]);
  expect(within(cards[0]).getByText("25 分钟")).toBeVisible();
  expect(within(cards[1]).queryByText("0 分钟")).not.toBeInTheDocument();
  expect(within(cards[1]).getByText(second.title)).toBeVisible();
  fireEvent.click(cards[1]);
  expect(p.onOpen).toHaveBeenCalledExactlyOnceWith(second.id);
  expect(p.onFind).not.toHaveBeenCalled();
});

it("home search hands the trimmed dish to Finder only after the explicit action", () => {
  const p = props({ query: "  番茄汤  " });
  render(<CoreLibraryScreen {...p} />);
  expect(p.onFind).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "帮我找『番茄汤』的做法" }));
  expect(p.onFind).toHaveBeenCalledExactlyOnceWith("番茄汤");
});
