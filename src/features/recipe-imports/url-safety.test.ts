import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertSafePublicUrl, fetchPublicDocument } from "@/features/recipe-imports/url-safety";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 as const }];
const privateLookup = async () => [{ address: "127.0.0.1", family: 4 as const }];
const xhsProxyLookup = async () => [{ address: "198.18.0.16", family: 4 as const }];

describe("public URL safety", () => {
  it.each([
    "http://localhost/recipe",
    "https://foo.local/recipe",
    "http://127.0.0.1/recipe",
    "http://10.2.3.4/recipe",
    "http://172.20.0.1/recipe",
    "http://192.168.1.1/recipe",
    "http://[::1]/recipe",
    "http://[fc00::1]/recipe",
    "http://[fe80::1]/recipe",
    "https://user:password@example.com/recipe",
  ])("rejects private or credential-bearing address %s", async (value) => {
    await expect(assertSafePublicUrl(value, publicLookup)).rejects.toThrow("不支持访问该地址");
  });

  it("rejects a public hostname resolving to a private address", async () => {
    await expect(assertSafePublicUrl("https://example.com", privateLookup)).rejects.toThrow("不支持访问该地址");
  });

  it("allows the known Xiaohongshu hosts when the runtime maps them to its public egress proxy", async () => {
    await expect(assertSafePublicUrl("https://xhslink.cn/o/example", xhsProxyLookup)).resolves.toBeInstanceOf(URL);
    await expect(assertSafePublicUrl("https://www.xiaohongshu.com/explore/example", xhsProxyLookup)).resolves.toBeInstanceOf(URL);
    await expect(assertSafePublicUrl("https://sns-video-v3.xhscdn.com/stream/example.mp4", xhsProxyLookup)).resolves.toBeInstanceOf(URL);
    await expect(assertSafePublicUrl("https://example.com/recipe", xhsProxyLookup)).rejects.toThrow("不支持访问该地址");
  });

  it("follows safe redirects, but revalidates every location and caps the chain", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/two" } }))
      .mockResolvedValueOnce(new Response("<article>safe recipe content</article>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(fetchPublicDocument("https://example.com/one", { lookup: publicLookup, fetchImpl })).resolves.toMatchObject({ finalUrl: "https://example.com/two" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const privateRedirect = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } }));
    await expect(fetchPublicDocument("https://example.com/one", { lookup: publicLookup, fetchImpl: privateRedirect })).rejects.toThrow("不支持访问该地址");

    const tooManyRedirects = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 302, headers: { location: "/again" } }));
    await expect(fetchPublicDocument("https://example.com/one", { lookup: publicLookup, fetchImpl: tooManyRedirects })).rejects.toThrow("网页跳转次数过多");
    expect(tooManyRedirects).toHaveBeenCalledTimes(4);
  });

  it("rejects unsupported MIME types and bodies over 2 MB", async () => {
    const jsonFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    await expect(fetchPublicDocument("https://example.com/data", { lookup: publicLookup, fetchImpl: jsonFetch })).rejects.toThrow("网页格式不受支持");

    const largeFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1), { status: 200, headers: { "content-type": "text/html" } }));
    await expect(fetchPublicDocument("https://example.com/large", { lookup: publicLookup, fetchImpl: largeFetch })).rejects.toThrow("网页内容过大");
  });
});
