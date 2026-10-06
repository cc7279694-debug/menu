import { z } from "zod";
import type { AiTemporaryImage } from "../ai/native-bridge";

const receipt = { id: z.uuid(), replaced: z.boolean() };
const text = z.string().refine(value => new TextEncoder().encode(value).length <= 32768 && Array.from(value).length <= 30000);
const url = z.string().min(1).max(8192).refine(value => {
  try { const parsed = new URL(value); return /^https?:$/i.test(parsed.protocol) && !parsed.username && !parsed.password && !/[\s\\]/u.test(value); }
  catch { return false; }
});
export const shareReplySchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("empty") }),
  z.strictObject({ ...receipt, status: z.literal("url"), url, companionText: text.optional() }),
  z.strictObject({ ...receipt, status: z.literal("text"), text: text.refine(value => !!value.trim()) }),
  z.strictObject({ ...receipt, status: z.literal("media"), text: text.optional(), imageCount: z.number().int().min(1).max(6) }),
  z.strictObject({ ...receipt, status: z.literal("invalid"), reason: z.enum(["no_url", "multiple_links", "unsafe_url", "oversized", "unsupported_media", "too_many_images", "image_invalid", "image_unreadable", "timeout", "storage_error"]), text: text.optional() }).refine(value => value.text === undefined || value.reason === "multiple_links"),
]);
export type ShareReply = z.infer<typeof shareReplySchema>;
export type ShareItem = Exclude<ShareReply, { status: "empty" }>;
export interface SharePort {
  consume(): Promise<ShareReply>;
  listen(onAvailable: () => void): Promise<() => void>;
  release(options: {id:string}): Promise<void>;
  transferImages(options: {id:string;operationId:string}): Promise<AiTemporaryImage[]>;
}
export const shareReasons = {
  no_url: "分享内容里没有网页链接。",
  multiple_links: "分享内容包含多个不同链接，无法确定要导入哪一个。",
  unsafe_url: "这个链接无法安全读取，请检查后手动输入。",
  oversized: "分享文字超出长度限制，请减少文字后重新分享。",
  unsupported_media: "不支持这次分享的图片格式，请使用 JPG、PNG 或静态 WebP。",
  too_many_images: "最多支持 6 张图片；本次分享未导入，请重新选择。",
  image_invalid: "分享图片无效或超出大小、像素限制。",
  image_unreadable: "无法读取分享图片，请重新从原应用分享。",
  timeout: "读取分享图片超时，已停止处理；请重新分享。",
  storage_error: "分享图片暂存或清理失败，请检查本机可用空间后重试。",
} as const;
