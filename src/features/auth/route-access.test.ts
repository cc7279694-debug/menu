import { describe, expect, it } from "vitest";

import {
  buildLoginRedirect,
  isPwaPublicResource,
  isPublicPath,
} from "@/features/auth/route-access";

describe("route access", () => {
  it("only treats the login surface as public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/recipes")).toBe(false);
  });

  it("recognizes only the public PWA shell resources", () => {
    expect(isPwaPublicResource("/sw.js")).toBe(true);
    expect(isPwaPublicResource("/manifest.webmanifest")).toBe(true);
    expect(isPwaPublicResource("/offline.html")).toBe(true);
    expect(isPwaPublicResource("/offline/app")).toBe(true);
    expect(isPwaPublicResource("/offline/app/anything")).toBe(false);
    expect(isPwaPublicResource("/icons/icon-192.png")).toBe(true);
    expect(isPwaPublicResource("/recipes")).toBe(false);
    expect(isPwaPublicResource("/shopping")).toBe(false);
  });

  it("preserves an internal route as the login next target", () => {
    expect(
      buildLoginRedirect(new URL("https://food.test/favorites?q=egg")).toString(),
    ).toBe("https://food.test/login?next=%2Ffavorites%3Fq%3Degg");
  });
});
