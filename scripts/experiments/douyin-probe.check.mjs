// Explicit node --test entry, intentionally not a production Vitest discovery filename.
import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { analyzeHtml, boundedBytes, inspectSample, isGlobalAddress, publicAddresses, pinnedLookup, readResponseBody, safeTarget } from "./douyin-probe.mjs";

// Breaks caught: unsafe URL/IP accepted, redirects not revalidated, raw URLs leaked,
// media misclassified from MIME alone, or unbounded response bytes consumed.
test("rejects unsafe URL forms including normalized IP aliases", () => {
  for (const value of ["http://localhost/", "http://127.0.0.1/", "http://0x7f000001/", "http://2130706433/", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "https://host.invalid:444/", "https://user:pass@host.invalid/", "file:///tmp/x", "https://host.invalid\\x", "https://host.invalid/\n"]) {
    assert.throws(() => safeTarget(value));
  }
  assert.equal(safeTarget("https://example.org/path?token=private#fragment").hash, "");
});
test("rejects special IP ranges in both families", () => {
  for (const address of ["0.1.2.3", "10.0.0.1", "100.64.1.1", "127.1.2.3", "169.254.0.1", "172.16.0.1", "192.168.0.1", "192.0.2.1", "198.18.0.1", "198.19.255.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "::1", "fc00::1", "fe80::1", "2001:db8::1", "2001:2::1", "2002:0808:0808::1", "3fff::1", "::ffff:198.18.0.1"]) assert.equal(isGlobalAddress(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) assert.equal(isGlobalAddress(address), true, address);
});
test("rejects mixed public/private DNS and pins only validated results", async () => {
  await assert.rejects(() => publicAddresses(safeTarget("https://example.org/"), async () => [{address:"8.8.8.8",family:4},{address:"198.18.0.1",family:4}]), /dns_blocked/);
  const addresses = await publicAddresses(safeTarget("https://example.org/"), async () => [{address:"8.8.8.8",family:4}]);
  const lookup = pinnedLookup("example.org", addresses);
  assert.deepEqual(await new Promise((resolve,reject) => lookup("example.org", {all:true}, (error,value) => error ? reject(error):resolve(value))), [{address:"8.8.8.8",family:4}]);
  await assert.rejects(() => new Promise((resolve,reject) => lookup("other.example.org", {}, error => error ? reject(error):resolve())), /unbound_host/);
});
test("HTML analysis only extracts inert public metadata and never evaluates scripts", () => {
  const found = analyzeHtml(`<html><meta property="og:video:secure_url" content="https://cdn.example.org/a.mp4?token=private"><script type="application/ld+json">{"@type":"VideoObject","contentUrl":"https://cdn.example.org/b.mp4"}</script><script id="RENDER_DATA" type="application/json">%7B%22video%22%3A%7B%22playAddr%22%3A%7B%22urlList%22%3A%5B%22https%3A%2F%2Fcdn.example.org%2Fc.mp4%22%5D%7D%7D%7D</script><script>globalThis.probeExecuted=true</script></html>`);
  assert.equal(found.candidates.length, 3);
  assert.equal(found.summary.standardVideoMetadata, true);
  assert.equal(found.summary.embeddedVideoMetadata, true);
  assert.equal(globalThis.probeExecuted, undefined);
  assert(!JSON.stringify(found.summary).includes("private"));
});
test("bounded bytes rejects oversized HTML rather than silently truncating", async () => {
  await assert.rejects(() => boundedBytes(Readable.from([Buffer.alloc(4), Buffer.alloc(4)]), 7), /body_limit/);
  assert.equal((await boundedBytes(Readable.from([Buffer.from("abc")]), 7)).bytes.length, 3);
  const range = await boundedBytes(Readable.from([Buffer.alloc(8)]), 7, true);
  assert.equal(range.bytes.length, 7);
  assert.equal(range.complete, false);
});
function page(body, status = 200, extra = {}) { return {status, headers:{"content-type":"text/html",...extra}, body:Buffer.from(body), byteCount:Buffer.byteLength(body), complete:true, dns:{allPublic:true,fakeIp:false,count:1}}; }
test("every redirect is revalidated before transport and no URL is printed", async () => {
  let count = 0;
  const result = await inspectSample("A", "https://example.org/x?token=private", { transport:async () => { count++; return page("",302,{location:"http://127.0.0.1/secret"}); } });
  assert.equal(count, 1);
  assert.equal(result.failure, "unsafe_url");
  assert(!JSON.stringify(result).includes('"private"'));
  assert(!JSON.stringify(result).includes("127.0.0.1"));
});
test("redirect loops and HTTPS downgrade stop without extra fetch", async () => {
  const result = await inspectSample("A", "https://example.org/x", { transport:async () => page("",302,{location:"http://example.org/y"}) });
  assert.equal(result.failure, "redirect_blocked");
  const loop = await inspectSample("B", "https://example.org/x", {transport:async () => page("",302,{location:"/x"})});
  assert.equal(loop.failure, "redirect_loop");
});
test("video candidate requires cookie-free range bytes with actual media signature", async () => {
  const result = await inspectSample("B", "https://example.org/video/123", { pause:async () => {}, transport:async (_url, method) => {
    if (method === "GET_HTML") return page('<meta property="og:video" content="https://cdn.example.org/m.mp4?token=private">');
    return {status:method === "HEAD" ? 200:206,headers:{"content-type":"video/mp4","content-length":"123456","accept-ranges":"bytes"},body:method === "HEAD" ? Buffer.alloc(0):Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109]),byteCount:method === "HEAD" ? 0:12,complete:true,dns:{allPublic:true,fakeIp:false,count:1}};
  }});
  assert.equal(result.classification, "B");
  assert.equal(result.publicVideoFound, true);
  assert.equal(result.media[0].cookieFreeAccessible, true);
  assert.equal(result.media[0].ephemeralUrlHint, true);
  assert(!JSON.stringify(result).includes('"private"'));
  assert(!JSON.stringify(result).includes("https://"));
});
test("HTML masquerading as video is not accepted from a claimed MIME", async () => {
  const result = await inspectSample("B", "https://example.org/video/123", {pause:async () => {},transport:async (_url, method) => method === "GET_HTML" ? page('<meta property="og:video" content="https://cdn.example.org/x.mp4">') : {status:200,headers:{"content-type":"video/mp4"},body:Buffer.from("<html>not video</html>"),byteCount:22,complete:true,dns:{allPublic:true,fakeIp:false,count:1}}});
  assert.equal(result.publicVideoFound, false);
  assert.equal(result.classification, "C");
  assert.equal(result.media.length, 1);
  assert.equal(result.media[0].mediaSignature, false);
});
test("DNS environment failure cannot assert a platform CLASS C result", async () => {
  const result = await inspectSample("A", "https://example.org/video/123", {transport:async () => { throw Object.assign(new Error("dns_blocked"), {category:"dns_blocked",dns:{allPublic:false,fakeIp:true,count:1}}); }});
  assert.equal(result.limitCategory, "NETWORK_ENVIRONMENT_LIMIT");
  assert.equal(result.classification, null);
  assert.equal(result.classificationStatus, "UNDETERMINED_NETWORK_LIMIT");
  assert.equal(result.publicVideoFound, null);
  assert.deepEqual(result.requests, []);
  assert.equal(result.status, undefined);
});
test("redirects have a hard three-hop limit", async () => {
  let count = 0;
  const result = await inspectSample("A", "https://example.org/0", {transport:async () => page("",302,{location:`/${++count}`})});
  assert.equal(result.failure, "too_many_redirects");
  assert.equal(count, 4);
});
test("page fetch destroys non-HTML body without reading video bytes", async () => {
  const response = Readable.from([Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109])]);
  response.statusCode = 200;
  response.headers = {"content-type":"video/mp4"};
  const result = await readResponseBody(response,"GET_HTML");
  assert.equal(result.bytes.length, 0);
  assert.equal(response.destroyed, true);
});
test("media response ignoring Range is still capped at 64 KiB", async () => {
  const response = Readable.from([Buffer.alloc(70000)]);
  response.statusCode = 200;
  response.headers = {"content-type":"video/mp4"};
  const result = await readResponseBody(response,"RANGE");
  assert.equal(result.bytes.length, 65536);
  assert.equal(result.complete, false);
  assert.equal(response.destroyed, true);
});
test("summary never prints arbitrary body-derived JSON field names", () => {
  const analyzed = analyzeHtml('<script type="application/json">{"video_secretCanaryValue":"hidden"}</script>');
  assert(!JSON.stringify(analyzed.summary).includes("secretCanaryValue"));
});
test("standard video type metadata is reported without treating it as a URL", () => {
  const analyzed = analyzeHtml('<meta property="og:video:type" content="video/mp4">');
  assert(analyzed.summary.publicFields.includes("og:video:type"));
  assert.equal(analyzed.candidates.length, 0);
});
test("candidate DNS failure also leaves platform classification undetermined", async () => {
  const result = await inspectSample("A", "https://example.org/", {transport:async (_url,mode) => {
    if (mode === "GET_HTML") return page('<meta property="og:video" content="https://cdn.example.org/v.mp4">');
    throw Object.assign(new Error("dns_blocked"), {category:"dns_blocked"});
  }});
  assert.equal(result.limitCategory, "NETWORK_ENVIRONMENT_LIMIT");
  assert.equal(result.classification, null);
  assert.equal(result.publicVideoFound, null);
});
test("network failure on short media recheck does not claim platform denial", async () => {
  let heads = 0;
  const result = await inspectSample("A", "https://example.org/", {pause:async () => {},transport:async (_url,mode) => {
    if (mode === "GET_HTML") return page('<meta property="og:video" content="https://cdn.example.org/v.mp4">');
    if (mode === "HEAD" && ++heads > 1) throw Object.assign(new Error("timeout"), {category:"timeout"});
    return {status:mode === "HEAD" ? 200:206,headers:{"content-type":"video/mp4"},body:Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109]),byteCount:12};
  }});
  assert.equal(result.limitCategory, "NETWORK_ENVIRONMENT_LIMIT");
  assert.equal(result.classification, null);
});
