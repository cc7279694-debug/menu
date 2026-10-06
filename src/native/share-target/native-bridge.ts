import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { shareReplySchema, type SharePort } from "./contract";
import { ShareTargetController } from "./controller";
import { parseTransferredAiImages } from "../ai/native-bridge";
import { z } from "zod";

export interface NativeShareApi {
  consume(): Promise<unknown>;
  releaseShare(options:{id:string}):Promise<unknown>;
  addListener(event: "shareAvailable", listener: () => void): Promise<PluginListenerHandle>;
}
interface NativeAiTransferApi {transferShareImagesToAi(options:{id:string;operationId:string}):Promise<unknown>}
export function createSharePort(api: NativeShareApi, aiApi?:NativeAiTransferApi): SharePort {
  return {
    async consume() {
      try {
        const reply = shareReplySchema.safeParse(await api.consume());
        if (!reply.success) throw new Error("share_unavailable");
        return reply.data;
      } catch { throw new Error("share_unavailable"); }
    },
    async listen(onAvailable) {
      try { const handle = await api.addListener("shareAvailable", onAvailable); return () => { void handle.remove().catch(() => {}); }; }
      catch { throw new Error("share_unavailable"); }
    },
    async release(options){
      if(!z.strictObject({id:z.uuid()}).safeParse(options).success)throw new Error("share_unavailable");
      try { const reply=await api.releaseShare(options); if(!z.union([z.undefined(),z.strictObject({})]).safeParse(reply).success)throw new Error(); }
      catch { throw new Error("share_unavailable"); }
    },
    async transferImages(options){
      if(!z.strictObject({id:z.uuid(),operationId:z.uuid()}).safeParse(options).success)throw new Error("share_unavailable");
      try { const native=aiApi??registerPlugin<NativeAiTransferApi>("LocalAiIntake");return parseTransferredAiImages(await native.transferShareImagesToAi(options),options.operationId); }
      catch { throw new Error("share_unavailable"); }
    },
  };
}
let runtime: ShareTargetController | undefined;
export function openShareTargetRuntime() {
  if (Capacitor.getPlatform() !== "android") return undefined;
  return runtime ??= new ShareTargetController(createSharePort(registerPlugin<NativeShareApi>("LocalShareTarget")));
}
