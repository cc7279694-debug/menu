import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /sw.js", () => {
  it("returns a non-cacheable worker script with an explicit worker scope", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "commit-123");

    const response = await GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(response.headers.get("service-worker-allowed")).toBe("/");
    expect(body).toContain("food-sequence-public-shell-commit-123");
    expect(body).toContain('const OFFLINE_APP_PATH = "/offline/app"');
    expect(body).toContain("OFFLINE_PRIVATE_ROUTE_PATTERNS");
  });
});
