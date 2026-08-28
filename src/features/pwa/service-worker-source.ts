export const PWA_CACHE_PREFIX = "food-sequence-public-shell" as const;

export const PWA_PUBLIC_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
] as const;

function sanitizeCacheVersion(version: string) {
  const sanitized = version.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.slice(0, 64) || "local-v1";
}

export function buildServiceWorkerSource(cacheVersion: string) {
  const cacheName = `${PWA_CACHE_PREFIX}-${sanitizeCacheVersion(cacheVersion)}`;
  const assets = JSON.stringify(PWA_PUBLIC_ASSETS);

  return `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = ${JSON.stringify(PWA_CACHE_PREFIX)};
const PRECACHE_URLS = ${assets};
const OFFLINE_APP_PATH = "/offline/app";
const OFFLINE_PRIVATE_ROUTE_PATTERNS = [
  /^\\/recipes$/,
  /^\\/recipes\\/[^/]+$/,
  /^\\/recipes\\/[^/]+\\/cook$/,
  /^\\/shopping$/,
];
const STATIC_ATTRIBUTE_PATTERN = /(?:src|href)=["']([^"']+)["']/gi;

function discoverStaticDependencies(markup) {
  const dependencies = [];
  for (const match of markup.matchAll(STATIC_ATTRIBUTE_PATTERN)) {
    const value = match[1];
    try {
      const candidate = new URL(value, self.location.origin);
      if (
        candidate.origin === self.location.origin &&
        candidate.pathname.startsWith("/_next/static/")
      ) {
        dependencies.push(candidate.pathname + candidate.search);
      }
    } catch {
      // Ignore malformed or non-URL attributes in the public shell.
    }
  }
  return [...new Set(dependencies)];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const shellResponse = await fetch(OFFLINE_APP_PATH);
        if (!shellResponse.ok) {
          throw new Error("Unable to precache the offline app shell");
        }

        const shellMarkup = await shellResponse.clone().text();
        await cache.put(OFFLINE_APP_PATH, shellResponse);
        await cache.addAll([
          ...PRECACHE_URLS,
          ...discoverStaticDependencies(shellMarkup),
        ]);
      } catch (error) {
        await caches.delete(CACHE_NAME);
        throw error;
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX + "-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const url = new URL(request.url);
  if (request.mode === "navigate") {
    if (url.pathname === OFFLINE_APP_PATH) {
      event.respondWith(
        fetch(request).catch(() =>
          caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_APP_PATH)),
        ),
      );
      return;
    }

    if (OFFLINE_PRIVATE_ROUTE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
      event.respondWith(
        fetch(request).catch(() => {
          const redirectPath =
            OFFLINE_APP_PATH + "?path=" + encodeURIComponent(url.pathname + url.search);
          return Response.redirect(new URL(redirectPath, self.location.origin), 302);
        }),
      );
      return;
    }

    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.match(request).then((cached) => cached ?? fetch(request))),
    );
  }
});
`.trim();
}
