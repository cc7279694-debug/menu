import { describe, expect, it, vi } from "vitest";
import { ShareTargetController } from "./controller";
import { shareReplySchema, type SharePort, type ShareReply } from "./contract";
import { createSharePort, openShareTargetRuntime } from "./native-bridge";

const item = (url = "https://generated.example/r") => ({ status: "url" as const, id: crypto.randomUUID(), url, replaced: false });
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
function fake() {
  let listener = () => {};
  const queue: ShareReply[] = [];
  const remove = vi.fn();
  const port: SharePort = { listen: vi.fn(async fn => { listener = fn; return remove; }), consume: vi.fn(async (): Promise<ShareReply> => queue.shift() ?? { status: "empty" }),release:vi.fn(async()=>{}),transferImages:vi.fn(async()=>[]) };
  return { port, queue, remove, emit: () => listener() };
}
describe("memory-only share controller", () => {
  it("retry after failed listener registration reattaches before consuming and receives warm shares", async () => {
    const f = fake(); vi.mocked(f.port.listen).mockRejectedValueOnce(new Error("generated failure"));
    const c = new ShareTargetController(f.port), stop = c.start(); await flush(); expect(c.snapshot().unavailable).toBe(true);
    c.retry(); await flush(); expect(f.port.listen).toHaveBeenCalledTimes(2);
    const shared = item(); f.queue.push(shared); f.emit(); await flush(); expect(c.snapshot().pending?.id).toBe(shared.id); stop();
  });
  it("attaches before initial consume, keeps cold item and ignores duplicate delivery", async () => {
    const f = fake(), shared = item(); f.queue.push(shared, shared);
    const controller = new ShareTargetController(f.port), stop = controller.start(); await flush();
    expect(controller.snapshot().pending).toEqual(shared);
    expect(vi.mocked(f.port.listen)).toHaveBeenCalledBefore(vi.mocked(f.port.consume));
    controller.complete(shared.id); f.queue.push(shared); f.emit(); await flush();
    expect(controller.snapshot().pending).toBeNull(); stop(); expect(f.remove).toHaveBeenCalledOnce();
  });
  it("replacement is visible and old asynchronous completion cannot clear the new item", async () => {
    const f = fake(), a = item(), b = item("https://generated.example/b"); f.queue.push(a);
    const c = new ShareTargetController(f.port), stop = c.start(); await flush(); c.defer(a.id);
    f.queue.push(b); f.emit(); await flush(); c.complete(a.id);
    expect(c.snapshot().pending?.id).toBe(b.id); expect(c.snapshot().replaced).toBe(true);
    c.defer(b.id); expect(c.snapshot().deferred).toBe(true); c.complete(b.id); expect(c.snapshot().pending).toBeNull(); stop();
  });
  it("serialized consumption drains a share received while a request is in flight", async () => {
    const f = fake(), shared = item(); let release!: (value: ShareReply) => void;
    vi.mocked(f.port.consume).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const c = new ShareTargetController(f.port), stop = c.start(); await flush();
    f.queue.push(shared); f.emit(); f.emit(); release({ status: "empty" }); await flush();
    expect(c.snapshot().pending?.id).toBe(shared.id); stop();
  });
  it("late listener registration after cleanup is detached and remount does not lose the receipt", async () => {
    const f = fake(); let attach!: (remove: () => void) => void;
    vi.mocked(f.port.listen).mockImplementationOnce(() => new Promise(resolve => { attach = resolve; }));
    const c = new ShareTargetController(f.port), stop = c.start(); stop(); attach(f.remove); await flush();
    expect(f.remove).toHaveBeenCalledOnce(); expect(f.port.consume).not.toHaveBeenCalled();
    f.queue.push(item()); const stop2 = c.start(); await flush(); expect(c.snapshot().pending).not.toBeNull(); stop2();
  });
  it("transport failure leaves current item untouched and exposes only a safe error", async () => {
    const f = fake(), shared = item(); f.queue.push(shared); const c = new ShareTargetController(f.port), stop = c.start(); await flush();
    vi.mocked(f.port.consume).mockRejectedValueOnce(new Error("private URL / raw intent")); f.emit(); await flush();
    expect(c.snapshot().pending?.id).toBe(shared.id); expect(c.snapshot().unavailable).toBe(true); expect(JSON.stringify(c.snapshot())).not.toContain("private"); stop();
  });
  it("failed media release stays actionable across empty drains, then retries the same receipt", async () => {
    const f=fake(),shared={status:"media" as const,id:crypto.randomUUID(),imageCount:2,replaced:false};f.queue.push(shared);
    vi.mocked(f.port.release).mockRejectedValueOnce(new Error("private path"));
    const c=new ShareTargetController(f.port),stop=c.start();await flush();c.complete(shared.id);await flush();
    expect(c.snapshot().unavailable).toBe(true);f.emit();await flush();expect(c.snapshot().unavailable).toBe(true);
    c.retry();await flush();expect(f.port.release).toHaveBeenCalledTimes(2);expect(f.port.release).toHaveBeenLastCalledWith({id:shared.id});
    expect(c.snapshot().unavailable).toBe(false);stop();
  });
  it("new media replaces and releases only the old receipt; stale transfer cannot steal new ownership", async()=>{
    const f=fake(),a={status:"media" as const,id:crypto.randomUUID(),imageCount:1,replaced:false},b={...a,id:crypto.randomUUID()};f.queue.push(a);
    const c=new ShareTargetController(f.port),stop=c.start();await flush();f.queue.push(b);f.emit();await flush();
    expect(f.port.release).toHaveBeenCalledWith({id:a.id});await expect(c.transferImages(a.id,crypto.randomUUID())).rejects.toThrow("share_unavailable");
    expect(f.port.transferImages).not.toHaveBeenCalled();expect(c.snapshot().pending?.id).toBe(b.id);stop();
  });
});
describe("strict native receipt contract", () => {
  it("browser has no native share runtime and the bridge never exposes raw exception payloads", async () => {
    expect(openShareTargetRuntime()).toBeUndefined();
    const raw = new Error("private URL / original shared text");
    const port = createSharePort({ consume: async () => { throw raw; }, addListener: async () => { throw raw; },releaseShare:async()=>{} });
    await expect(port.consume()).rejects.toThrow(/^share_unavailable$/);
    await expect(port.listen(() => {})).rejects.toThrow(/^share_unavailable$/);
    const invalid = createSharePort({ consume: async () => ({ status: "empty", raw: "private" }), addListener: async () => ({ remove: async () => {} }),releaseShare:async()=>{} });
    await expect(invalid.consume()).rejects.toThrow(/^share_unavailable$/);
  });
  it("accepts only known union shapes and bounded HTTP(S) URLs", () => {
    expect(shareReplySchema.safeParse(item()).success).toBe(true);
    for (const value of [{ status: "empty", text: "raw" }, { ...item(), url: "content://private" }, { ...item(), url: "https://user:pass@generated.example/r" }, { ...item(), url: "https://generated.example/" + "a".repeat(8192) }, { status: "invalid", id: crypto.randomUUID(), reason: "raw_exception", replaced: false }]) expect(shareReplySchema.safeParse(value).success).toBe(false);
  });
  it("rejects private-path and foreign-session transfer metadata and unknown release arguments", async()=>{
    const id=crypto.randomUUID(),operationId=crypto.randomUUID(),imageId=crypto.randomUUID();
    const api={consume:async()=>({status:"empty"}),addListener:async()=>({remove:async()=>{}}),releaseShare:vi.fn(async()=>{})};
    const reply={images:[{id:imageId,mimeType:"image/jpeg",byteSize:100,width:64,height:64,previewUri:`file:///data/user/0/app.recipio.local/cache/ai-import/${operationId}/${imageId}.jpg`}]};
    const transfer={transferShareImagesToAi:vi.fn(async()=>reply)},port=createSharePort(api,transfer);
    expect(await port.transferImages({id,operationId})).toEqual(reply.images);
    for(const path of [`file:///data/user/0/app.recipio.local/cache/share-inbox/${id}/${imageId}.jpg`,`file:///data/user/0/app.recipio.local/cache/ai-import/${id}/${imageId}.jpg`,`content://private/${imageId}`]){
      reply.images[0].previewUri=path;await expect(port.transferImages({id,operationId})).rejects.toThrow(/^share_unavailable$/);
    }
    await expect(port.release({id:"../private"})).rejects.toThrow(/^share_unavailable$/);expect(api.releaseShare).not.toHaveBeenCalled();
  });
});
