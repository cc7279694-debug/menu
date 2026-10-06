import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import { LibraryApp } from "../library-app";
import { PreviewRecipeLibrary } from "../preview-store";
import { AiIntakeService } from "../ai/service";
import { fakeAi, image } from "../ai/service.test-support";
import { LinkImportService } from "../link-import/service";
import { ShareTargetController } from "./controller";
import type { ShareReply } from "./contract";

afterEach(__resetLocalDatabaseForTests);
beforeEach(()=>vi.spyOn(window,"scrollTo").mockImplementation(()=>{}));
const text="鸡翅500克\n小火20分钟 🍗";
function setup(){
  const store=new PreviewRecipeLibrary(), fake=fakeAi(), ai=new AiIntakeService(fake.keys,fake.bridge,{store});
  const web={read:vi.fn(),cancel:vi.fn()},link=new LinkImportService({store,ai,port:web});
  let notify=()=>{};const queue:ShareReply[]=[];
  const release=vi.fn(async()=>{}),transferImages=vi.fn(async({operationId}:{id:string;operationId:string})=>[image(operationId),image(operationId)]);
  const share=new ShareTargetController({consume:async()=>queue.shift()??{status:"empty"},listen:async fn=>{notify=fn;return()=>{};},release,transferImages});
  const emit=async(reply:ShareReply)=>{await act(async()=>{queue.push(reply);notify();});};
  return {store,fake,ai,link,web,share,emit,release,transferImages};
}
const plain=()=>({status:"text" as const,id:crypto.randomUUID(),text,replaced:false});
const media=()=>({status:"media" as const,id:crypto.randomUUID(),text,imageCount:2,replaced:false});
async function menu(name:string){fireEvent.click(screen.getByRole("button",{name:"新增菜谱"}));fireEvent.click(await screen.findByRole("button",{name}));}
it("safe text Share prefill is exact and stays offline until explicit Start",async()=>{
  const f=setup();render(<LibraryApp {...f}/>);await f.emit(plain());
  expect(await screen.findByLabelText("菜谱文字")).toHaveValue(text);
  expect(f.fake.bridge.organize).not.toHaveBeenCalled();expect(f.web.read).not.toHaveBeenCalled();expect(await f.store.list()).toEqual([]);
  fireEvent.click(screen.getByRole("button",{name:"开始 AI 整理"}));await screen.findByRole("heading",{name:"检查 AI 整理结果"});expect(f.fake.bridge.organize).toHaveBeenCalledTimes(1);
});
it("media with URL description stays image AI and uses existing ordered temporary images",async()=>{
  const f=setup();render(<LibraryApp {...f}/>);const share={...media(),text:"描述 https://generated.example/r"};await f.emit(share);
  expect(await screen.findByLabelText("菜谱文字")).toHaveValue(share.text);expect(f.ai.snapshot().images).toHaveLength(2);
  expect(f.transferImages).toHaveBeenCalledOnce();expect(f.web.read).not.toHaveBeenCalled();expect(f.fake.bridge.organize).not.toHaveBeenCalled();
});
it("dirty editor protects content and replacement/Ignore release old media receipts",async()=>{
  const f=setup();render(<LibraryApp {...f}/>);await menu("手动录入");fireEvent.change(await screen.findByLabelText("菜名"),{target:{value:"我的未保存菜"}});
  const first=media(),second=media();await f.emit(first);await f.emit(second);
  expect(screen.getByLabelText("菜名")).toHaveValue("我的未保存菜");expect(f.transferImages).not.toHaveBeenCalled();expect(f.release).toHaveBeenCalledWith({id:first.id});
  expect(screen.getByLabelText("待处理分享").textContent).not.toContain(text);
  fireEvent.click(screen.getByRole("button",{name:"忽略这次分享"}));expect(f.release).toHaveBeenCalledWith({id:second.id});expect(screen.queryByLabelText("待处理分享")).not.toBeInTheDocument();
});
it("empty AI accepts a Share but occupied AI never overwrites text or images",async()=>{
  const f=setup();render(<LibraryApp {...f}/>);await menu("AI 整理");await screen.findByLabelText("菜谱文字");await f.emit(plain());expect(screen.getByLabelText("菜谱文字")).toHaveValue(text);
  await f.emit({...plain(),text:"新分享"});expect(screen.getByLabelText("菜谱文字")).toHaveValue(text);expect(screen.getByLabelText("待处理分享")).toBeInTheDocument();expect(f.fake.bridge.organize).not.toHaveBeenCalled();
});
it("empty Link never automatically changes into text/image AI",async()=>{
  const f=setup();render(<LibraryApp {...f}/>);await menu("从网页链接导入");await screen.findByLabelText("网页链接");await f.emit(media());
  expect(screen.getByLabelText("网页链接")).toHaveValue("");expect(screen.queryByLabelText("菜谱文字")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"打开这次分享"}));expect(await screen.findByLabelText("菜谱文字")).toHaveValue(text);
});
it("multiple links expose explicit choices without choosing first or automatically sending",async()=>{
  const f=setup();render(<LibraryApp {...f}/>);const original="生成菜 https://generated.example/a\nhttps://generated.example/b";
  await f.emit({status:"invalid",id:crypto.randomUUID(),reason:"multiple_links",text:original,replaced:false});
  expect(await screen.findByRole("button",{name:"整理这段分享文字"})).toBeEnabled();expect(screen.queryByLabelText("菜谱文字")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"整理这段分享文字"}));expect(await screen.findByLabelText("菜谱文字")).toHaveValue(original);expect(f.fake.bridge.organize).not.toHaveBeenCalled();
});
