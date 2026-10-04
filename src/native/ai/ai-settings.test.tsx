import "fake-indexeddb/auto";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AiSettings } from "./ai-settings";
import type { AiKeyPort } from "./native-bridge";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";

afterEach(__resetLocalDatabaseForTests);
const keys = (configured = false) => ({ hasAiKey: vi.fn(async () => ({configured})), saveAiKey: vi.fn(async () => ({configured: true, cancelled: false})), deleteAiKey: vi.fn(async () => undefined) });
it("reads only configuration state and never asks for plaintext", async () => {
  const port = keys(); render(<AiSettings keys={port} onChanged={() => {}} />);
  await screen.findByText("未配置");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(port.saveAiKey).not.toHaveBeenCalled();
  expect(screen.queryByText(/sk-/)).not.toBeInTheDocument();
});
it("updates configured state only after an explicit native dialog action", async () => {
  const port = keys(), changed = vi.fn(); render(<AiSettings keys={port} onChanged={changed} />);
  await screen.findByText("未配置");
  fireEvent.click(await screen.findByRole("button", {name: "设置 AI 密钥"}));
  await screen.findByText("已配置"); expect(port.saveAiKey.mock.calls).toEqual([[]]); expect(changed).toHaveBeenCalledTimes(1);
});
it("cancel replacement preserves old configured status and sends no changed event", async () => {
  const port = keys(true), changed = vi.fn();port.saveAiKey.mockResolvedValue({configured: true,cancelled: true});
  render(<AiSettings keys={port} onChanged={changed} />);
  fireEvent.click(await screen.findByRole("button", {name: "更换 AI 密钥"}));
  await waitFor(() => expect(port.saveAiKey).toHaveBeenCalledTimes(1));expect(await screen.findByText("已配置")).toBeInTheDocument();expect(changed).not.toHaveBeenCalled();
});
it("requires delete confirmation and cancellation does not call native delete", async () => {
  const port=keys(true);render(<AiSettings keys={port} onChanged={()=>{}} />);
  fireEvent.click(await screen.findByRole("button", {name:"删除 AI 密钥"}));
  fireEvent.click(await screen.findByRole("button", {name:"保留密钥"}));expect(port.deleteAiKey).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"删除 AI 密钥"}));
  fireEvent.click(await screen.findByRole("button",{name:"确认删除"}));await screen.findByText("未配置");expect(port.deleteAiKey.mock.calls).toEqual([[]]);
});
it("double-click sends only one native operation", async () => {
  const port=keys();let resolve!: (value:{configured:boolean;cancelled:boolean})=>void;
  port.saveAiKey.mockImplementation(()=>new Promise(r=>{resolve=r;}));render(<AiSettings keys={port} onChanged={()=>{}} />);
  await screen.findByText("未配置");
  const button=await screen.findByRole("button",{name:"设置 AI 密钥"});fireEvent.click(button);fireEvent.click(button);expect(port.saveAiKey).toHaveBeenCalledTimes(1);
  resolve({configured:true,cancelled:false});await screen.findByText("已配置");
});
it("native errors are sanitized and can be retried", async () => {
  const port=keys();port.hasAiKey.mockRejectedValueOnce({code:"key_unavailable",message:"private sensitive error"});
  render(<AiSettings keys={port} onChanged={()=>{}} />);await screen.findByText("请在设置中重新配置本机 AI 密钥。");
  expect(screen.queryByText(/sensitive/)).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"重新读取状态"}));await screen.findByText("未配置");
});
it("browser without native only shows Android explanation, with no key fallback", async () => {
  render(<AiSettings onChanged={()=>{}} />);await screen.findByText("AI 整理仅支持 Android；本地菜谱仍可使用。");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"设置 AI 密钥"})).not.toBeInTheDocument();
});
it("settings remains navigable to backup and home after key failure", async () => {
  const port:AiKeyPort=keys();vi.spyOn(port,"hasAiKey").mockRejectedValue({code:"key_unavailable"});vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  render(<LibraryApp store={new PreviewRecipeLibrary()} aiKeys={port} />);
  fireEvent.click(screen.getByRole("button",{name:"设置"}));await screen.findByText("请在设置中重新配置本机 AI 密钥。");
  expect(screen.getByRole("heading",{name:"数据与备份"})).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"首页"}));await screen.findByRole("heading",{name:"今天想做什么？"});
});
