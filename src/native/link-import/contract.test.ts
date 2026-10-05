import { describe, expect, it } from "vitest";
import { fetchedPageSchema, linkReadSchema, safeLinkError } from "./contract";

describe("link native boundary", () => {
  it("accepts only a narrow HTML result, not provider headers", () => {
    const page = { finalUrl: "https://recipes.example/dish", contentType: "text/html", html: "<h1>菜谱</h1>" };
    expect(fetchedPageSchema.parse(page)).toEqual(page);
    expect(fetchedPageSchema.safeParse({ ...page, headers: { Cookie: "private" } }).success).toBe(false);
  });
  it("rejects non-page MIME, oversized decoded data and invalid final URL", () => {
    for (const page of [
      { finalUrl: "https://recipes.example/dish", contentType: "application/pdf", html: "x" },
      { finalUrl: "file:///private", contentType: "text/html", html: "x" },
      { finalUrl: "https://recipes.example/dish", contentType: "text/html", html: "文".repeat(700000) },
    ]) expect(fetchedPageSchema.safeParse(page).success).toBe(false);
    expect(fetchedPageSchema.safeParse({ finalUrl: "https://recipes.example", contentType: "application/xhtml+xml", html: "a".repeat(2 * 1024 * 1024) }).success).toBe(true);
  });
  it("does not expose method, header or IP selection to callers", () => {
    const request = { requestId: "d058cdf9-b03f-4dc9-9415-937124eb6e91", url: "https://recipes.example/dish" };
    expect(linkReadSchema.parse(request)).toEqual(request);
    for (const extra of [{ method: "POST" }, { headers: {} }, { ip: "127.0.0.1" }]) expect(linkReadSchema.safeParse({ ...request, ...extra }).success).toBe(false);
  });
  it("turns native failures into allowlisted safe messages", () => {
    expect(safeLinkError({ code: "dns_blocked", message: "private IP and stack" }).code).toBe("dns_blocked");
    expect(safeLinkError({ code: "unknown", message: "private URL and stack" }).message).not.toContain("private");
  });
});
