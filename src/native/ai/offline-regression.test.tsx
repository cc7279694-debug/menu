import "fake-indexeddb/auto";
import {afterEach,expect,it,vi} from "vitest";
import {render,screen,fireEvent,waitFor} from "@testing-library/react";
import {__resetLocalDatabaseForTests} from "@/features/offline/local-db";
import {PreviewRecipeLibrary} from "../preview-store";
import {LibraryApp} from "../library-app";
import {emptyDetails} from "../recipe-model";
import {AiIntakeService} from "./service";
import {fakeAi} from "./service.test-support";
afterEach(__resetLocalDatabaseForTests);
it("no-network AI failure cannot block local search, full steps and explicit cooking history",async()=>{
  vi.spyOn(window,"scrollTo").mockImplementation(()=>{});vi.spyOn(navigator,"onLine","get").mockReturnValue(false);const network=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("offline"));
  const store=new PreviewRecipeLibrary(),r=await store.createDetails({...emptyDetails("离线鸭"),steps:[{instruction:"洗净鸭肉",imagePath:null},{instruction:"小火焖煮",imagePath:null}]}),fake=fakeAi();fake.bridge.organize.mockRejectedValue({code:"no_network"});const service=new AiIntakeService(fake.keys,fake.bridge,{store});
  render(<LibraryApp store={store} ai={service}/>);fireEvent.click(await screen.findByRole("button",{name:"新增菜谱"}));fireEvent.click(await screen.findByRole("button",{name:"AI 整理"}));fireEvent.change(await screen.findByLabelText("菜谱文字"),{target:{value:"自由文字"}});await waitFor(()=>expect(screen.getByRole("button",{name:"开始 AI 整理"})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:"开始 AI 整理"}));await waitFor(()=>expect(service.snapshot().phase).toBe("error"));
  fireEvent(window,new Event("recipio:back",{cancelable:true}));fireEvent.click(await screen.findByRole("button",{name:"放弃本轮整理"}));fireEvent.click(await screen.findByRole("button",{name:"打开 离线鸭"}));await screen.findByText("洗净鸭肉");expect(screen.getByText("小火焖煮")).toBeInTheDocument();expect(await store.getCookingSummary(r.id)).toMatchObject({count:0});
  fireEvent.click(screen.getByRole("button",{name:"完成这道菜"}));await screen.findByRole("heading",{name:"已记录做过这道菜"});expect(await store.getCookingSummary(r.id)).toMatchObject({count:1});expect(network).not.toHaveBeenCalled();
  await store.saveDetails(r.id,{...emptyDetails("离线修改鸭"),steps:[{instruction:"新做法",imagePath:null}]});expect((await store.list("离线修改"))[0].id).toBe(r.id);expect(await store.listRecipeChanges(r.id)).toHaveLength(1);
});
