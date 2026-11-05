import { load } from "cheerio/slim";

export type XhsPageDiagnostic = "target_text" | "target_empty" | "media_only" | "unresolved_link" | "state_missing" | "state_unsupported" | "target_missing" | "invalid_content" | "safety_limit" | "login_required" | "challenge_required";
export type XhsPublicPage = { title: string; text: string; media: "image" | "video" | null; access: "login_required" | "challenge_required" | null; warnings: string[]; wasTruncated: boolean; statePresent: boolean; targetResolved: boolean; diagnostic: XhsPageDiagnostic };
const MAX_HTML_BYTES = 2 * 1024 * 1024, MAX_STATE_BYTES = 256 * 1024, MAX_DEPTH = 32, MAX_NODES = 4000, MAX_TEXT = 28000;
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const own = (value: Record<string, unknown> | null, key: string): unknown => value && Object.hasOwn(value, key) ? value[key] : undefined;
const bytes = (value: string) => new TextEncoder().encode(value).length;

/** JSON plus a single inert serialization extension: bare undefined values become null.
 * No expression evaluation, property access, calls, comments or script execution. */
function readState(source: string): unknown {
  if (bytes(source) > MAX_STATE_BYTES) throw new RangeError("state limit");
  let quoted = false, escaped = false, depth = 0, previous = "", normalized = "";
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      normalized += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') { quoted = false; previous = '"'; }
      continue;
    }
    if (character === '"') { quoted = true; normalized += character; continue; }
    if (character === "{" || character === "[") { if (++depth > MAX_DEPTH) throw new RangeError("state depth"); }
    if (character === "}" || character === "]") depth--;
    if (character === "u" && source.startsWith("undefined", index)) {
      let end = index + 9; while (/\s/u.test(source[end] ?? "") && end < source.length) end++;
      if ((previous === ":" || previous === "[" || previous === ",") && [",", "}", "]"].includes(source[end] ?? "")) {
        normalized += "null"; previous = "l"; index += 8; continue;
      }
    }
    normalized += character; if (!/\s/u.test(character)) previous = character;
  }
  const parsed: unknown = JSON.parse(normalized);
  let nodes = 0; const pending: unknown[] = [parsed];
  while (pending.length) {
    const item = pending.pop(); if (++nodes > MAX_NODES) throw new RangeError("state nodes");
    if (item !== null && typeof item === "object") for (const child of Object.values(item)) pending.push(child);
  }
  return parsed;
}

