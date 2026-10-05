import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
import { fetchedPageSchema, linkReadSchema, LinkImportError, safeLinkError, type WebImportPort, type LinkReadRequest } from "./contract";

export interface NativeWebImportApi {
  read(request: LinkReadRequest): Promise<unknown>;
  cancel(request: { requestId: string }): Promise<unknown>;
}
export function createWebImportPort(api?: NativeWebImportApi): WebImportPort {
  let native = api;
  const getNative = () => native ?? (native = registerPlugin<NativeWebImportApi>("LocalWebImport"));
  function supported() { if (!api && !Capacitor.isNativePlatform()) throw new LinkImportError("native_unavailable"); }
  return {
    async read(request) {
      const checked = linkReadSchema.safeParse(request);
      if (!checked.success) throw new LinkImportError("invalid_url");
      supported();
      try {
        const reply = fetchedPageSchema.safeParse(await getNative().read(checked.data));
        if (!reply.success) throw new LinkImportError("page_unreadable");
        return reply.data;
      } catch (error) { throw safeLinkError(error); }
    },
    async cancel(requestId) {
      if (!z.uuid().safeParse(requestId).success) throw new LinkImportError("stale_session");
      supported();
      try {
        const result = await getNative().cancel({ requestId });
        if (!z.union([z.undefined(), z.strictObject({})]).safeParse(result).success) throw new LinkImportError("page_unreadable");
      } catch (error) { throw safeLinkError(error); }
    },
  };
}
