import { describe, expect, it, vi } from "vitest";
import { createWebImportPort } from "./native-bridge";
const request = { requestId: "a5b44974-7523-4c63-8232-72fe8ae50fca", url: "https://recipes.example/dish" };
const page = { finalUrl: request.url, contentType: "text/html", html: "<h1>菜谱</h1>" };
describe("web import bridge", () => {
  it("passes only validated request fields and rejects unsupported callers", async () => {
    const api = { read: vi.fn(async () => page), cancel: vi.fn(async () => undefined) };
    const port = createWebImportPort(api);
    expect(await port.read(request)).toEqual(page);
    expect(api.read.mock.calls).toEqual([[request]]);
    await expect(port.read({ ...request, requestId: "bad" })).rejects.toMatchObject({ code: "invalid_url" });
    expect(api.read).toHaveBeenCalledTimes(1);
    await port.cancel(request.requestId);
    expect(api.cancel.mock.calls).toEqual([[{ requestId: request.requestId }]]);
    expect(Object.keys(port).sort()).toEqual(["cancel", "read"]);
  });
  it("never accepts unknown source/header metadata in a native reply", async () => {
    const port = createWebImportPort({ read: async () => ({ ...page, authorization: "private" }), cancel: async () => undefined });
    await expect(port.read(request)).rejects.toMatchObject({ code: "page_unreadable" });
  });
  it("does not echo native errors or enable arbitrary browser fetch", async () => {
    const port = createWebImportPort({ read: async () => { throw { code: "timeout", message: "private address" }; }, cancel: async () => undefined });
    await expect(port.read(request)).rejects.toMatchObject({ code: "timeout" });
    await expect(createWebImportPort().read(request)).rejects.toMatchObject({ code: "native_unavailable" });
  });
});
