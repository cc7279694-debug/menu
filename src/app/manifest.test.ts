import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

const publicRoot = path.resolve(process.cwd(), "public");

async function readPngDimensions(filePath: string) {
  const buffer = await readFile(filePath);
  expect(buffer.subarray(0, 8).toString("hex")).toBe(
    "89504e470d0a1a0a",
  );

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("PWA public shell", () => {
  it("exposes the install manifest with the personal recipe app identity", () => {
    const result = manifest();

    expect(result).toMatchObject({
      name: "谱序 RECIPIO",
      short_name: "谱序",
      start_url: "/recipes",
      scope: "/",
      display: "standalone",
      lang: "zh-CN",
      theme_color: "#27231f",
      background_color: "#faf8f3",
    });
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ]),
    );
  });

  it("ships install icons at their declared dimensions", async () => {
    await expect(stat(path.join(publicRoot, "icons/icon-192.png"))).resolves.toBeTruthy();
    await expect(stat(path.join(publicRoot, "icons/icon-512.png"))).resolves.toBeTruthy();
    await expect(stat(path.join(publicRoot, "icons/icon-maskable-512.png"))).resolves.toBeTruthy();
    await expect(stat(path.join(publicRoot, "apple-touch-icon.png"))).resolves.toBeTruthy();

    await expect(
      readPngDimensions(path.join(publicRoot, "icons/icon-192.png")),
    ).resolves.toEqual({ width: 192, height: 192 });
    await expect(
      readPngDimensions(path.join(publicRoot, "icons/icon-512.png")),
    ).resolves.toEqual({ width: 512, height: 512 });
    await expect(
      readPngDimensions(path.join(publicRoot, "icons/icon-maskable-512.png")),
    ).resolves.toEqual({ width: 512, height: 512 });
    await expect(
      readPngDimensions(path.join(publicRoot, "apple-touch-icon.png")),
    ).resolves.toEqual({ width: 180, height: 180 });
  });

  it("keeps the offline page self-contained and private-data free", async () => {
    const offlineHtml = await readFile(path.join(publicRoot, "offline.html"), "utf8");

    expect(offlineHtml).toContain("当前处于离线状态");
    expect(offlineHtml).not.toContain("/_next/");
    expect(offlineHtml).not.toMatch(/<script\b/i);
  });
});
