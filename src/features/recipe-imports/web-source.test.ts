import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractPublicWebSource } from "@/features/recipe-imports/web-source";

describe("public web source extraction", () => {
  it("prefers article content, removes non-content nodes, and normalizes metadata", () => {
    const result = extractPublicWebSource({
      finalUrl: "https://example.com/recipes/tomato",
      html: `
        <html><head>
          <title>fallback</title><meta property="og:title" content="番茄炒蛋" />
          <meta name="author" content="小明" /><link rel="canonical" href="/recipes/tomato" />
        </head><body>
          <nav>菜单</nav><main>错误内容</main><article>
            <h1>番茄炒蛋</h1><p>鸡蛋两个，番茄一个，加入适量盐。</p>
            <p>中火翻炒至熟，出锅即可。准备时间五分钟，烹饪时间八分钟。</p>
            <img src="/images/tomato.jpg" /><script>bad()</script><div hidden>hidden</div><form>广告</form>
          </article><footer>版权</footer>
        </body></html>`,
    });
    expect(result.platform).toBe("example.com");
    expect(result.title).toBe("番茄炒蛋");
    expect(result.author).toBe("小明");
    expect(result.canonicalUrl).toBe("https://example.com/recipes/tomato");
    expect(result.text).toContain("鸡蛋两个");
    expect(result.text).not.toContain("菜单");
    expect(result.text).not.toContain("bad()");
    expect(result.imageUrls).toEqual(["https://example.com/images/tomato.jpg"]);
  });

  it("keeps only HTTP(S) image candidates and caps them at twelve", () => {
    const images = Array.from({ length: 14 }, (_, index) => `<img src="/i/${index}.jpg" />`).join("");
    const result = extractPublicWebSource({ finalUrl: "https://example.com/r", html: `<article>${"有足够长的菜谱正文。".repeat(10)}${images}<img src="data:image/png;base64,abc" /></article>` });
    expect(result.imageUrls).toHaveLength(12);
    expect(result.imageUrls[0]).toBe("https://example.com/i/0.jpg");
  });

  it("rejects a source with neither readable text nor images", () => {
    expect(() => extractPublicWebSource({ finalUrl: "https://example.com", html: "<html><body><script>x</script></body></html>" })).toThrow("网页中没有找到可整理的文字");
  });
});
