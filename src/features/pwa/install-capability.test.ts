import { describe, expect, it } from "vitest";

import {
  detectPwaInstallPlatform,
  getManualInstallSteps,
  isPwaStandalone,
} from "./install-capability";

describe("PWA install capability", () => {
  it("detects iPadOS when Safari reports a Macintosh user agent", () => {
    expect(
      detectPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1.15",
        maxTouchPoints: 5,
      }),
    ).toBe("ios-safari");
  });

  it("distinguishes iOS Safari from an iOS embedded browser", () => {
    expect(
      detectPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
        maxTouchPoints: 1,
      }),
    ).toBe("ios-safari");
    expect(
      detectPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1",
        maxTouchPoints: 1,
      }),
    ).toBe("ios-other");
  });

  it("treats either browser signal as standalone", () => {
    expect(isPwaStandalone({ displayModeStandalone: true })).toBe(true);
    expect(isPwaStandalone({ displayModeStandalone: false, navigatorStandalone: true })).toBe(true);
    expect(isPwaStandalone({ displayModeStandalone: false, navigatorStandalone: false })).toBe(false);
  });

  it("returns concrete manual steps for iOS Safari", () => {
    expect(getManualInstallSteps("ios-safari")).toEqual([
      "点击 Safari 底部或顶部的分享按钮。",
      "选择“添加到主屏幕”。",
      "确认名称为“谱序”，然后点击“添加”。",
    ]);
  });
});
