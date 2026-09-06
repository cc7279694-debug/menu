export type PwaInstallPlatform =
  | "ios-safari"
  | "ios-other"
  | "android"
  | "desktop"
  | "other";

export function isPwaStandalone(input: {
  displayModeStandalone: boolean;
  navigatorStandalone?: boolean;
}) {
  return input.displayModeStandalone || input.navigatorStandalone === true;
}

export function detectPwaInstallPlatform(input: {
  userAgent: string;
  maxTouchPoints: number;
}): PwaInstallPlatform {
  const { userAgent, maxTouchPoints } = input;
  const isIos = /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);

  if (isIos) {
    return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
      ? "ios-safari"
      : "ios-other";
  }

  if (/Android/i.test(userAgent)) return "android";
  if (/Windows|Macintosh|Linux/i.test(userAgent)) return "desktop";
  return "other";
}

export function getManualInstallSteps(platform: PwaInstallPlatform): readonly string[] {
  switch (platform) {
    case "ios-safari":
      return [
        "点击 Safari 底部或顶部的分享按钮。",
        "选择“添加到主屏幕”。",
        "确认名称为“谱序”，然后点击“添加”。",
      ];
    case "ios-other":
      return [
        "请先用 Safari 打开此页面。",
        "点击分享按钮并选择“添加到主屏幕”。",
        "确认名称为“谱序”，然后点击“添加”。",
      ];
    case "android":
      return [
        "打开浏览器菜单。",
        "选择“安装应用”或“添加到主屏幕”。",
        "确认安装谱序。",
      ];
    case "desktop":
      return [
        "点击地址栏右侧的安装图标，或打开浏览器菜单。",
        "选择“安装谱序”或“安装应用”。",
        "确认后即可从桌面或开始菜单打开。",
      ];
    default:
      return [
        "打开浏览器菜单。",
        "查找“安装应用”或“添加到主屏幕”。",
        "确认后即可从设备主屏幕打开谱序。",
      ];
  }
}
