import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiIntakeService } from "./service";
import { fakeAi, deferred, image } from "./service.test-support";
import { AiIntakeError } from "./native-bridge";
import { PreviewRecipeLibrary } from "../preview-store";
import { __resetLocalDatabaseForTests } from "@/features/offline/local-db";

afterEach(__resetLocalDatabaseForTests);

describe("explicit Share prefill into an ordinary AI session", () => {
  function setup() {
    const fake = fakeAi();
    const store = new PreviewRecipeLibrary();
    return { ...fake, service: new AiIntakeService(fake.keys, fake.bridge, { store }), store };
  }
  it("preserves Chinese/newlines/emoji without calling Provider or saving", async () => {
    const f = setup(); const text = "鸡翅500克\n小火20分钟 🍗";
    await f.service.prepareSharedInput({ text });
    expect(f.service.snapshot()).toMatchObject({ phase: "input", input: { text, imageIds: [] }, draft: null, confirmed: false });
    expect(f.bridge.organize).not.toHaveBeenCalled(); expect(await f.store.list("",100,0,"all")).toEqual([]);
  });
  it("imports ordered images through an opaque session operation, then uses normal remove/move/picker", async () => {
    const f = setup(); let images: ReturnType<typeof image>[] = [];
    await f.service.prepareSharedInput({ text: "描述 https://generated.example/r", transferImages: async operationId => { images = [image(operationId), image(operationId)]; return images; } });
    expect(f.service.snapshot().images).toEqual(images);
    expect(f.service.snapshot().input.imageIds).toEqual(images.map(i => i.id));
    f.service.moveImage(images[1].id,-1); expect(f.service.snapshot().images[0].id).toBe(images[1].id);
    await f.service.removeImage(images[0].id); await f.service.pickImage(); expect(f.service.snapshot().images).toHaveLength(2);
    expect(f.bridge.organize).not.toHaveBeenCalled();
    await f.service.organize(f.service.snapshot().input); expect(f.bridge.organize).toHaveBeenCalledTimes(1);
  });
  it("rejects dirty input and oversize before creating or touching a session", async () => {
    const f=setup(); f.service.updateInput({text:"我的草稿",imageIds:[]});
    await expect(f.service.prepareSharedInput({text:"新分享"})).rejects.toMatchObject({code:"busy"});
    expect(f.service.snapshot().input.text).toBe("我的草稿"); expect(f.bridge.createSession).not.toHaveBeenCalled();
    const clean=setup(); await expect(clean.service.prepareSharedInput({text:"x".repeat(30001)})).rejects.toMatchObject({code:"input_invalid"});
    expect(clean.bridge.createSession).not.toHaveBeenCalled();
  });
  it("failed atomic transfer discards only its fresh session and leaves no partial UI", async () => {
    const f=setup();
    await expect(f.service.prepareSharedInput({text:"文字",transferImages:async()=>{throw new AiIntakeError("image_invalid");}})).rejects.toMatchObject({code:"image_invalid"});
    expect(f.service.snapshot()).toMatchObject({images:[],input:{text:"",imageIds:[]},operationId:null,draft:null,confirmed:false});
    expect(f.bridge.discardSession).toHaveBeenCalledOnce(); expect(f.bridge.organize).not.toHaveBeenCalled();
  });
  it("transfer locks editable input and late completion after discard never restores sources", async () => {
    const f=setup(), gate=deferred<ReturnType<typeof image>[]>();
    const work=f.service.prepareSharedInput({text:"分享",transferImages:()=>gate.promise});
    await vi.waitFor(()=>expect(f.service.snapshot().imageBusy).toBe(true));
    expect(()=>f.service.updateInput({text:"覆盖",imageIds:[]})).toThrow();
    const operation=f.service.snapshot().operationId!; await f.service.discard(); gate.resolve([image(operation)]);
    await expect(work).rejects.toMatchObject({code:"stale_session"});
    expect(f.service.snapshot().input.text).toBe(""); expect(f.service.snapshot().images).toEqual([]);
  });
});
