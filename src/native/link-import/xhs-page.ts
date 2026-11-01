import { load } from "cheerio/slim";

export type XhsPublicPage = { title: string; text: string; media: "image" | "video" | null; access: "login_required" | "challenge_required" | null; warnings: string[]; wasTruncated: boolean; statePresent: boolean; targetResolved: boolean };
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

function noteFromState(state: unknown, noteId: string | null, allowSingle: boolean): Record<string, unknown> | null {
  const notes = object(own(object(own(object(state), "note")), "noteDetailMap"));
  if (!notes) return null;
  const values = Object.values(notes).map(item => object(own(object(item), "note"))).filter((item): item is Record<string, unknown> => item !== null);
  if (!noteId) {
    if (!allowSingle || values.length !== 1) return null;
    const embeddedId = own(values[0], "noteId");
    return embeddedId === undefined || typeof embeddedId === "string" && /^[a-z\d_-]{1,128}$/iu.test(embeddedId) ? values[0] : null;
  }
  const direct = object(own(object(own(notes, noteId)), "note"));
  if (direct && (own(direct, "noteId") === undefined || own(direct, "noteId") === noteId)) return direct;
  const matching = values.filter(item => own(item, "noteId") === noteId);
  return matching.length === 1 ? matching[0] : null;
}

export function extractXhsPublicPage(html: string, finalUrl: string): XhsPublicPage | null {
  let url: URL;
  try { url = new URL(finalUrl); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (!["http:", "https:"].includes(url.protocol) || !["xiaohongshu.com", "xhslink.cn", "xhslink.com"].some(root => host === root || host.endsWith(`.${root}`))) return null;
  const result: XhsPublicPage = { title: "", text: "", media: null, access: null, warnings: [], wasTruncated: false, statePresent: false, targetResolved: false };
  if (/^\/login(?:\/|$)/iu.test(url.pathname)) { result.access = "login_required"; return result; }
  if (bytes(html) > MAX_HTML_BYTES) { result.warnings.push("网页超出安全解析上限，请改用文字或截图。"); result.wasTruncated = true; return result; }
  const $ = load(html);
  const noteId = /^\/(?:explore|discovery\/item)\/([a-z\d_-]{1,128})\/?$/iu.exec(url.pathname)?.[1] ?? null;
  const isNoteRoute = /^\/(?:explore|discovery\/item)(?:\/|$)/iu.test(url.pathname);
  const shortHost = ["xhslink.cn", "xhslink.com"].some(root => host === root || host.endsWith(`.${root}`));
  const scripts = $("script").toArray();
  let examined = 0;
  for (const element of scripts) {
    const source = $(element).text().trim();
    const assignment = /^(?:window\.)?__INITIAL_STATE__\s*=\s*/u.exec(source);
    const jsonElement = $(element).attr("id") === "__INITIAL_STATE__" && $(element).attr("type")?.toLowerCase() === "application/json";
    if (!assignment && !jsonElement) continue;
    result.statePresent = true;
    if (++examined > 4) { result.wasTruncated = true; result.warnings.push("网页状态超出安全解析上限，请检查缺失内容。"); break; }
    let payload = assignment ? source.slice(assignment[0].length).trim() : source;
    if (assignment && payload.endsWith(";")) payload = payload.slice(0, -1).trimEnd();
    try {
      const note = noteFromState(readState(payload), noteId, shortHost && !isNoteRoute); if (!note) continue;
      result.targetResolved = true;
      result.title = prose(own(note, "title"), 500);
      const rawText = own(note, "desc"); result.text = prose(rawText, MAX_TEXT);
      if (typeof rawText === "string" && Array.from(rawText).length > MAX_TEXT) { result.wasTruncated = true; result.warnings.push("笔记正文超出安全解析上限，请补充缺失内容。"); }
      result.media = own(note, "type") === "video" ? "video" : Array.isArray(own(note, "imageList")) && (own(note, "imageList") as unknown[]).length > 0 ? "image" : null;
      break;
    } catch (error) {
      const limited = error instanceof RangeError; result.wasTruncated ||= limited;
      result.warnings.push(limited ? "网页状态超出安全解析上限，请改用文字或截图。" : "网页状态不是可安全读取的资料，请改用文字或截图。");
    }
  }
  if (result.statePresent && !result.targetResolved) result.warnings.push("未读取到目标笔记正文，请补充文字或截图。");
  for (const heading of [prose($("title").first().text(), 500), prose($("h1,h2").first().toString(), 2000)].map(text => text.replace(/\s+/gu, " "))) {
    if (/^(?:(?:登录|请先登录|登录后查看(?:笔记|内容)?|登录小红书|立即登录)(?:\s*[-|·]\s*小红书)?|小红书\s*[-|·]\s*登录)$/u.test(heading)) result.access = "login_required";
    else if (/^(?:安全验证|验证码|访问验证|访问受限|请完成验证|请先完成验证)(?:\s*[-|·]\s*小红书)?$/u.test(heading)) result.access = "challenge_required";
  }
  if (result.access) result.text = "";
  return result;
}
