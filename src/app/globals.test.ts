import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("global motion preferences", () => {
  it("provides a reduced-motion fallback for global transitions and animations", async () => {
    const styles = await readFile("src/app/globals.css", "utf8");

    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation-duration: 0.01ms");
    expect(styles).toContain("transition-duration: 0.01ms");
  });
});
