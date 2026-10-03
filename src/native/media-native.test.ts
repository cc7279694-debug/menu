import { beforeEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "android",
  pickImage: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform },
  registerPlugin: () => ({ pickImage: native.pickImage }),
}));
import { pickLocalImage } from "./media";

beforeEach(() => {
  native.platform = "android";
  native.pickImage.mockReset();
});
it("accepts only an app-private path from the native picker without reading a WebView File", async () => {
  native.pickImage.mockResolvedValue({ path: "images/123e4567-e89b-12d3-a456-426614174000.png" });
  await expect(pickLocalImage()).resolves.toBe("images/123e4567-e89b-12d3-a456-426614174000.png");
  expect(native.pickImage).toHaveBeenCalledOnce();
});
it("returns no replacement when the user cancels", async () => {
  native.pickImage.mockResolvedValue({ cancelled: true });
  await expect(pickLocalImage()).resolves.toBeNull();
});
it("rejects malformed native results and traversal instead of storing a reference", async () => {
  for (const result of [{}, { path: "../../secret.png" }, { path: "content://media/1" }]) {
    native.pickImage.mockResolvedValue(result);
    await expect(pickLocalImage()).rejects.toThrow();
  }
});
it("surfaces a failed copy and does not pretend it saved", async () => {
  native.pickImage.mockRejectedValue(new Error("图片保存失败，请检查设备空间后重试"));
  await expect(pickLocalImage()).rejects.toThrow("图片保存失败");
});
it("does not launch an Android picker in the browser preview", async () => {
  native.platform = "web";
  await expect(pickLocalImage()).rejects.toThrow();
  expect(native.pickImage).not.toHaveBeenCalled();
});
