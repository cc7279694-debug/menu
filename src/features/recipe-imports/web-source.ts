import "server-only";

import * as cheerio from "cheerio";

import type { SourceDocument } from "@/features/recipe-imports/schemas";

const MAX_TEXT_CHARS = 60_000;
const MAX_IMAGE_CANDIDATES = 12;

function absoluteHttpUrl(value: string | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return /^https?:$/.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

export function extractPublicWebSource(input: { html: string; finalUrl: string }): SourceDocument {
  const $ = cheerio.load(input.html);
  $("script, style, nav, footer, form, noscript, template, [hidden], [aria-hidden='true']").remove();
  const container = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const text = normalizeText(container.text());
  const imageUrls: string[] = [];
  container.find("img, source").each((_, element) => {
    const node = $(element);
    const source = node.attr("src") || node.attr("data-src") || node.attr("data-original") || node.attr("srcset")?.split(",")[0]?.trim().split(" ")[0];
    const absolute = absoluteHttpUrl(source, input.finalUrl);
    if (absolute && !imageUrls.includes(absolute) && imageUrls.length < MAX_IMAGE_CANDIDATES) imageUrls.push(absolute);
  });

  if (text.length < 40 && imageUrls.length === 0) throw new Error("网页中没有找到可整理的文字");
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
  };
}
