import { buildServiceWorkerSource } from "@/features/pwa/service-worker-source";

export const dynamic = "force-dynamic";

function getCacheVersion() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.PWA_CACHE_VERSION ??
    "local-v1";
  return version.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 64) || "local-v1";
}

export function GET() {
  return new Response(buildServiceWorkerSource(getCacheVersion()), {
    headers: {
      "cache-control": "no-cache, no-store, must-revalidate",
      "content-type": "application/javascript; charset=utf-8",
      "service-worker-allowed": "/",
    },
  });
}
