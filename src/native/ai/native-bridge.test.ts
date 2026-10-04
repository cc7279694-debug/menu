import { describe, expect, it, vi } from "vitest";
import { createAiKeyPort, AiIntakeError, safeAiError } from "./native-bridge";

describe("AI secret bridge boundary", () => {
  const api = () => ({ saveAiKey: vi.fn(async () => ({ configured: true, cancelled: false })), hasAiKey: vi.fn(async () => ({ configured: false })), deleteAiKey: vi.fn(async () => undefined) });
  it("exposes only three no-argument methods, never a plaintext getter", async () => {
    const native = api(), port = createAiKeyPort(native);
    expect(Object.keys(port).sort()).toEqual(["deleteAiKey", "hasAiKey", "saveAiKey"]);
    await port.saveAiKey(); await port.hasAiKey(); await port.deleteAiKey();
    expect(native.saveAiKey.mock.calls).toEqual([[]]);
    expect(native.hasAiKey.mock.calls).toEqual([[]]);
    expect(native.deleteAiKey.mock.calls).toEqual([[]]);
  });
  it("preserves cancellation and rejects unexpected native secret data", async () => {
    const native = api(); native.saveAiKey.mockResolvedValue({ configured: true, cancelled: true });
    expect(await createAiKeyPort(native).saveAiKey()).toEqual({ configured: true, cancelled: true });
    const bad = { ...native, hasAiKey: async () => ({ configured: true, key: "never expose this" }) };
    await expect(createAiKeyPort(bad).hasAiKey()).rejects.toMatchObject({ code: "invalid_output" });
  });
  it.each(["busy", "key_unavailable", "native_unavailable"] as const)("maps stable %s without exception text", async (code) => {
    const native = { ...api(), hasAiKey: async () => { throw { code, message: "private raw data", cause: "secret" }; } };
    await expect(createAiKeyPort(native).hasAiKey()).rejects.toMatchObject({ code });
    expect(safeAiError({ code, message: "private raw data" }).message).not.toContain("private");
  });
  it("unknown exceptions are closed, not echoed", () => {
    const error = safeAiError(new Error("private raw data"));
    expect(error).toBeInstanceOf(AiIntakeError); expect(error.code).toBe("native_unavailable");
    expect(error.message).not.toContain("private");
  });
});
