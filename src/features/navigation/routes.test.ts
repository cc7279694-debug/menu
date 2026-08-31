import { describe, expect, it } from "vitest";

import { APP_ROUTES, RECIPE_IMPORT_ROUTE } from "@/features/navigation/routes";

describe("APP_ROUTES", () => {
  it("keeps the approved mobile navigation order", () => {
    expect(APP_ROUTES.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/recipes", label: "菜谱" },
      { href: "/plan", label: "计划" },
      { href: "/shopping", label: "购物" },
      { href: "/favorites", label: "收藏" },
      { href: "/settings", label: "设置" },
    ]);
  });

  it("keeps recipe import as a secondary route", () => {
    expect(RECIPE_IMPORT_ROUTE).toBe("/recipes/import");
    expect(APP_ROUTES).toHaveLength(5);
  });
});
