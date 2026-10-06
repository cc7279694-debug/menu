import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";
import { extractReplySchema, searchInputSchema, searchReplySchema, FinderError, safeFinderError, type FinderPort } from "./contract";
export interface NativeFinderApi {
  createSession(): Promise<unknown>; search(input: Parameters<FinderPort["search"]>[0]): Promise<unknown>;
  extract(input: Parameters<FinderPort["extract"]>[0]): Promise<unknown>;
  cancel(input: Parameters<FinderPort["cancel"]>[0]): Promise<unknown>;
  discardSession(input: { sessionId: string }): Promise<unknown>;
}
const session = z.strictObject({ sessionId: z.uuid() }), request = session.extend({ requestId: z.uuid() });
const empty = z.union([z.undefined(), z.strictObject({})]);
export function createFinderPort(api?: NativeFinderApi): FinderPort {
  let native = api;
  const get = () => native ?? (native = registerPlugin<NativeFinderApi>("LocalRecipeFinder"));
  async function run<T>(work: () => Promise<unknown>, schema: z.ZodType<T>): Promise<T> {
    if (!api && !Capacitor.isNativePlatform()) throw new FinderError("native_unavailable");
    try { const parsed = schema.safeParse(await work()); if (!parsed.success) throw new FinderError("invalid_output"); return parsed.data; } catch (error) { throw safeFinderError(error); }
  }
  function check<T>(value: unknown, schema: z.ZodType<T>): T { const parsed = schema.safeParse(value); if (!parsed.success) throw new FinderError("input_invalid"); return parsed.data; }
  return {
    createSession: () => run(() => get().createSession(), session),
    search: input => run(() => get().search(check(input, request.extend(searchInputSchema.shape))), searchReplySchema),
    extract: input => run(() => get().extract(check(input, request.extend({ candidateId: z.string().min(1).max(120) }))), extractReplySchema),
    cancel: async input => { await run(() => get().cancel(check(input, request)), empty); },
    discardSession: async input => { await run(() => get().discardSession(check(input, session)), empty); },
  };
}
