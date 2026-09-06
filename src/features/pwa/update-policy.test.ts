import { describe, expect, it } from "vitest";

import {
  PWA_UPDATE_CHECK_INTERVAL_MS,
  shouldCheckForPwaUpdate,
} from "./update-policy";

describe("PWA update policy", () => {
  it("checks immediately when no previous check exists", () => {
    expect(shouldCheckForPwaUpdate(null, 10_000)).toBe(true);
  });

  it("does not check again inside the throttle window", () => {
    expect(shouldCheckForPwaUpdate(10_000, 10_000 + PWA_UPDATE_CHECK_INTERVAL_MS - 1)).toBe(
      false,
    );
  });

  it("checks again at the throttle boundary", () => {
    expect(shouldCheckForPwaUpdate(10_000, 10_000 + PWA_UPDATE_CHECK_INTERVAL_MS)).toBe(
      true,
    );
  });
});
