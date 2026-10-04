import "fake-indexeddb/auto";
import {afterEach,expect,it,vi} from "vitest";
import {__resetLocalDatabaseForTests,getLocalDatabase} from "@/features/offline/local-db";
import {PreviewRecipeLibrary} from "../preview-store";
import {emptyDetails} from "../recipe-model";
import {AiRecipeSaver,type AiSaveRequest} from "./save";
import {AiIntakeError} from "./native-bridge";
import {deferred,fakeAi,reviewDraft} from "./service.test-support";
afterEach(__resetLocalDatabaseForTests);
function setup(){const store=new PreviewRecipeLibrary(),fake=fakeAi(),saver=new AiRecipeSaver(store,fake.bridge),request:AiSaveRequest={operationId:crypto.randomUUID(),creationId:crypto.randomUUID(),input:{...emptyDetails("鸭"),ingredients:[{name:"盐",amount:"适量"}],steps:[{instruction:"煮熟",imagePath:null}]},draft:reviewDraft(),confirmed:true,assertCurrent:()=>{}};return {store,bridge:fake.bridge,saver,request};}
it("unconfirmed or invalid input writes nothing and never persists source or screenshot media",async()=>{
  const {store,saver,request,bridge}=setup(),create=vi.spyOn(store,"createDetails");await expect(saver.save({...request,confirmed:false})).rejects.toMatchObject({code:"review_required"});expect(create).not.toHaveBeenCalled();
  await expect(saver.save({...request,input:{...request.input,coverPath:"images/aaaa.jpg"}})).rejects.toMatchObject({code:"input_invalid"});expect(create).not.toHaveBeenCalled();expect(bridge.discardSession).not.toHaveBeenCalled();
});
it("double tap and exact same-ID retry create once and preserve full recipe and time",async()=>{
  const {store,saver,request,bridge}=setup(),create=vi.spyOn(store,"createDetails"),a=saver.save(request),b=saver.save(request);const [one,two]=await Promise.all([a,b]);expect(one).toEqual(two);expect(create).toHaveBeenCalledTimes(1);expect(one.recipe.id).toBe(request.creationId);expect(one.recipe).toMatchObject(request.input);
  expect(await saver.save(request)).toEqual(one);expect(create).toHaveBeenCalledTimes(1);expect(await store.listRecipeChanges(one.recipe.id)).toEqual([]);expect(bridge.discardSession).toHaveBeenCalledTimes(1);expect(JSON.stringify(await (await getLocalDatabase()).localRecipes.toArray())).not.toMatch(/fieldChecks|operationId|rawJson|sourceText/);
});
it("successful INSERT with lost acknowledgement resolves by same ID, never another create",async()=>{
  const {store,saver,request}=setup(),original=store.createDetails.bind(store),create=vi.spyOn(store,"createDetails").mockImplementationOnce(async(...args)=>{await original(...args);throw new Error("lost acknowledgement");});
  const result=await saver.save(request);expect(result.recipe.id).toBe(request.creationId);expect(await store.list()).toHaveLength(1);expect(create).toHaveBeenCalledTimes(1);
});
it("unknown commit freezes new writes until explicit read confirms saved row; no implicit retry",async()=>{
  const {store,saver,request}=setup(),original=store.createDetails.bind(store),create=vi.spyOn(store,"createDetails").mockImplementationOnce(async(...args)=>{await original(...args);throw new Error("lost");});const get=vi.spyOn(store,"getDetails").mockRejectedValueOnce(new Error("disk read"));
  await expect(saver.save(request)).rejects.toMatchObject({code:"save_uncertain"});await expect(saver.save({...request,creationId:crypto.randomUUID(),input:emptyDetails("另一个")})).rejects.toMatchObject({code:"save_uncertain"});expect(create).toHaveBeenCalledTimes(1);expect(get).toHaveBeenCalledTimes(1);
  expect((await saver.recover())?.recipe.id).toBe(request.creationId);expect(create).toHaveBeenCalledTimes(1);
});
it("only a confirmed absent row permits editing/retry; another UUID's content is never overwritten",async()=>{
  const {store,saver,request}=setup(),create=vi.spyOn(store,"createDetails").mockRejectedValueOnce(new Error("insert failed"));vi.spyOn(store,"getDetails").mockRejectedValueOnce(new Error("read failed"));await expect(saver.save(request)).rejects.toMatchObject({code:"save_uncertain"});expect(await saver.recover()).toBeNull();expect((await saver.save({...request,creationId:crypto.randomUUID(),input:emptyDetails("调整过")})).recipe.title).toBe("调整过");expect(create).toHaveBeenCalledTimes(2);
  const collision=setup();await collision.store.createDetails(emptyDetails("不同数据"),collision.request.creationId);await expect(collision.saver.save(collision.request)).rejects.toMatchObject({code:"save_uncertain"});expect((await collision.store.getDetails(collision.request.creationId))?.title).toBe("不同数据");
});
it("cleanup failure means saved, retry cleanup alone never writes or deletes committed recipe",async()=>{
  const {store,saver,request,bridge}=setup(),create=vi.spyOn(store,"createDetails");bridge.discardSession.mockRejectedValueOnce(new Error("cache busy"));const result=await saver.save(request);expect(result.cleanupWarning).toContain("已保存");expect(await store.getDetails(request.creationId)).toEqual(result.recipe);expect(await saver.retryCleanup()).toBe(true);expect(create).toHaveBeenCalledTimes(1);expect(bridge.discardSession).toHaveBeenCalledTimes(2);
});
it("stale generation forbids new writes and reconciliation; changed input cannot race first attempt",async()=>{
  const {store,saver,request}=setup();await expect(saver.save({...request,assertCurrent:()=>{throw new AiIntakeError("stale_session");}})).rejects.toMatchObject({code:"stale_session"});expect(await store.list()).toEqual([]);
  const pending=deferred<void>(),original=store.createDetails.bind(store),create=vi.spyOn(store,"createDetails").mockImplementationOnce(async(...args)=>{await pending.promise;return original(...args);});const first=saver.save(request);await expect(saver.save({...request,input:emptyDetails("不同")})).rejects.toMatchObject({code:"save_uncertain"});pending.resolve();await first;expect(create).toHaveBeenCalledTimes(1);
});