function prose(value: unknown, limit: number): string {
  if (typeof value !== "string" || Array.from(value).length > limit) return "";
  const $ = load(value); $("script,style,iframe,object,embed,form,template,noscript,[hidden],[aria-hidden='true']").remove();
  $("[style]").each((_, node) => { if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/iu.test(($(node).attr("style") ?? "").replace(/\/\*[\s\S]*?\*\//gu, ""))) $(node).remove(); });
  $("br").replaceWith("\n"); $("p,li,div,section").append("\n");
  return $.root().text().split(/\r?\n/u).map(line => line.replace(/[\t ]+/gu, " ").trim()).filter(Boolean).join("\n");
}

function noteFromEntry(value: unknown): Record<string, unknown> | null {
  const entry = object(value);
  if (!entry) return null;
  // Only two inert record shapes are accepted; never recursively search recommendations.
  if (Object.hasOwn(entry, "note")) return object(own(entry, "note"));
  return ["noteId", "title", "desc", "type", "imageList"].some(key => Object.hasOwn(entry, key)) ? entry : null;
}

function noteFromState(state: unknown, noteId: string | null): { note: Record<string, unknown> | null; supported: boolean } {
  // A singleton recommendation on an unresolved short page is not target identity.
  const legacy = object(own(object(state), "note"));
  if (!legacy || !Object.hasOwn(legacy, "noteDetailMap")) {
    // A second public serialization layout, not a recursive search or a fallback
    // from a conflicting/malformed legacy map. Its embedded identity is mandatory.
    const mobile = object(own(object(state), "noteData"));
    const data = object(own(mobile, "data"));
    const note = object(own(data, "noteData"));
    return { note: noteId && note && own(note, "noteId") === noteId ? note : null, supported: note !== null };
  }
  const notes = object(own(legacy, "noteDetailMap"));
  if (!notes) return { note: null, supported: false };
  if (!noteId) return { note: null, supported: true };
  const values = Object.values(notes).map(noteFromEntry).filter((item): item is Record<string, unknown> => item !== null);
  const direct = noteFromEntry(own(notes, noteId));
  if (direct && (own(direct, "noteId") === undefined || own(direct, "noteId") === noteId)) return { note: direct, supported: true };
  const matching = values.filter(item => own(item, "noteId") === noteId);
  return { note: matching.length === 1 ? matching[0] : null, supported: true };
}

export function extractXhsPublicPage(html: string, finalUrl: string): XhsPublicPage | null {
  let url: URL;
  try { url = new URL(finalUrl); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (!["http:", "https:"].includes(url.protocol) || !["xiaohongshu.com", "xhslink.cn", "xhslink.com"].some(root => host === root || host.endsWith(`.${root}`))) return null;
  const result: XhsPublicPage = { title: "", text: "", media: null, access: null, warnings: [], wasTruncated: false, statePresent: false, targetResolved: false, diagnostic: "state_missing" };
  if (/^\/login(?:\/|$)/iu.test(url.pathname)) { result.access = "login_required"; result.diagnostic = result.access; return result; }
  if (bytes(html) > MAX_HTML_BYTES) { result.warnings.push("网页超出安全解析上限，请改用文字或截图。"); result.wasTruncated = true; result.diagnostic = "safety_limit"; return result; }
  const $ = load(html);
  const noteId = /^\/(?:explore|discovery\/item)\/([a-z\d_-]{1,128})\/?$/iu.exec(url.pathname)?.[1] ?? null;
  const scripts = $("script").toArray();
  let examined = 0, supportedState = false;
  for (const element of scripts) {
    const source = $(element).text().trim();
    const assignment = /^(?:window\.)?__INITIAL_STATE__\s*=\s*/u.exec(source);
    const jsonElement = $(element).attr("id") === "__INITIAL_STATE__" && $(element).attr("type")?.toLowerCase() === "application/json";
    if (!assignment && !jsonElement) continue;
    result.statePresent = true;
    if (++examined > 4) { result.wasTruncated = true; result.diagnostic = "safety_limit"; result.warnings.push("网页状态超出安全解析上限，请检查缺失内容。"); break; }
    let payload = assignment ? source.slice(assignment[0].length).trim() : source;
    if (assignment && payload.endsWith(";")) payload = payload.slice(0, -1).trimEnd();
    try {
      const candidate = noteFromState(readState(payload), noteId);
      supportedState ||= candidate.supported;
      const note = candidate.note; if (!note) continue;
      result.targetResolved = true;
      result.title = prose(own(note, "title"), 500);
      const rawText = own(note, "desc"); result.text = prose(rawText, MAX_TEXT);
      if (typeof rawText === "string" && Array.from(rawText).length > MAX_TEXT) { result.wasTruncated = true; result.warnings.push("笔记正文超出安全解析上限，请补充缺失内容。"); }
      result.media = own(note, "type") === "video" ? "video" : Array.isArray(own(note, "imageList")) && (own(note, "imageList") as unknown[]).length > 0 ? "image" : null;
      result.diagnostic = result.wasTruncated ? "safety_limit" : rawText !== undefined && rawText !== null && typeof rawText !== "string" ? "invalid_content" : result.text ? "target_text" : result.media ? "media_only" : "target_empty";
      break;
    } catch (error) {
      const limited = error instanceof RangeError; result.wasTruncated ||= limited;
      if (limited) result.diagnostic = "safety_limit";
      result.warnings.push(limited ? "网页状态超出安全解析上限，请改用文字或截图。" : "网页状态不是可安全读取的资料，请改用文字或截图。");
    }
  }
  if (!result.targetResolved && result.diagnostic !== "safety_limit") result.diagnostic = !noteId ? "unresolved_link" : !result.statePresent ? "state_missing" : supportedState ? "target_missing" : "state_unsupported";
  if (!result.targetResolved) result.warnings.push("未读取到目标笔记正文，请补充文字或截图。");
  for (const heading of [prose($("title").first().text(), 500), prose($("h1,h2").first().toString(), 2000)].map(text => text.replace(/\s+/gu, " "))) {
    if (/^(?:(?:登录|请先登录|登录后查看(?:笔记|内容)?|登录小红书|立即登录)(?:\s*[-|·]\s*小红书)?|小红书\s*[-|·]\s*登录)$/u.test(heading)) result.access = "login_required";
    else if (/^(?:安全验证|验证码|访问验证|访问受限|请完成验证|请先完成验证)(?:\s*[-|·]\s*小红书)?$/u.test(heading)) result.access = "challenge_required";
  }
  if (result.access) { result.text = ""; result.diagnostic = result.access; }
  return result;
}
