// Independent Stage 0 probe: no imports into production and no persistent sample/body output.
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";

const PAGE_LIMIT = 2 * 1024 * 1024, RANGE_LIMIT = 65536, TIMEOUT = 20000;
const REDIRECT = new Set([301,302,303,307,308]);
const fail = code => Object.assign(new Error(code), {category:code});
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const hostOf = url => url.hostname.replace(/^\[|\]$/g, "").replace(/\.+$/, "").toLowerCase();
function v4(address) {
  const [a,b,c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 && (c === 0 || c === 2) || b === 88 && c === 99) || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
}
export function isGlobalAddress(address) {
  const family = isIP(address);
  if (family === 4) return v4(address);
  if (family !== 6) return false;
  let text = address.toLowerCase();
  if (text.includes(".")) {
    const at = text.lastIndexOf(":"), parts = text.slice(at + 1).split(".").map(Number);
    text = text.slice(0,at + 1) + ((parts[0] << 8) | parts[1]).toString(16) + ":" + ((parts[2] << 8) | parts[3]).toString(16);
  }
  const halves = text.split("::"), left = halves[0] ? halves[0].split(":") : [], right = halves[1] ? halves[1].split(":") : [];
  const groups = halves.length === 1 ? left : [...left,...Array(8 - left.length - right.length).fill("0"),...right];
  const b = groups.flatMap(group => { const number = parseInt(group,16); return [number >> 8,number & 255]; });
  if (b.slice(0,10).every(value => value === 0) && b[10] === 255 && b[11] === 255) return v4(b.slice(12).join("."));
  if ((b[0] & 224) !== 32) return false;
  if (b[0] === 32 && b[1] === 1 && ((b[2] & 254) === 0 || b[2] === 13 && b[3] === 184)) return false;
  return !(b[0] === 32 && b[1] === 2 || b[0] === 63 && b[1] === 255 && (b[2] & 240) === 0);
}
export function safeTarget(input) {
  if (typeof input !== "string" || !input || input.length > 8192 || /[\s\\\x00-\x1f\x7f]/u.test(input)) throw fail("invalid_url");
  let url; try { url = new URL(input); } catch { throw fail("invalid_url"); }
  if (!["http:","https:"].includes(url.protocol)) throw fail("unsupported_scheme");
  if (url.username || url.password || input.match(/^https?:\/\/[^/]*@/i)) throw fail("unsafe_url");
  const host = hostOf(url);
  if (!host || host.includes("%") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw fail("unsafe_url");
  if (url.port) throw fail("unsupported_port"); // WHATWG strips the protocol's default port only.
  if (isIP(host) && !isGlobalAddress(host)) throw fail("unsafe_url");
  url.hash = "";
  return url;
}
export async function publicAddresses(url, resolver = host => lookup(host,{all:true,verbatim:true})) {
  const host = hostOf(url), addresses = isIP(host) ? [{address:host,family:isIP(host)}] : await resolver(host);
  const dns = {allPublic:addresses.length > 0 && addresses.every(item => isGlobalAddress(item.address)),fakeIp:addresses.some(item => /^198\.(?:18|19)\./.test(item.address)),count:addresses.length};
  if (!dns.allPublic || addresses.length > 64) throw Object.assign(fail("dns_blocked"),{dns});
  return addresses;
}
export function pinnedLookup(host, addresses) {
  return (requested, options, callback) => {
    if (requested.toLowerCase().replace(/\.+$/, "") !== host) return callback(fail("unbound_host"));
    const family = typeof options === "number" ? options : options.family;
    const selected = family ? addresses.filter(item => item.family === family) : addresses;
    if (!selected.length) return callback(fail("network_unavailable"));
    if (options.all) callback(null,selected); else callback(null,selected[0].address,selected[0].family);
  };
}
export async function boundedBytes(stream, limit, allowPrefix = false) {
  const chunks = []; let count = 0;
  for await (const value of stream) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    if (count + chunk.length > limit) {
      if (!allowPrefix) throw fail("body_limit");
      chunks.push(chunk.subarray(0,limit - count));
      stream.destroy(); return {bytes:Buffer.concat(chunks),complete:false};
    }
    chunks.push(chunk); count += chunk.length;
    if (allowPrefix && count === limit) { stream.destroy(); return {bytes:Buffer.concat(chunks),complete:false}; }
  }
  return {bytes:Buffer.concat(chunks),complete:true};
}
function mimeOf(headers) {
  const mime = String(headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(mime) ? mime : "unknown";
}
function sizeOf(headers) {
  const value = String(headers["content-length"] || "");
  return /^\d{1,15}$/.test(value) ? Number(value) : null;
}
export async function readResponseBody(response, mode) {
  if (mode === "HEAD" || REDIRECT.has(response.statusCode)) { response.destroy(); return {bytes:Buffer.alloc(0),complete:true}; }
  if (response.headers["content-encoding"] && response.headers["content-encoding"].toLowerCase() !== "identity") throw fail("unsupported_encoding");
  const htmlMode = mode === "GET_HTML" && ["text/html","application/xhtml+xml"].includes(mimeOf(response.headers));
  // A page GET that unexpectedly resolves to media is closed without reading it.
  // Only the subsequent explicit HEAD / bounded Range checks inspect media.
  if (mode === "GET_HTML" && !htmlMode) { response.destroy(); return {bytes:Buffer.alloc(0),complete:false}; }
  if (htmlMode && sizeOf(response.headers) > PAGE_LIMIT) throw fail("body_limit");
  return boundedBytes(response,htmlMode ? PAGE_LIMIT : RANGE_LIMIT,!htmlMode);
}
function sanitizedTarget(url) {
  const match = url.pathname.match(/^\/video\/(\d+)\/?$/);
  return {host:hostOf(url),pathType:match ? "video/numeric-id" : url.pathname === "/" ? "root" : "other",videoIdDigits:match ? match[1].length : null};
}
export async function directTransport(url, mode) {
  const deadline = AbortSignal.timeout(TIMEOUT);
  let addresses;
  try { addresses = await Promise.race([publicAddresses(url),new Promise((_,reject) => deadline.addEventListener("abort",() => reject(fail("timeout")),{once:true}))]); }
  catch (error) { throw error.category ? error : fail("dns_unavailable"); }
  const dns = {allPublic:true,fakeIp:false,count:addresses.length}, headers = {"User-Agent":"RECIPIO/0.8 Stage0 PublicProbe","Accept-Encoding":"identity","Accept":mode === "GET_HTML" ? "text/html, application/xhtml+xml" : "video/*, application/octet-stream"};
  if (mode === "RANGE") headers.Range = "bytes=0-65535";
  return new Promise((resolve,reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(url,{method:mode === "HEAD" ? "HEAD" : "GET",headers,agent:false,lookup:pinnedLookup(hostOf(url),addresses),signal:deadline}, async response => {
      try {
        const result = await readResponseBody(response,mode);
        resolve({status:response.statusCode,headers:response.headers,body:result.bytes,byteCount:result.bytes.length,complete:result.complete,dns});
      } catch (error) { response.destroy(); reject(error.category ? error : fail("network_unavailable")); }
    });
    request.setTimeout(8000,() => request.destroy(fail("timeout")));
    request.on("error",error => reject(error.category ? error : fail(deadline.aborted ? "timeout" : "network_unavailable")));
    request.end();
  });
}
async function chain(source, mode, transport, events) {
  let url = safeTarget(source); const visited = new Set(); let secure = url.protocol === "https:";
  for (let hop = 0; ; hop++) {
    if (visited.has(url.href)) throw fail("redirect_loop"); visited.add(url.href);
    const response = await transport(url,mode);
    events.push({...sanitizedTarget(url),status:response.status,mime:mimeOf(response.headers),bytes:response.byteCount,dns:response.dns});
    if (!REDIRECT.has(response.status)) return {url,response};
    if (hop >= 3) throw fail("too_many_redirects");
    const location = response.headers.location;
    if (typeof location !== "string" || location.length > 8192 || /[\s\\\x00-\x1f\x7f]/u.test(location)) throw fail("redirect_blocked");
    let next; try { next = safeTarget(new URL(location,url).href); } catch (error) { throw error.category ? error : fail("redirect_blocked"); }
    if (secure && next.protocol !== "https:") throw fail("redirect_blocked");
    secure ||= next.protocol === "https:"; url = next;
  }
}
export function analyzeHtml(html, base = "https://example.org/") {
  const $ = load(html), candidates = [], seen = new Set(), fields = new Set(); let jsonBlocks = 0, jsonParsed = 0, nodes = 0, scanLimited = false;
  const add = (value, source) => {
    if (typeof value !== "string" || candidates.length >= 8) return;
    try { const url = safeTarget(new URL(value,base).href); if (!seen.has(url.href)) { seen.add(url.href); candidates.push({url:url.href,source}); } } catch { /* Unsafe candidates are not fetched. */ }
  };
  const standard = new Set(["og:video","og:video:url","og:video:secure_url","twitter:player","twitter:player:stream"]);
  $("meta").each((_,element) => { const key = ($(element).attr("property") || $(element).attr("name") || "").toLowerCase(); if (standard.has(key)) { fields.add(key); add($(element).attr("content"),"standard"); } else if (key === "og:video:type") fields.add(key); });
  const publicFieldNames = new Set(["video","play","playaddr","play_url","download","downloadaddr","bitrate","src","url","urllist","url_list","video_url","contenturl","embedurl","playapi"]);
  const walk = (value, source, path = [], depth = 0) => {
    if (++nodes > 10000 || depth > 32) { scanLimited = true; return; }
    if (Array.isArray(value)) { value.forEach(child => walk(child,source,path,depth + 1)); return; }
    if (!value || typeof value !== "object") return;
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some(type => typeof type === "string" && /(?:^|\/)VideoObject$/i.test(type))) {
      fields.add("VideoObject"); add(value.contentUrl,"standard"); add(value.embedUrl,"standard");
    }
    for (const [key, child] of Object.entries(value)) {
      const next = [...path,key];
      if (/video|play|download|bitrate|src|url/i.test(key)) fields.add(publicFieldNames.has(key.toLowerCase()) ? key.toLowerCase() : "otherVideoField");
      if (source === "embedded" && /video|playaddr|play_url|download|bitrate/i.test(next.join(".")) && /url|addr|src|play/i.test(key) && !/cover|thumbnail|avatar/i.test(next.join("."))) {
        if (typeof child === "string") add(child,"embedded");
        if (Array.isArray(child)) child.forEach(item => add(item,"embedded"));
      }
      walk(child,source,next,depth + 1);
    }
  };
  $("script").each((_,element) => {
    if (jsonBlocks >= 64) { scanLimited = true; return; }
    const type = ($(element).attr("type") || "").toLowerCase(), id = $(element).attr("id") || "", body = $(element).text().trim();
    if (!["application/ld+json","application/json"].includes(type) && !/^(?:RENDER_DATA|__NEXT_DATA__|__INITIAL_STATE__)$/i.test(id) && !/^(?:window\.)?[A-Z_][A-Z_0-9]*\s*=\s*\{/.test(body)) return;
    jsonBlocks++;
    try {
      let data = body;
      if (/^%7[bB]/.test(data)) data = decodeURIComponent(data);
      if (/^(?:window\.)?[A-Z_][A-Z_0-9]*\s*=\s*\{/.test(data)) data = data.slice(data.indexOf("{")).replace(/;\s*$/, "");
      walk(JSON.parse(data),type === "application/ld+json" ? "standard" : "embedded"); jsonParsed++;
    } catch { /* No eval, JS execution, dynamic API/signature reconstruction or raw dump. */ }
  });
  const title = $("title").text();
  return {candidates,summary:{standardVideoMetadata:candidates.some(item => item.source === "standard"),embeddedVideoMetadata:candidates.some(item => item.source === "embedded"),publicFields:[...fields].slice(0,48),jsonBlocks,jsonParsed,scanLimited,titlePresent:!!title.trim(),challengeTitle:/captcha|验证|安全检测|访问受限|forbidden|access denied/i.test(title),loginTitle:/登录|log.?in|sign.?in/i.test(title),bodyTextPresent:!!$("body").clone().find("script,style").remove().end().text().trim(),scriptCount:$("script").length}};
}
function mediaSignature(bytes) {
  return bytes.length >= 12 && (bytes.toString("ascii",4,8) === "ftyp" || bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])) || bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "AVI ");
}
async function inspectMedia(candidate, transport, pause) {
  const url = safeTarget(candidate.url), result = {source:candidate.source,host:hostOf(url),ephemeralUrlHint:[...url.searchParams.keys()].some(key => /token|sign|expire|time|auth|key/i.test(key)),queryPresent:!!url.search,cookieSent:false,authorizationSent:false,refererSent:false,privateHeaderSent:false,cookieFreeAccessible:false,mediaSignature:false};
  try {
    const head = await chain(url.href,"HEAD",transport,[]); result.headStatus = head.response.status; result.mime = mimeOf(head.response.headers); result.contentLength = sizeOf(head.response.headers); result.rangeAdvertised = /bytes/i.test(String(head.response.headers["accept-ranges"] || ""));
    if (!(head.response.status >= 200 && head.response.status < 300) && ![405,501].includes(head.response.status)) return result;
    const range = await chain(url.href,"RANGE",transport,[]); result.rangeStatus = range.response.status; result.mime = mimeOf(range.response.headers); result.rangeBytesRead = range.response.byteCount; result.rangeSupported = range.response.status === 206; result.mediaSignature = mediaSignature(range.response.body);
    result.cookieFreeAccessible = range.response.status >= 200 && range.response.status < 300 && result.mime.startsWith("video/") && result.mediaSignature;
    if (result.cookieFreeAccessible) { await pause(5000); const again = await chain(url.href,"HEAD",transport,[]); result.shortRecheckStatus = again.response.status; result.shortRecheckAccessible = again.response.status >= 200 && again.response.status < 300 && mimeOf(again.response.headers).startsWith("video/"); }
  } catch (error) { result.failure = error.category || "network_unavailable"; }
  return result;
}
export async function inspectSample(label, source, {transport = directTransport,pause = sleep} = {}) {
  const result = {sample:label,classification:"C",classificationScope:"observed public path only; not proof of all platform paths",publicVideoFound:false,requests:[],media:[],realAiCalls:0};
  const start = performance.now();
  try {
    const original = safeTarget(source); result.input = sanitizedTarget(original);
    const final = await chain(original.href,"GET_HTML",transport,result.requests), mime = mimeOf(final.response.headers);
    result.redirectCount = result.requests.length - 1; result.final = sanitizedTarget(final.url); result.status = final.response.status; result.mime = mime;
    if (!["text/html","application/xhtml+xml"].includes(mime)) {
      if (mime.startsWith("video/")) { const check = await inspectMedia({url:final.url.href,source:"direct"},transport,pause); result.media.push(check); result.publicVideoFound = check.cookieFreeAccessible && check.shortRecheckAccessible; if (result.publicVideoFound) result.classification = "A"; }
      else result.failure = "unsupported_content";
    } else {
      result.htmlBytes = final.response.byteCount; const analyzed = analyzeHtml(final.response.body.toString("utf8"),final.url.href); result.html = analyzed.summary; result.candidateCount = analyzed.candidates.length;
      if (final.response.status >= 200 && final.response.status < 300) {
        for (const candidate of analyzed.candidates.slice(0,2)) { const check = await inspectMedia(candidate,transport,pause); result.media.push(check); if (check.cookieFreeAccessible && check.shortRecheckAccessible) {result.publicVideoFound = true; result.classification = "B"; break;} }
      } else result.failure = "http_error";
      result.candidateChecksLimited = analyzed.candidates.length > result.media.length;
    }
  } catch (error) { result.failure = error.category || "network_unavailable"; if (error.dns) result.dns = error.dns; }
  result.elapsedMillis = Math.round(performance.now() - start);
  const networkFailures = new Set(["dns_blocked","dns_unavailable","timeout","network_unavailable"]);
  const networkLimited = networkFailures.has(result.failure) || !result.publicVideoFound && result.media.some(item => networkFailures.has(item.failure));
  result.limitCategory = networkLimited ? "NETWORK_ENVIRONMENT_LIMIT" : result.failure === "http_error" || result.html?.challengeTitle || result.html?.loginTitle ? "DOUYIN_PLATFORM_LIMIT" : result.publicVideoFound ? "PUBLIC_RESOURCE_OBSERVED" : "NO_PUBLIC_RESOURCE_OBSERVED";
  if (result.limitCategory === "NETWORK_ENVIRONMENT_LIMIT") {
    result.classification = null;
    result.classificationStatus = "UNDETERMINED_NETWORK_LIMIT";
    result.publicVideoFound = null;
  }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputs = process.argv.slice(2);
  if (!inputs.length || inputs.length > 3) { console.error("Provide 1-3 sample URLs; URL values are never printed."); process.exitCode = 2; }
  else for (const [index,input] of inputs.entries()) console.log(JSON.stringify(await inspectSample(String.fromCharCode(65 + index),input),null,2));
}
