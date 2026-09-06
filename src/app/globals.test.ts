import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("global motion preferences", () => {
  it("provides a reduced-motion fallback for global transitions and animations", async () => {
    const styles = await readFile("src/app/globals.css", "utf8");

    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation-duration: 0.01ms");
    expect(styles).toContain("transition-duration: 0.01ms");
  });

  it("provides safe-area spacing for app and offline shells", async () => {
    const styles = await readFile("src/app/globals.css", "utf8");

    expect(styles).toContain(".pwa-shell-content");
    expect(styles).toContain("env(safe-area-inset-top)");
    expect(styles).toContain("env(safe-area-inset-bottom)");
    expect(styles).toContain(".pwa-offline-frame");
  });
});
