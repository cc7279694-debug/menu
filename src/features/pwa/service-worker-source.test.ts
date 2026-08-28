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
    expect(source).toContain('const OFFLINE_APP_PATH = "/offline/app"');
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
    expect(source).toContain('pathname.startsWith("/_next/static/")');
    expect(source).toContain("cache.match(OFFLINE_APP_PATH)");
    expect(source).toContain("Response.redirect");
    expect(source).toContain("encodeURIComponent");
    expect(source).toContain("request.method !== \"GET\"");
    expect(source).not.toContain("cache.put(request");
    expect(source).not.toContain("/api/");
    expect(source).not.toContain("supabase");
  });

  it("only discovers same-origin static dependencies from the offline shell", () => {
    const source = buildServiceWorkerSource("qa-v1");

    expect(source).toContain("new URL(value, self.location.origin)");
    expect(source).toContain("candidate.origin === self.location.origin");
    expect(source).toContain("OFFLINE_PRIVATE_ROUTE_PATTERNS");
    expect(source).toContain("cache.put(OFFLINE_APP_PATH");
    expect(source).toContain("caches.delete(CACHE_NAME)");
  });

  it("sanitizes cache version text before embedding it in JavaScript", () => {
    const source = buildServiceWorkerSource("release/2026 08; evil");

    expect(source).toContain('const CACHE_NAME = "food-sequence-public-shell-release-2026-08-evil"');
    expect(source).not.toContain("release/2026 08; evil");
  });
});
