import { z } from "zod";
import type { RecipeDetailsInput } from "../recipe-model";

export const LINK_LIMITS = Object.freeze({ htmlBytes: 2 * 1024 * 1024, textCodePoints: 28000, urlCharacters: 8192, redirects: 3 });
const httpUrl = z.string().max(LINK_LIMITS.urlCharacters).refine(value => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.port; } catch { return false; }
}, "网页地址无效");
export const linkReadSchema = z.strictObject({ requestId: z.uuid(), url: httpUrl });
export const fetchedPageSchema = z.strictObject({
  finalUrl: httpUrl,
  contentType: z.enum(["text/html", "application/xhtml+xml"]),
  html: z.string().refine(value => new TextEncoder().encode(value).length <= LINK_LIMITS.htmlBytes, "网页过大"),
});
export type FetchedPage = z.infer<typeof fetchedPageSchema>;
export type LinkReadRequest = z.infer<typeof linkReadSchema>;
export interface WebImportPort { read(request: LinkReadRequest): Promise<FetchedPage>; cancel(requestId: string): Promise<void> }
export type ParserQuality = "complete" | "partial" | "none";
export type RecipeCandidate = { id: string; recipe: RecipeDetailsInput; quality: ParserQuality; score: number; documentOrder: number; warnings: string[] };
export type ParsedPage = { candidates: RecipeCandidate[]; needsSelection: boolean; title: string; warnings: string[] };
export type VisiblePageText = { title: string; text: string; wasTruncated: boolean };

const messages = {
  invalid_url: "请输入完整的 http 或 https 网页链接。", unsafe_url: "该地址不属于可导入的公开网页。",
  unsupported_scheme: "仅支持 http 或 https 普通网页。", unsupported_port: "不支持自定义端口的网页。",
  dns_blocked: "该网页地址不符合公开网络安全要求。", redirect_blocked: "网页跳转不符合安全要求。",
  too_many_redirects: "网页跳转次数过多，请改用截图或文字。", network_unavailable: "暂时无法读取网页，请检查网络；已有菜谱仍可离线使用。",
  timeout: "读取网页超时，请手动重试。", http_error: "网页暂时不可访问，请改用截图或文字。",
  unsupported_content: "该链接不是可读取的 HTML 网页。", page_too_large: "网页内容过大，请改用截图或文字。",
  page_unreadable: "网页内容无法读取，请改用截图或文字。", recipe_not_found: "这个网页没有完整的结构化菜谱。",
  parser_partial: "已读取到部分菜谱信息。", ai_key_missing: "请先在设置中配置本机 AI 密钥。",
  ai_failed: "AI 整理未成功，请手动重试或直接完善。", invalid_ai_output: "AI 返回内容不完整，请重试或手动录入。",
  busy: "当前操作尚未结束，请稍候。", cancelled: "已取消读取。", stale_session: "本轮导入已结束，请重新进入。",
  native_unavailable: "网页读取仅支持 Android；本地菜谱仍可使用。", storage_error: "本地保存失败，当前内容尚未保存。",
  save_uncertain: "保存结果尚未确认，请勿重复新建。",
} as const;
export type LinkErrorCode = keyof typeof messages;
export class LinkImportError extends Error {
  constructor(readonly code: LinkErrorCode) { super(messages[code]); this.name = "LinkImportError"; }
}
export function safeLinkError(error: unknown): LinkImportError {
  if (error instanceof LinkImportError) return error;
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  return new LinkImportError(typeof code === "string" && Object.hasOwn(messages, code) ? code as LinkErrorCode : "page_unreadable");
}
