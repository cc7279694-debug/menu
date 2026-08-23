import { describe, expect, it } from "vitest";

import {
  buildLoginRedirect,
  isPublicPath,
} from "@/features/auth/route-access";

describe("route access", () => {
  it("only treats the login surface as public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/recipes")).toBe(false);
  });

  it("preserves an internal route as the login next target", () => {
    expect(
      buildLoginRedirect(new URL("https://food.test/favorites?q=egg")).toString(),
    ).toBe("https://food.test/login?next=%2Ffavorites%3Fq%3Degg");
  });
});
