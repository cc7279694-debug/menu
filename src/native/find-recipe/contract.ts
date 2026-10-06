import { z } from "zod";

const codePoints = (min: number, max: number) => z.string().trim().refine(value => Array.from(value).length >= min && Array.from(value).length <= max);
export const searchInputSchema = z.strictObject({ dish: codePoints(1, 120), preference: codePoints(0, 500) });

export function canonicalSourceUrl(value: string): string {
  if (value.length > 8192 || /[\s\\]/u.test(value)) throw new Error("invalid_url");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) throw new Error("invalid_url");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // Native verifies the full source authority too. JS accepts public DNS names only,
  // never address literals, local names or arbitrary ports from untrusted output.
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host === "localhost" || /\.(?:localhost|local|test|invalid|example)$/i.test(host)) throw new Error("invalid_url");
  // WHATWG URL normalizes dot segments and inserts an empty root slash. Use it
  // for authority checks only; membership must retain the exact raw path/query.
  const suffix = /^[a-z][a-z\d+.-]*:\/\/[^/?#]+([^#]*)/i.exec(value)?.[1];
  if (suffix === undefined) throw new Error("invalid_url");
  return `${url.protocol}//${host}${suffix}`;
}
const publicUrl = z.string().max(8192).refine(value => { try { canonicalSourceUrl(value); return true; } catch { return false; } });
export const candidateSchema = z.strictObject({
  id: z.string().min(1).max(120), title: codePoints(1, 120), sourceUrl: publicUrl,
  sourceHost: z.string().min(1).max(253), summary: codePoints(0, 500),
  highlights: z.array(codePoints(1, 160)).max(3), totalMinutes: z.number().int().min(1).max(525600).nullable(), preparationHint: codePoints(0, 500),
}).superRefine((candidate, context) => {
  if (candidate.sourceHost !== new URL(candidate.sourceUrl).hostname.toLowerCase().replace(/\.$/, "")) context.addIssue({ code: "custom", message: "Source host mismatch" });
});
export const searchReplySchema = z.strictObject({ candidates: z.array(candidateSchema).max(3) }).superRefine(({ candidates }, context) => {
  if (new Set(candidates.map(c => c.id)).size !== candidates.length || new Set(candidates.map(c => canonicalSourceUrl(c.sourceUrl))).size !== candidates.length) context.addIssue({ code: "custom", message: "Duplicate candidates" });
});
export const extractReplySchema = z.strictObject({ rawJson: z.string().refine(v => new TextEncoder().encode(v).length <= 2 * 1024 * 1024), sourceText: z.string().refine(v => Array.from(v).length <= 30000) });
export type RecipeCandidate = z.infer<typeof candidateSchema>;
export interface FinderPort {
  createSession(): Promise<{ sessionId: string }>;
  search(input: { sessionId: string; requestId: string; dish: string; preference: string }): Promise<{ candidates: RecipeCandidate[] }>;
  extract(input: { sessionId: string; requestId: string; candidateId: string }): Promise<{ rawJson: string; sourceText: string }>;
  cancel(input: { sessionId: string; requestId: string }): Promise<void>;
  discardSession(input: { sessionId: string }): Promise<void>;
}
const messages = {
  key_missing: "请先在设置中配置本机 AI 密钥。", key_unavailable: "请在设置中重新配置本机 AI 密钥。",
  input_invalid: "请输入 1～120 字的菜名，偏好不超过 500 字。", native_unavailable: "找做法仅支持 Android；本地菜谱仍可正常使用。",
  network_unavailable: "寻找做法需要联网，请检查网络；已有菜谱仍可离线使用。", timeout: "请求超时，请手动重试。",
  provider_access: "当前 AI 密钥、账号或模型无访问权限。", unauthorized: "当前 AI 密钥、账号或模型无访问权限。", forbidden: "当前 AI 密钥、账号或模型无访问权限。",
  search_failed: "寻找做法未成功，请重试或改为手动录入。", search_not_triggered: "未获得可验证的搜索结果，请手动重试。",
  source_missing: "没有找到可验证的公开来源。", source_mismatch: "这个来源暂时无法读取。", no_candidates: "暂时没有找到适合整理的公开菜谱。",
  extract_failed: "这个来源暂时无法读取。", source_unreadable: "这个来源暂时无法读取。", invalid_output: "返回结果未通过校验，请手动重试。",
  rate_limited: "请求过于频繁，请稍后重试。", provider_unavailable: "AI 服务暂不可用，请稍后重试。", response_too_large: "返回内容过大，请换一个来源。",
  cancelled: "已取消请求。", busy: "当前操作尚未结束，请稍候。", stale_session: "本轮寻找已结束，请重新开始。",
  save_uncertain: "保存结果尚未确认，请勿重复新建。", review_required: "请先检查推断或缺失内容，并明确确认。", storage_error: "本地保存未完成，请重试，不要清除数据。",
} as const;
export class FinderError extends Error { constructor(readonly code: keyof typeof messages) { super(messages[code]); this.name = "FinderError"; } }
export function safeFinderError(error: unknown): FinderError {
  const code = error instanceof FinderError ? error.code : error && typeof error === "object" && "code" in error ? error.code : null;
  return new FinderError(typeof code === "string" && Object.hasOwn(messages, code) ? code as keyof typeof messages : "invalid_output");
}
