import { describe, expect, it } from "vitest";

import {
  PWA_CACHE_PREFIX,
  PWA_PUBLIC_ASSETS,
  buildServiceWorkerSource,
} from "./service-worker-source";

describe("public PWA service worker source", () => {
  it("keeps the precache allowlist limited to public shell assets", () => {
    expect(PWA_CACHE_PREFIX).toBe("food-sequence-public-shell");
    expect(PWA_PUBLIC_ASSETS).toEqual([
      "/offline.html",
      "/manifest.webmanifest",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-512.png",
      "/apple-touch-icon.png",
    ]);
  });

  it("installs without taking over, cleans old versions and serves only the allowlist", () => {
    const source = buildServiceWorkerSource("qa-v1");

    expect(source).toContain('const CACHE_NAME = "food-sequence-public-shell-qa-v1"');
    expect(source).toContain('self.addEventListener("install"');
    expect(source).toContain("caches.open(CACHE_NAME)");
    expect(source.split('self.addEventListener("message"')[0]).not.toContain(
      "skipWaiting()",
    );
    expect(source).toContain('event.data?.type === "SKIP_WAITING"');
    expect(source).toContain('self.addEventListener("activate"');
    expect(source).toContain("self.clients.claim()");
    expect(source).toContain("food-sequence-public-shell");
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain('caches.match("/offline.html")');
    expect(source).toContain("request.method !== \"GET\"");
    expect(source).not.toContain("cache.put");
    expect(source).not.toContain("/api/");
    expect(source).not.toContain("/_next/");
    expect(source).not.toContain("supabase");
  });

  it("sanitizes cache version text before embedding it in JavaScript", () => {
    const source = buildServiceWorkerSource("release/2026 08; evil");

    expect(source).toContain('const CACHE_NAME = "food-sequence-public-shell-release-2026-08-evil"');
    expect(source).not.toContain("release/2026 08; evil");
  });
});
