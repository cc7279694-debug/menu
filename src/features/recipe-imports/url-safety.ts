import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "ORDINE-recipe-import/1.0";

export type PublicLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;

const lookupPublicHost: PublicLookup = (hostname, options) => dnsLookup(hostname, options);

function unsupportedAddress(): Error {
  return new Error("不支持访问该地址");
}

function isPrivateIpv4(value: string): boolean {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && b === 18);
}

function isPrivateIpv6(value: string): boolean {
  const normalized = value.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab][0-9a-f]*:/.test(normalized)) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateIpv4(normalized.slice(7));
  return false;
}

function isPrivateAddress(value: string): boolean {
  const kind = isIP(value);
  return kind === 4 ? isPrivateIpv4(value) : kind === 6 ? isPrivateIpv6(value) : true;
}

export async function assertSafePublicUrl(value: string, lookup: PublicLookup = lookupPublicHost): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw unsupportedAddress();
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !hostname || hostname === "localhost" || hostname.endsWith(".local")) {
    throw unsupportedAddress();
  }
  if (isIP(hostname) && isPrivateAddress(hostname)) throw unsupportedAddress();

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw unsupportedAddress();
  } catch (error) {
    if (error instanceof Error && error.message === "不支持访问该地址") throw error;
    throw unsupportedAddress();
  }
  return url;
}

async function readLimitedBody(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("网页内容过大");
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    if (signal.aborted) throw new Error("网页请求超时");
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("网页内容过大");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchWithTimeout(url: string, fetchImpl: typeof fetch): Promise<{ response: Response; body: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,text/plain", "User-Agent": USER_AGENT },
    });
    const body = response.ok ? await readLimitedBody(response, controller.signal) : "";
    return { response, body };
  } catch (error) {
    if (error instanceof Error && ["网页内容过大", "网页请求超时"].includes(error.message)) throw error;
    if (controller.signal.aborted) throw new Error("网页请求超时");
    throw new Error("网页暂时无法访问");
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPublicDocument(
  value: string,
  dependencies: { lookup?: PublicLookup; fetchImpl?: typeof fetch } = {},
): Promise<{ finalUrl: string; contentType: string; body: string }> {
  const lookup = dependencies.lookup ?? lookupPublicHost;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  let currentUrl = (await assertSafePublicUrl(value, lookup)).toString();

  for (let redirectCount = 0; ; redirectCount += 1) {
    const { response, body } = await fetchWithTimeout(currentUrl, fetchImpl);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= MAX_REDIRECTS) throw new Error("网页跳转次数过多");
      const location = response.headers.get("location");
      if (!location) throw new Error("网页暂时无法访问");
      currentUrl = (await assertSafePublicUrl(new URL(location, currentUrl).toString(), lookup)).toString();
      continue;
    }
    if (!response.ok) throw new Error("网页暂时无法访问");
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (contentType !== "text/html" && contentType !== "text/plain") throw new Error("网页格式不受支持");
    return { finalUrl: currentUrl, contentType, body };
  }
}
