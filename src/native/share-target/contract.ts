import { z } from "zod";

const receipt = { id: z.uuid(), replaced: z.boolean() };
const url = z.string().min(1).max(8192).refine(value => {
  try { const parsed = new URL(value); return /^https?:$/i.test(parsed.protocol) && !parsed.username && !parsed.password && !/[\s\\]/u.test(value); }
  catch { return false; }
});
export const shareReplySchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("empty") }),
  z.strictObject({ ...receipt, status: z.literal("url"), url }),
  z.strictObject({ ...receipt, status: z.literal("invalid"), reason: z.enum(["no_url", "multiple_links", "unsafe_url", "oversized"]) }),
]);
export type ShareReply = z.infer<typeof shareReplySchema>;
export type ShareItem = Exclude<ShareReply, { status: "empty" }>;
export interface SharePort {
  consume(): Promise<ShareReply>;
  listen(onAvailable: () => void): Promise<() => void>;
}
export const shareReasons = {
  no_url: "分享内容里没有网页链接。",
  multiple_links: "分享内容包含多个不同链接，请只分享一个链接。",
  unsafe_url: "这个链接无法安全读取，请检查后手动输入。",
  oversized: "分享内容太长，请仅分享网页链接。",
} as const;
