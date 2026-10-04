import "fake-indexeddb/auto";
import { fireEvent,render,screen,waitFor } from "@testing-library/react";
import { expect,it,vi } from "vitest";
import { AiIntakeService } from "./service";
import { AiIntakeScreen } from "./intake-screen";
import { PreviewRecipeLibrary } from "../preview-store";
import { deferred,fakeAi } from "./service.test-support";
function setup(configured=true){const fake=fakeAi();fake.keys.hasAiKey.mockResolvedValue({configured});const service=new AiIntakeService(fake.keys,fake.bridge,{store:new PreviewRecipeLibrary()}),props={service,onPreview:vi.fn(),onCancel:vi.fn(),onConfigureKey:vi.fn()};return {...fake,service,props};}
it("explicit send only; unmount for Preview leaves valid draft in App service",async()=>{
  const {props,service,bridge}=setup();const view=render(<AiIntakeScreen {...props}/>);await screen.findByLabelText("菜谱文字");fireEvent.change(screen.getByLabelText("菜谱文字"),{target:{value:"啤酒鸭"}});expect(bridge.organize).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"开始 AI 整理"}));await waitFor(()=>expect(props.onPreview).toHaveBeenCalledTimes(1));view.unmount();expect(service.snapshot().draft?.recipe.title).toBe("啤酒鸭");expect(bridge.discardSession).not.toHaveBeenCalled();
});
it("key missing offers settings and remount keeps original source without a request",async()=>{
  const {props,service,bridge}=setup(false);const view=render(<AiIntakeScreen {...props}/>);await screen.findByLabelText("菜谱文字");fireEvent.change(screen.getByLabelText("菜谱文字"),{target:{value:"保留文字"}});await screen.findByRole("button",{name:"前往设置 AI 密钥"});fireEvent.click(screen.getByRole("button",{name:"前往设置 AI 密钥"}));expect(props.onConfigureKey).toHaveBeenCalledTimes(1);view.unmount();render(<AiIntakeScreen {...props}/>);expect(await screen.findByLabelText("菜谱文字")).toHaveValue("保留文字");expect(service.snapshot().input.text).toBe("保留文字");expect(bridge.organize).not.toHaveBeenCalled();
});
it("Back asks to abandon, preserving source on cancel and discarding only on confirmation",async()=>{
  const {props,bridge}=setup();render(<AiIntakeScreen {...props}/>);await screen.findByLabelText("菜谱文字");fireEvent.change(screen.getByLabelText("菜谱文字"),{target:{value:"鸭"}});fireEvent.click(screen.getByRole("button",{name:"返回"}));fireEvent.click(await screen.findByRole("button",{name:"继续整理"}));expect(bridge.discardSession).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"返回"}));fireEvent.click(await screen.findByRole("button",{name:"放弃本轮整理"}));await waitFor(()=>expect(props.onCancel).toHaveBeenCalledTimes(1));expect(bridge.discardSession).toHaveBeenCalledTimes(1);
});
it("network wait can be abandoned and retry does not block an explicit manual fallback",async()=>{
  const {props,bridge}=setup(),pending=deferred<{rawJson:string}>(),manual=vi.fn();bridge.organize.mockReturnValueOnce(pending.promise);render(<AiIntakeScreen {...props} onManual={manual}/>);await screen.findByLabelText("菜谱文字");fireEvent.change(screen.getByLabelText("菜谱文字"),{target:{value:"鸭"}});await waitFor(()=>expect(screen.getByRole("button",{name:"开始 AI 整理"})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:"开始 AI 整理"}));await screen.findByRole("status");fireEvent.click(screen.getByRole("button",{name:"返回"}));fireEvent.click(await screen.findByRole("button",{name:"继续整理"}));pending.reject({code:"network_unavailable"});await screen.findByText("AI 整理需要联网，已有菜谱仍可正常使用。");fireEvent.click(screen.getByRole("button",{name:"改为手动录入"}));fireEvent.click(await screen.findByRole("button",{name:"放弃本轮整理"}));await waitFor(()=>expect(manual).toHaveBeenCalledTimes(1));expect(bridge.organize).toHaveBeenCalledTimes(1);
});
