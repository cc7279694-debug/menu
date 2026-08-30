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

  it("ignores inline and SVG placeholders while keeping a public cover image", () => {
    const result = extractPublicWebSource({
      finalUrl: "https://example.com/r",
      html: `<html><head><meta property="og:image" content="//cdn.example.com/cover" /></head><body>
        <article>${"菜谱正文内容。".repeat(10)}<img src="data:image/png;base64,abc" /><img src="/icons/search.svg" /></article>
      </body></html>`,
    });
    expect(result.imageUrls).toEqual(["https://cdn.example.com/cover"]);
  });

  it("uses public meta descriptions when a JavaScript-rendered page has no article text", () => {
    const result = extractPublicWebSource({
      finalUrl: "https://www.xiaohongshu.com/explore/example",
      html: `<html><head>
        <title>干锅脆鱼超简单教程！太香啦！</title>
        <meta name="description" content="这版干锅脆鱼亲身试验，真的好香啊。切好的鱼片，鱼骨清水洗净去腥味。加入鱼骨炸2分钟，再加鱼片炸5分钟。" />
      </head><body><div id="app"></div></body></html>`,
    });
    expect(result.title).toBe("干锅脆鱼超简单教程！太香啦！");
    expect(result.text).toContain("切好的鱼片");
  });

  it("extracts public video URLs from social recipe pages", () => {
    const result = extractPublicWebSource({
      finalUrl: "https://www.xiaohongshu.com/explore/example",
      html: `<html><head>
        <meta property="og:title" content="鱼香肉丝教程" />
        <meta property="og:video" content="https://sns-video.example.com/recipe.mp4" />
      </head><body><div id="app"></div></body></html>`,
    });

    expect(result.videoUrls).toEqual(["https://sns-video.example.com/recipe.mp4"]);
  });

  it("rejects a source with neither readable text nor images", () => {
    expect(() => extractPublicWebSource({ finalUrl: "https://example.com", html: "<html><body><script>x</script></body></html>" })).toThrow("网页中没有找到可整理的文字");
  });
});
