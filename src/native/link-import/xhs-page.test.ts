// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractXhsPublicPage } from "./xhs-page";

const url = "https://www.xiaohongshu.com/explore/test-note?xsec_token=synthetic";
const note = (title = "合成椰子鸡", desc = "食材：鸡肉500克，椰子2个。\n做法：焯水，加入椰汁，小火煮20分钟。") => ({ noteId: "test-note", title, desc, type: "normal", imageList: [{}] });
const html = (state: unknown) => `<title>合成笔记 - 小红书</title><script>window.__INITIAL_STATE__=${JSON.stringify(state).replaceAll("<", "\\u003c")};</script><main>打开App查看</main>`;
const state = (value: unknown = note()) => ({ note: { noteDetailMap: { "test-note": { note: value } } } });

describe("bounded inert public Xiaohongshu state", () => {
  it("reads only the target note title, description and media kind", () => {
    const result = extractXhsPublicPage(html(state()), url);
    expect(result).toMatchObject({ title: "合成椰子鸡", text: "食材：鸡肉500克，椰子2个。\n做法：焯水，加入椰汁，小火煮20分钟。", media: "image", access: null });
    expect(JSON.stringify(result)).not.toMatch(/xsec_token|imageList|https:/u);
  });
  it.each(["xiaohongshu.com", "www.xiaohongshu.com", "xhslink.cn", "www.xhslink.com"])("recognizes the exact public host boundary %s", host => {
    expect(extractXhsPublicPage(html(state()), `https://${host}/explore/test-note`)?.title).toBe("合成椰子鸡");
  });
  it.each(["xiaohongshu.com.evil.example", "notxiaohongshu.com", "xhslink.cn.evil.example", "recipes.example"])("ignores serialized state on unrelated host %s", host => {
    expect(extractXhsPublicPage(html(state()), `https://${host}/explore/test-note`)).toBeNull();
  });
  it("supports public discovery paths and matching noteId without consuming recommended notes", () => {
    const data = { note: { noteDetailMap: { wrong: { note: note("推荐菜", "私有推荐正文") }, aliased: { note: { ...note(), noteId: "target" } } } } };
    expect(extractXhsPublicPage(html(data), "https://www.xiaohongshu.com/discovery/item/target")?.title).toBe("合成椰子鸡");
    expect(extractXhsPublicPage(html(data), "https://www.xiaohongshu.com/explore/missing")?.text).toBe("");
  });
  it.each([0, false, "", null])("rejects a direct note with invalid embedded identity %s", embeddedId => {
    const result = extractXhsPublicPage(html(state({ ...note(), noteId: embeddedId })), url);
    expect(result).toMatchObject({ statePresent: true, targetResolved: false, text: "" });
    expect(result?.warnings.join(" ")).toContain("目标笔记正文");
  });
  it.each(["%74est-note", "bad.id", "x".repeat(129), "test-note/extra"])("does not treat a malformed note route as an unidentified short link: %s", id => {
    expect(extractXhsPublicPage(html(state()), `https://www.xiaohongshu.com/explore/${id}`)).toMatchObject({ statePresent: true, targetResolved: false, text: "" });
  });
  it("does not use a homepage or profile's single recommended note as a shared target", () => {
    expect(extractXhsPublicPage(html(state()), "https://www.xiaohongshu.com/user/profile/synthetic")?.text).toBe("");
  });
  it("rejects ambiguous short-page records without a target ID", () => {
    const data = { note: { noteDetailMap: { first: { note: note() }, second: { note: note("其他菜") } } } };
    expect(extractXhsPublicPage(html(data), "https://xhslink.cn/a/synthetic")?.text).toBe("");
    expect(extractXhsPublicPage(html(state()), "https://xhslink.com/a/synthetic")?.title).toBe("合成椰子鸡");
  });
  it("accepts an application/json state element", () => {
    const page = `<script id="__INITIAL_STATE__" type="application/json">${JSON.stringify(state())}</script>`;
    expect(extractXhsPublicPage(page, url)?.title).toBe("合成椰子鸡");
  });
  it("converts only bare undefined JSON values while preserving quoted text", () => {
    const source = html(state(note("undefined 字样", '先说 "undefined"，再煮熟。'))).replace('"type":"normal"', '"extra":undefined,"type":"normal"');
    expect(extractXhsPublicPage(source, url)).toMatchObject({ title: "undefined 字样", text: '先说 "undefined"，再煮熟。' });
  });
  it.each(["(()=>({}))()", "JSON.parse('{}')", "{}; globalThis.attack=1", '{"note": undefined + 1}', '{"note":(undefined)}', '{undefined:1}'])("does not execute or accept JavaScript expressions: %s", payload => {
    const result = extractXhsPublicPage(`<script>window.__INITIAL_STATE__=${payload};</script>`, url);
    expect(result?.text).toBe(""); expect(result?.warnings.length).toBeGreaterThan(0);
  });
  it("removes markup and executable content from serialized note prose", () => {
    const result = extractXhsPublicPage(html(state(note('<b>测试</b>', '<p>焯水。</p><script>secret()</script><iframe>hidden</iframe><p>煮熟。</p>'))), url);
    expect(result?.title).toBe("测试"); expect(result?.text).toContain("焯水。");
    expect(result?.text).not.toMatch(/script|iframe|secret|hidden|[<>]/u);
  });
  it("does not expose serialized hidden markup to recipe prose", () => {
    const description = '<p hidden>PRIVATE HIDDEN</p><span aria-hidden="true">PRIVATE ARIA</span><p style="display:/**/none">PRIVATE CSS</p><p style="visibility:hidden">PRIVATE INVISIBLE</p><p>焯水后煮熟。</p>';
    const result = extractXhsPublicPage(html(state(note("合成汤", description))), url);
    expect(result?.text).toBe("焯水后煮熟。");
  });
  it("marks video-only and title-only data without inventing steps", () => {
    const result = extractXhsPublicPage(html(state({ ...note("合成视频菜", ""), type: "video" })), url);
    expect(result).toMatchObject({ title: "合成视频菜", text: "", media: "video" });
  });
  it("does not mistake a login button or prose mentioning a challenge for an access wall", () => {
    const result = extractXhsPublicPage(`<title>笔记</title><button>登录</button>${html(state(note("测试", "登录后也可以看我做菜，验证码只是示例。")))}`, url);
    expect(result?.access).toBeNull(); expect(result?.text).toContain("做菜");
  });
  it.each([["登录后查看笔记", "login_required"], ["安全验证", "challenge_required"]])("recognizes an explicit empty access wall %s", (title, access) => {
    expect(extractXhsPublicPage(`<title>${title}</title><main>${title}</main>`, url)?.access).toBe(access);
  });
  it.each([["登录后查看笔记", "login_required"], ["安全验证", "challenge_required"]])("does not let partial note metadata hide an explicit access wall %s", (title, access) => {
    const source = html(state(note("合成汤", ""))).replace("合成笔记 - 小红书", title);
    expect(extractXhsPublicPage(source, url)?.access).toBe(access);
  });
  it("recognizes the public platform login redirect even with a generic page title", () => {
    expect(extractXhsPublicPage('<title>小红书</title><script>window.__INITIAL_STATE__={"user":null};</script>', "https://www.xiaohongshu.com/login?redirectPath=synthetic")?.access).toBe("login_required");
  });
  it("bounds JSON size, depth and node count without throwing", () => {
    let deep: unknown = {}; for (let n = 0; n < 40; n++) deep = { next: deep };
    const many = Array.from({ length: 5000 }, (_, i) => i);
    for (const payload of [{ ...state(), huge: "x".repeat(270000) }, { ...state(), deep }, { ...state(), many }]) {
      const result = extractXhsPublicPage(html(payload), url);
      expect(result?.text).toBe(""); expect(result?.warnings.length).toBeGreaterThan(0);
    }
  });
});
