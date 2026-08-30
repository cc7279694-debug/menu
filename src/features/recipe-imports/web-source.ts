import "server-only";

import * as cheerio from "cheerio";

import type { SourceDocument } from "@/features/recipe-imports/schemas";

const MAX_TEXT_CHARS = 60_000;
const MAX_IMAGE_CANDIDATES = 12;
const MAX_VIDEO_CANDIDATES = 2;

function absoluteHttpUrl(value: string | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.protocol === "http:" && (url.hostname.endsWith(".xhscdn.com") || url.hostname.endsWith(".xhscdn.net") || url.hostname.endsWith(".xiaohongshu.com"))) {
      url.protocol = "https:";
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

export function extractPublicWebSource(input: { html: string; finalUrl: string }): SourceDocument {
  const $ = cheerio.load(input.html);
  const metadataText = normalizeText(
    $("meta[name='description'], meta[property='og:description']").map((_, element) => $(element).attr("content") ?? "").get().join(" "),
  );
  const structuredVideoCandidates = $("script[type='application/ld+json']").map((_, element) => {
    try {
      const value = JSON.parse($(element).text()) as unknown;
      return value && typeof value === "object" && "contentUrl" in value && typeof (value as { contentUrl?: unknown }).contentUrl === "string"
        ? (value as { contentUrl: string }).contentUrl
        : null;
    } catch {
      return null;
    }
  }).get().filter((value): value is string => Boolean(value));
  $("script, style, nav, footer, form, noscript, template, [hidden], [aria-hidden='true']").remove();
  const container = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const visibleText = normalizeText(container.text());
  const text = visibleText.length >= 40 ? visibleText : normalizeText([visibleText, metadataText].filter(Boolean).join(" "));
  const imageUrls: string[] = [];
  const addImageCandidate = (source: string | undefined) => {
    if (!source || source.startsWith("data:") || source.startsWith("blob:")) return;
    const absolute = absoluteHttpUrl(source, input.finalUrl);
    if (!absolute || /\.svg(?:$|[?#])/i.test(absolute)) return;
    if (!imageUrls.includes(absolute) && imageUrls.length < MAX_IMAGE_CANDIDATES) imageUrls.push(absolute);
  };
  $("meta[property='og:image'], meta[property='og:image:url'], meta[name='twitter:image']").each((_, element) => {
    addImageCandidate($(element).attr("content"));
  });
  container.find("img").each((_, element) => {
    const node = $(element);
    const source = node.attr("src") || node.attr("data-src") || node.attr("data-original") || node.attr("srcset")?.split(",")[0]?.trim().split(" ")[0];
    addImageCandidate(source);
  });

  const videoUrls: string[] = [];
  const videoCandidates = [
    structuredVideoCandidates,
    $("meta[property='og:video:secure_url'], meta[property='og:video:url'], meta[property='og:video']").map((_, element) => $(element).attr("content") ?? "").get(),
    $("video, video source").map((_, element) => $(element).attr("src") ?? "").get(),
  ].flat();
  for (const candidate of videoCandidates) {
    const absolute = absoluteHttpUrl(candidate, input.finalUrl);
    if (absolute && !videoUrls.includes(absolute) && videoUrls.length < MAX_VIDEO_CANDIDATES) videoUrls.push(absolute);
  }

  if (text.length < 40 && imageUrls.length === 0 && videoUrls.length === 0) throw new Error("网页中没有找到可整理的文字");
  const canonicalUrl = absoluteHttpUrl($("link[rel='canonical']").attr("href"), input.finalUrl);
  const title = $("meta[property='og:title']").attr("content")?.trim() || $("title").first().text().trim() || null;
  const author = $("meta[name='author'], meta[property='article:author']").first().attr("content")?.trim() || null;
  return {
    platform: new URL(input.finalUrl).hostname,
    title,
    author,
    canonicalUrl,
    text,
    imageUrls,
    videoUrls,
  };
}
