import { describe, expect, it } from "vitest";

import { APP_ROUTES } from "@/features/navigation/routes";

describe("APP_ROUTES", () => {
  it("keeps the approved mobile navigation order", () => {
    expect(APP_ROUTES.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/recipes", label: "菜谱" },
      { href: "/shopping", label: "购物" },
      { href: "/favorites", label: "收藏" },
      { href: "/settings", label: "设置" },
    ]);
  });
});
