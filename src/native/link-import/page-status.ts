import type { ParsedPage, VisiblePageText, LinkErrorCode } from "./contract";

export type ReadQuality = "complete" | "partial" | "title_only" | "unreadable";

/** Describes what was actually read, not whether an AI could guess a recipe. */
export function classifyReadQuality(parsed: ParsedPage | null, visible: VisiblePageText | null): ReadQuality {
  if (!parsed || !visible) return "unreadable";
  if (parsed.candidates.some(candidate => candidate.quality === "complete")) return "complete";
  if (parsed.candidates.some(candidate => candidate.quality === "partial")) return "partial";
  const title = visible.title.replace(/\s+/gu, "").trim();
  const body = visible.text.split("\n").map(line => line.replace(/\s+/gu, "").trim()).filter(Boolean);
  if (body.some(line => line !== title)) return "partial";
  return title || body.length ? "title_only" : "unreadable";
}

/** Only clear interstitial headings count; a site's ordinary login button does not. */
export function accessFailure(visible: VisiblePageText, hasRecipe: boolean): LinkErrorCode | null {
  if (hasRecipe) return null;
  const title = visible.title.trim();
  if (/^(?:安全验证|访问验证|验证码|Security verification|Captcha)(?:\s*[-|｜].*)?$/iu.test(title)) return "challenge_required";
  if (/^(?:登录后查看|用户登录|请先登录|登录|Login|Sign in)(?:\s*[-|｜].*)?$/iu.test(title)) return "login_required";
  const text = visible.text.trim();
  if (text.length <= 150 && /^(?:请先|请)?登录后(?:才能|可|继续)?(?:查看|访问|浏览)[^。\n]*[。！!]?$/u.test(text)) return "login_required";
  return null;
}
