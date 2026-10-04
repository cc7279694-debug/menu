import "fake-indexeddb/auto";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { PreviewRecipeLibrary } from "./preview-store";
const bridge = vi.hoisted(() => ({ open: vi.fn(), backup: vi.fn(async () => undefined) }));
vi.mock("./backup/runtime", () => ({ openBackupService: bridge.backup }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "android" } }));
vi.mock("./sqlite", () => ({ openRecipeStore: bridge.open }));
import { NativeApp } from "./app";
afterEach(__resetLocalDatabaseForTests);
it("shows Android initialization failure rather than rendering a fallback empty library, and permits retry", async () => {
  // Only the unavailable native boundary is mocked; the rendered app remains real.
  bridge.open.mockRejectedValueOnce(new Error("migration failed"));
  render(<NativeApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("不要清除应用数据");
  expect(screen.queryByRole("button", { name: "新增菜谱" })).not.toBeInTheDocument();
  bridge.open.mockResolvedValueOnce(new PreviewRecipeLibrary());
  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(await screen.findByRole("button", { name: "新增菜谱" })).toBeInTheDocument();
});
it("does not expose an editable library before recovery facts can be verified",async()=>{
  bridge.open.mockResolvedValueOnce(new PreviewRecipeLibrary());
  bridge.backup.mockRejectedValueOnce(new Error("SQL outcome unreadable"));
  render(<NativeApp/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("不要清除应用数据");
  expect(screen.queryByRole("button",{name:"新增菜谱"})).not.toBeInTheDocument();
});
