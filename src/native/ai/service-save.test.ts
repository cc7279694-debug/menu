import "fake-indexeddb/auto";
import {afterEach,expect,it,vi} from "vitest";
import {__resetLocalDatabaseForTests} from "@/features/offline/local-db";
import {PreviewRecipeLibrary} from "../preview-store";
import {DataOperationCoordinator} from "../backup/coordinator";
import type {BackupController} from "../backup/backup-controls";
import type {BackupState} from "../backup/service";
import {emptyDetails} from "../recipe-model";
import {AiIntakeService} from "./service";
import {deferred,fakeAi} from "./service.test-support";
afterEach(__resetLocalDatabaseForTests);
async function setup(){const fake=fakeAi(),store=new PreviewRecipeLibrary(),service=new AiIntakeService(fake.keys,fake.bridge,{store});await service.startSession();await service.organize({text:"来源",imageIds:[]});return {fake,store,service};}
it("Service save checks human gate, coalesces one write, then clears every source and acknowledgement",async()=>{
  const {fake,store,service}=await setup(),create=vi.spyOn(store,"createDetails");await expect(service.save(emptyDetails("用户编辑"))).rejects.toMatchObject({code:"review_required"});expect(create).not.toHaveBeenCalled();service.setConfirmed(true);
  const [a,b]=await Promise.all([service.save(emptyDetails("用户编辑")),service.save(emptyDetails("用户编辑"))]);expect(a).toEqual(b);expect(create).toHaveBeenCalledTimes(1);expect(service.snapshot()).toMatchObject({phase:"saved",input:{text:"",imageIds:[]},operationId:null,draft:null,images:[],confirmed:false});expect(fake.bridge.discardSession).toHaveBeenCalledTimes(1);
  await service.startSession();expect(service.snapshot().phase).toBe("input");await service.organize({text:"新的",imageIds:[]});expect(service.snapshot().confirmed).toBe(false);
});
it("unknown result freezes edited input and Back/discard/new request; explicit recovery is read-only",async()=>{
  const {store,service}=await setup(),original=store.createDetails.bind(store),create=vi.spyOn(store,"createDetails").mockImplementationOnce(async(...args)=>{await original(...args);throw new Error("lost");});vi.spyOn(store,"getDetails").mockRejectedValueOnce(new Error("read"));service.setConfirmed(true);
  await expect(service.save(emptyDetails("编辑后的菜"))).rejects.toMatchObject({code:"save_uncertain"});expect(service.snapshot().draft?.recipe.title).toBe("编辑后的菜");expect(service.snapshot().phase).toBe("uncertain");expect(()=>service.updateInput({text:"other",imageIds:[]})).toThrow();await expect(service.discard()).rejects.toMatchObject({code:"save_uncertain"});await expect(service.startSession()).rejects.toMatchObject({code:"busy"});
  const saved=await service.recoverSave();expect(saved?.title).toBe("编辑后的菜");expect(create).toHaveBeenCalledTimes(1);expect(service.snapshot().phase).toBe("saved");
});
it("known absence permits editing retry; cleanup warning retries only cleanup and preserves recipe",async()=>{
  const {fake,store,service}=await setup(),create=vi.spyOn(store,"createDetails").mockRejectedValueOnce(new Error("disk full"));service.setConfirmed(true);await expect(service.save(emptyDetails("失败"))).rejects.toMatchObject({code:"storage_error"});expect(service.snapshot().phase).toBe("preview");
  fake.bridge.discardSession.mockRejectedValueOnce(new Error("cache"));const recipe=await service.save(emptyDetails("已调整"));expect(service.snapshot().pendingCleanup).toBe(true);await service.retryCleanup();expect(service.snapshot().pendingCleanup).toBe(false);expect(create).toHaveBeenCalledTimes(2);expect(await store.getDetails(recipe.id)).toEqual(recipe);
});
it("Replace-first synchronously invalidates old save before FIFO acquires data gate",async()=>{
  const fake=fakeAi(),gate=new DataOperationCoordinator(),store=new PreviewRecipeLibrary(undefined,gate);let state:BackupState={phase:"idle"};const listeners=new Set<()=>void>();const backup={getState:()=>state,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn);},export:vi.fn(),inspectRestore:vi.fn(),confirmReplace:vi.fn(),cancel:vi.fn()} satisfies BackupController;
  const service=new AiIntakeService(fake.keys,fake.bridge,{store,backup});await service.startSession();await service.organize({text:"旧草稿",imageIds:[]});service.setConfirmed(true);
  const hold=deferred<void>(),entered=deferred<void>(),replace=gate.withExclusive(async()=>{entered.resolve();await hold.promise;});await entered.promise;
  const pending=service.save(emptyDetails("绝不能插入")),rejected=expect(pending).rejects.toMatchObject({code:"stale_session"});state={phase:"restoring"};listeners.forEach(fn=>fn());expect(service.snapshot().draft).toBeNull();hold.resolve();await replace;await rejected;expect(await store.list()).toEqual([]);expect(service.snapshot().phase).toBe("input");
});
