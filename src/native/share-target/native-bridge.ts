import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { shareReplySchema, type SharePort } from "./contract";
import { ShareTargetController } from "./controller";

export interface NativeShareApi {
  consume(): Promise<unknown>;
  addListener(event: "shareAvailable", listener: () => void): Promise<PluginListenerHandle>;
}
export function createSharePort(api: NativeShareApi): SharePort {
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
  };
}
let runtime: ShareTargetController | undefined;
export function openShareTargetRuntime() {
  if (Capacitor.getPlatform() !== "android") return undefined;
  return runtime ??= new ShareTargetController(createSharePort(registerPlugin<NativeShareApi>("LocalShareTarget")));
}
