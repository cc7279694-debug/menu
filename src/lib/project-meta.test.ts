import { describe, expect, it } from "vitest";

import { PROJECT_META } from "@/lib/project-meta";

describe("PROJECT_META", () => {
  it("uses the approved product identity", () => {
    expect(PROJECT_META.name).toBe("谱序 RECIPIO");
    expect(PROJECT_META.shortName).toBe("谱序");
    expect(PROJECT_META.description).toContain("分步烹饪");
  });
});
