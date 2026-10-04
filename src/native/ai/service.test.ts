import "fake-indexeddb/auto";
import { afterEach,expect,it,vi } from "vitest";
import { AiIntakeService } from "./service";
import { PreviewRecipeLibrary } from "../preview-store";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";
import type { BackupController } from "../backup/backup-controls";
import type { BackupState } from "../backup/service";
import { deferred,fakeAi,output } from "./service.test-support";
afterEach(__resetLocalDatabaseForTests);
const fixture=()=>{const fake=fakeAi(),store=new PreviewRecipeLibrary();return {...fake,store,service:new AiIntakeService(fake.keys,fake.bridge,{store})};};
it("coalesces session creation and never reads key or sends HTTP until explicit action",async()=>{
  const {service,keys,bridge}=fixture();const [a,b]=await Promise.all([service.startSession(),service.startSession()]);expect(a).toBe(b);expect(bridge.createSession).toHaveBeenCalledTimes(1);expect(keys.hasAiKey).not.toHaveBeenCalled();expect(bridge.organize).not.toHaveBeenCalled();expect(service.snapshot().operationId).toBe(a);
});
it("missing key sends nothing and retains input with an actionable safe error",async()=>{
  const {service,keys,bridge}=fixture();keys.hasAiKey.mockResolvedValue({configured:false});await service.startSession();await expect(service.organize({text:"啤酒鸭",imageIds:[]})).rejects.toMatchObject({code:"key_missing"});expect(bridge.organize).not.toHaveBeenCalled();expect(service.snapshot()).toMatchObject({phase:"error",input:{text:"啤酒鸭"},error:{code:"key_missing"}});
});
it("validates empty/Unicode boundaries before key or request",async()=>{
  const {service,keys,bridge}=fixture();await service.startSession();for(const text of [" ","🍚".repeat(30001)])await expect(service.organize({text,imageIds:[]})).rejects.toMatchObject({code:"input_invalid"});expect(keys.hasAiKey).not.toHaveBeenCalled();await service.organize({text:"🍚".repeat(30000),imageIds:[]});expect(bridge.organize).toHaveBeenCalledTimes(1);
});
it("one in-flight action, checked JSON preview, no local write and no automatic retry",async()=>{
  const {service,bridge,store}=fixture(),response=deferred<{rawJson:string}>();bridge.organize.mockReturnValueOnce(response.promise);const create=vi.spyOn(store,"createDetails");await service.startSession();const pending=service.organize({text:"啤酒鸭",imageIds:[]});await vi.waitFor(()=>expect(bridge.organize).toHaveBeenCalledTimes(1));await expect(service.organize({text:"另一道菜",imageIds:[]})).rejects.toMatchObject({code:"busy"});response.resolve({rawJson:output()});const draft=await pending;expect(draft.recipe.title).toBe("啤酒鸭");expect(service.snapshot()).toMatchObject({phase:"preview",draft,confirmed:false});expect(create).not.toHaveBeenCalled();
});
it("failed request keeps source and manual retry alone sends next request",async()=>{
  const {service,bridge}=fixture();await service.startSession();bridge.organize.mockRejectedValueOnce({code:"network_unavailable",message:"private"});await expect(service.organize({text:"原文字",imageIds:[]})).rejects.toMatchObject({code:"network_unavailable"});expect(service.snapshot().input.text).toBe("原文字");expect(service.snapshot().error?.message).not.toContain("private");expect(bridge.organize).toHaveBeenCalledTimes(1);await service.organize(service.snapshot().input);expect(bridge.organize).toHaveBeenCalledTimes(2);
});
it("cancel A then B success cannot be overwritten by A's late reply",async()=>{
  const {service,bridge}=fixture(),a=deferred<{rawJson:string}>();await service.startSession();bridge.organize.mockReturnValueOnce(a.promise);const pending=service.organize({text:"A",imageIds:[]}).catch(e=>e);await vi.waitFor(()=>expect(bridge.organize).toHaveBeenCalledTimes(1));await service.cancelRequest();await service.organize({text:"B",imageIds:[]});a.resolve({rawJson:output("迟到A")});expect(await pending).toMatchObject({code:"stale_session"});expect(service.snapshot().draft?.recipe.title).toBe("啤酒鸭");expect(bridge.cancel).toHaveBeenCalledTimes(1);
});
it("cancel without actual request is a no-op; settings roundtrip keeps input but no auto POST",async()=>{
  const {service,bridge}=fixture();await service.startSession();service.updateInput({text:"保留输入",imageIds:[]});await service.cancelRequest();service.keyChanged();await service.refreshKey();expect(service.snapshot().input.text).toBe("保留输入");expect(bridge.cancel).not.toHaveBeenCalled();expect(bridge.organize).not.toHaveBeenCalled();
});
it("invalid model JSON never reaches Preview or database",async()=>{
  const {service,bridge,store}=fixture();await service.startSession();bridge.organize.mockResolvedValue({rawJson:'{"recipe":{"title":"不完整"}}'});await expect(service.organize({text:"菜",imageIds:[]})).rejects.toMatchObject({code:"invalid_output"});expect(service.snapshot().draft).toBeNull();expect(await store.list()).toEqual([]);
});
it("discard during asynchronous key read prevents HTTP and cannot overwrite new session",async()=>{
  const {service,keys,bridge}=fixture(),key=deferred<{configured:boolean}>();keys.hasAiKey.mockReturnValueOnce(key.promise);await service.startSession();const pending=service.organize({text:"旧输入",imageIds:[]}).catch(e=>e);await service.discard();const fresh=await service.startSession();key.resolve({configured:true});expect(await pending).toMatchObject({code:"stale_session"});expect(bridge.organize).not.toHaveBeenCalled();expect(service.snapshot().operationId).toBe(fresh);
});
it("restoring/uncertain backup synchronously invalidates generation before queued data access",async()=>{
  const fake=fakeAi(),store=new PreviewRecipeLibrary();let state:BackupState={phase:"idle"};const listeners=new Set<()=>void>();const backup={getState:()=>state,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn);},export:vi.fn(),inspectRestore:vi.fn(),confirmReplace:vi.fn(),cancel:vi.fn()} satisfies BackupController;
  const service=new AiIntakeService(fake.keys,fake.bridge,{store,backup});await service.startSession();await service.organize({text:"菜谱",imageIds:[]});state={phase:"restoring"};listeners.forEach(fn=>fn());expect(service.snapshot().draft).toBeNull();expect(service.snapshot().operationId).toBeNull();await expect(service.startSession()).rejects.toMatchObject({code:"busy"});state={phase:"uncertain"};listeners.forEach(fn=>fn());await expect(service.startSession()).rejects.toMatchObject({code:"busy"});
});
it("cancellation remains busy until native release; old release cannot alter a newly created session",async()=>{
  const {service,bridge}=fixture(),reply=deferred<{rawJson:string}>(),release=deferred<void>();await service.startSession();bridge.organize.mockReturnValueOnce(reply.promise);bridge.cancel.mockReturnValueOnce(release.promise);const pending=service.organize({text:"A",imageIds:[]}).catch(e=>e);await vi.waitFor(()=>expect(bridge.organize).toHaveBeenCalledTimes(1));const cancelling=service.cancelRequest();expect(service.snapshot().phase).toBe("requesting");await expect(service.organize({text:"B",imageIds:[]})).rejects.toMatchObject({code:"busy"});release.resolve();await cancelling;expect(service.snapshot().phase).toBe("input");reply.resolve({rawJson:output()});await pending;
});
