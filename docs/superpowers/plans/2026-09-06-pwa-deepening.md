# PWA 深化与离线启动体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有 Next.js、Supabase 和 Local-first 架构的前提下，让谱序 RECIPIO 的安装引导、弱网启动、版本更新和独立窗口体验更稳定、更容易理解。

**Architecture:** 保留现有 Manifest、`/sw.js`、公开 `/offline/app` 壳和 IndexedDB 私有数据层。新增纯函数形式的安装能力判断，升级现有下载入口为平台化安装引导；Service Worker 继续使用严格公开白名单，但为页面导航增加有限等待时间；`PwaRuntime` 在回到前台或恢复联网时节流检查新版本，仍由用户确认后才激活新 Worker。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、现有 shadcn/ui Dialog/Button、Service Worker、Web App Manifest、IndexedDB/Dexie、Vitest、Testing Library、Vercel。

**Spec:** `docs/superpowers/specs/2026-08-27-module-5b-offline-data-sync-design.md`、`docs/testing/module-5a-pwa-shell-acceptance.md`、已验收的 LF-4/LF-5/LF-6 实现，以及用户确认的“PWA 深化”范围。

## Global Constraints

- 不更换 Next.js 15、React、TypeScript、Tailwind、shadcn/ui、Supabase、PostgreSQL、Supabase Auth 或 Vercel。
- 不新增 Supabase 表、Migration、RLS、RPC、Storage Bucket、服务端业务 API 或环境变量。
- 不引入 Workbox、第三方 PWA 框架、推送服务、Cron 或付费服务。
- Cache Storage 只保存公开离线壳、Manifest、图标和该公开壳精确引用的 `/_next/static/` 构建资源。
- 私人菜谱、购物清单、编辑草稿、烹饪进度和同步队列继续只存 IndexedDB/Dexie，绝不写入 Cache Storage 或 localStorage。
- 登录页面、受保护 HTML/RSC、`/api/**`、Supabase 请求和 AI 请求不得进入 Service Worker 缓存。
- iOS/iPadOS 不承诺程序化安装；浏览器没有 `beforeinstallprompt` 时显示对应平台的手动步骤。
- 新 Service Worker 不自动接管；继续保留“稍后 / 立即更新”，只有用户点击“立即更新”才发送 `SKIP_WAITING`。
- 弱网超时只用于导航回退，不取消表单提交、图片上传、Supabase 同步或 AI 请求。
- 离线页面恢复联网后不自动跳转，避免丢失尚未保存的表单内容。
- 当前模块只做 PWA 深化，不重构菜谱、购物、营养、AI 导入或数据库业务逻辑。
- 实现分支使用 `feat/recipe-app-pwa-deepening`；不修改或推送 `main`，不创建或合并 PR。
- Preview 验收通过后暂停；Production 发布必须再次获得用户明确确认。

---

### Task 1: 建立可测试的安装能力模型

**Files:**
- Create: `src/features/pwa/install-capability.ts`
- Create: `src/features/pwa/install-capability.test.ts`

**Interfaces:**
- Produces `PwaInstallPlatform = "ios-safari" | "ios-other" | "android" | "desktop" | "other"`。
- Produces `detectPwaInstallPlatform(input: { userAgent: string; maxTouchPoints: number }): PwaInstallPlatform`。
- Produces `isPwaStandalone(input: { displayModeStandalone: boolean; navigatorStandalone?: boolean }): boolean`。
- Produces `getManualInstallSteps(platform: PwaInstallPlatform): readonly string[]`。
- 不读取全局 `window` 或 `navigator`，便于单元测试和 SSR 安全复用。

- [ ] **Step 1: 写失败测试，固定平台判断和中文安装步骤**

```ts
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
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa/install-capability.test.ts
```

Expected: FAIL，因为 `install-capability.ts` 尚不存在。

- [ ] **Step 3: 实现最小纯函数模型**

```ts
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
  const ua = input.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && input.maxTouchPoints > 1);
  if (ios) {
    return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
      ? "ios-safari"
      : "ios-other";
  }
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
  return "other";
}
```

`getManualInstallSteps` 必须为五个平台返回完整中文数组；`ios-other` 首条明确提示“请先用 Safari 打开此页面”，Android 使用“浏览器菜单 → 安装应用/添加到主屏幕”，桌面使用“地址栏安装图标或浏览器菜单”，`other` 使用通用浏览器菜单说明。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run Task 1 的测试命令。Expected: 新文件全部 PASS，且没有 DOM/SSR 依赖。

- [ ] **Step 5: 独立提交**

```powershell
git add src/features/pwa/install-capability.ts src/features/pwa/install-capability.test.ts
git commit -m "feat(pwa): model install capabilities"
```

---

### Task 2: 将下载入口升级为平台化安装引导

**Files:**
- Create: `src/features/pwa/components/install-app-dialog.tsx`
- Create: `src/features/pwa/components/install-app-dialog.test.tsx`
- Modify: `src/features/pwa/components/install-app-button.tsx`
- Modify: `src/features/pwa/components/install-app-button.test.tsx`

**Interfaces:**
- Consumes `PwaInstallPlatform`、`getManualInstallSteps`、`detectPwaInstallPlatform` 和 `isPwaStandalone`。
- Produces `InstallAppDialogProps = { open: boolean; platform: PwaInstallPlatform; onOpenChange(open: boolean): void }`。
- `InstallAppButton` 的公开签名保持 `InstallAppButton(): React.ReactElement`，现有两个菜谱列表无需改动。
- 继续消费浏览器 `beforeinstallprompt` 和 `appinstalled`；不在模块作用域访问 `navigator`。

- [ ] **Step 1: 写安装对话框失败测试**

```tsx
render(
  <InstallAppDialog
    onOpenChange={vi.fn()}
    open
    platform="ios-safari"
  />,
);

expect(screen.getByRole("dialog", { name: "安装谱序" })).toBeInTheDocument();
expect(screen.getByText("点击 Safari 底部或顶部的分享按钮。")).toBeInTheDocument();
expect(screen.getByText("选择“添加到主屏幕”。")).toBeInTheDocument();
```

同时扩展按钮测试，覆盖：

- 收到 `beforeinstallprompt` 时调用原生 `prompt()`；
- 用户拒绝原生安装后打开手动说明；
- iOS 没有原生事件时直接打开 Safari 安装说明；
- `appinstalled` 后按钮变为“应用已安装”且不可再次触发；
- `matchMedia("(display-mode: standalone)")` 或 `navigator.standalone` 为真时直接显示已安装；
- 卸载组件后移除全部事件监听器。

- [ ] **Step 2: 运行测试并确认 RED**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa/components/install-app-dialog.test.tsx src/features/pwa/components/install-app-button.test.tsx
```

Expected: FAIL，因为对话框不存在，现有按钮只显示一行通用说明。

- [ ] **Step 3: 使用现有 shadcn Dialog 实现安装说明**

```tsx
export type InstallAppDialogProps = {
  open: boolean;
  platform: PwaInstallPlatform;
  onOpenChange: (open: boolean) => void;
};

export function InstallAppDialog({
  open,
  platform,
  onOpenChange,
}: InstallAppDialogProps) {
  const steps = getManualInstallSteps(platform);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="install-app-description">
        <DialogHeader>
          <DialogTitle>安装谱序</DialogTitle>
          <DialogDescription id="install-app-description">
            安装后可从手机主屏幕或电脑桌面打开，已有本机菜谱可在断网时继续使用。
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li className="flex gap-3 text-sm" key={step}>
              <span aria-hidden="true">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
```

对话框只说明安装与离线边界，不宣称 AI、首次登录或未缓存图片可以离线使用。

- [ ] **Step 4: 改造按钮状态机**

按钮内部状态固定为：

```ts
type InstallUiState =
  | { kind: "checking" }
  | { kind: "installed" }
  | { kind: "native-ready"; event: InstallPromptEvent }
  | { kind: "manual"; platform: PwaInstallPlatform };
```

初次 effect 读取平台和 standalone 状态；`beforeinstallprompt` 转为 `native-ready`；原生安装被拒绝时转为 `manual` 并打开对话框；`appinstalled` 转为 `installed`。`prompt()` 或 `userChoice` 抛错时显示“浏览器没有完成安装，请按下面步骤手动安装”，但不能造成未处理 Promise。

- [ ] **Step 5: 运行组件测试并确认 GREEN**

Run Task 2 的测试命令。Expected: 所有安装分支 PASS，Dialog 有正确标题、描述、键盘关闭能力和中文步骤。

- [ ] **Step 6: 独立提交**

```powershell
git add src/features/pwa/components/install-app-dialog.tsx src/features/pwa/components/install-app-dialog.test.tsx src/features/pwa/components/install-app-button.tsx src/features/pwa/components/install-app-button.test.tsx
git commit -m "feat(pwa): guide installation by platform"
```

---

### Task 3: 在恢复联网和回到前台时检查新版本

**Files:**
- Create: `src/features/pwa/update-policy.ts`
- Create: `src/features/pwa/update-policy.test.ts`
- Modify: `src/features/pwa/components/pwa-runtime.tsx`
- Modify: `src/features/pwa/components/pwa-runtime.test.tsx`

**Interfaces:**
- Produces `PWA_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000`。
- Produces `shouldCheckForPwaUpdate(lastCheckedAt: number | null, now: number): boolean`。
- `PwaRuntime(): React.ReactElement | null` 公开签名保持不变。
- `registerServiceWorker()` 仍只在 production、浏览器支持 Service Worker 时注册一次。

- [ ] **Step 1: 写节流策略失败测试**

```ts
expect(shouldCheckForPwaUpdate(null, 1_000)).toBe(true);
expect(shouldCheckForPwaUpdate(1_000, 1_000 + PWA_UPDATE_CHECK_INTERVAL_MS - 1)).toBe(false);
expect(shouldCheckForPwaUpdate(1_000, 1_000 + PWA_UPDATE_CHECK_INTERVAL_MS)).toBe(true);
```

扩展 Runtime 测试：注册成功后，`online`、窗口 `focus`、`document.visibilitychange` 且 `visibilityState === "visible"` 会请求 `registration.update()`；五分钟内的连续事件只调用一次；`update()` 拒绝不会显示框架错误或阻塞离线提示。

- [ ] **Step 2: 运行测试并确认 RED**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa/update-policy.test.ts src/features/pwa/components/pwa-runtime.test.tsx
```

Expected: FAIL，因为没有更新策略，现有 Runtime 只在首次挂载注册。

- [ ] **Step 3: 实现纯函数节流策略**

```ts
export const PWA_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function shouldCheckForPwaUpdate(
  lastCheckedAt: number | null,
  now: number,
) {
  return lastCheckedAt === null || now - lastCheckedAt >= PWA_UPDATE_CHECK_INTERVAL_MS;
}
```

- [ ] **Step 4: 在 Runtime 中增加非阻塞更新检查**

注册完成后保留 `ServiceWorkerRegistration` 引用和 `lastCheckedAtRef`。统一函数必须先判断节流，再更新时间并调用：

```ts
function requestUpdateCheck() {
  const now = Date.now();
  if (!registration || !shouldCheckForPwaUpdate(lastCheckedAtRef.current, now)) return;
  lastCheckedAtRef.current = now;
  void registration.update().catch(() => undefined);
}
```

监听：

- `window.online`：先移除离线提示，再检查更新；
- `window.focus`：检查更新；
- `document.visibilitychange`：仅 `document.visibilityState === "visible"` 时检查更新。

Cleanup 必须移除三个新增监听器。不得加入轮询定时器，不得自动调用 `skipWaiting()`，不得因为检查失败显示持续错误提示。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run Task 3 的测试命令。Expected: 新增与原有更新确认测试全部 PASS，注册仍只发生一次。

- [ ] **Step 6: 独立提交**

```powershell
git add src/features/pwa/update-policy.ts src/features/pwa/update-policy.test.ts src/features/pwa/components/pwa-runtime.tsx src/features/pwa/components/pwa-runtime.test.tsx
git commit -m "feat(pwa): check updates on app resume"
```

---

### Task 4: 为弱网导航增加有限等待并保留安全缓存边界

**Files:**
- Modify: `src/features/pwa/service-worker-source.ts`
- Modify: `src/features/pwa/service-worker-source.test.ts`
- Modify: `src/app/sw.js/route.test.ts`

**Interfaces:**
- Produces Worker 内部常量 `NAVIGATION_TIMEOUT_MS = 3500`。
- Produces Worker 内部函数 `fetchNavigation(request): Promise<Response>`。
- `buildServiceWorkerSource(cacheVersion: string): string` 签名保持不变。
- `PWA_PUBLIC_ASSETS` 和 Cache Storage 私密数据边界保持不变。

- [ ] **Step 1: 写 Worker 源码契约失败测试**

```ts
const source = buildServiceWorkerSource("qa-v2");

expect(source).toContain("const NAVIGATION_TIMEOUT_MS = 3500");
expect(source).toContain("new AbortController()");
expect(source).toContain("controller.abort()");
expect(source).toContain("clearTimeout(timeoutId)");
expect(source).toContain("fetchNavigation(request)");
expect(source).not.toContain("cache.put(request");
expect(source).not.toContain("/api/");
expect(source).not.toContain("supabase");
```

继续断言受支持私人路径只在导航网络失败或 3.5 秒超时后重定向到 `/offline/app?path=...`，普通路径回退 `/offline.html`，静态资源仍为 cache-first，非 GET 和跨域请求继续放行。

- [ ] **Step 2: 运行测试并确认 RED**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa/service-worker-source.test.ts src/app/sw.js/route.test.ts
```

Expected: FAIL，因为现有导航直接等待 `fetch(request)`，没有超时控制。

- [ ] **Step 3: 实现仅用于导航的有限等待函数**

生成到 Worker 字符串中的实现：

```js
const NAVIGATION_TIMEOUT_MS = 3500;

async function fetchNavigation(request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

只把 `request.mode === "navigate"` 分支中的网络读取换成 `fetchNavigation(request)`。不对 API、Server Action、Supabase、图片、AI 或其他请求设置此超时；收到任何真实 HTTP Response（包括 4xx/5xx）时原样返回，只有网络异常或超时才进入离线回退，避免掩盖服务端错误。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run Task 4 的测试命令。Expected: Worker 契约 PASS，现有缓存白名单和品牌旧缓存清理测试继续通过。

- [ ] **Step 5: 独立提交**

```powershell
git add src/features/pwa/service-worker-source.ts src/features/pwa/service-worker-source.test.ts src/app/sw.js/route.test.ts
git commit -m "perf(pwa): bound weak-network navigation waits"
```

---

### Task 5: 完善离线恢复入口和独立窗口安全区

**Files:**
- Create: `src/features/pwa/components/offline-connection-action.tsx`
- Create: `src/features/pwa/components/offline-connection-action.test.tsx`
- Modify: `src/features/offline/components/offline-app.tsx`
- Modify: `src/features/offline/components/offline-app.test.tsx`
- Modify: `src/app/manifest.ts`
- Modify: `src/app/manifest.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/globals.test.ts`
- Modify: `src/components/app-shell.tsx`

**Interfaces:**
- Produces `OfflineConnectionActionProps = { href: string }`。
- `OfflineConnectionAction` 监听浏览器 `online/offline`，但不会自动导航。
- Manifest 新增稳定 `id: "/"` 和 `orientation: "any"`，现有 `start_url: "/recipes"`、`scope: "/"`、品牌名称和图标保持不变。
- `viewport` 新增 `viewportFit: "cover"`；所有主壳必须同时补足顶部和底部安全区。

- [ ] **Step 1: 写离线恢复入口失败测试**

```tsx
Object.defineProperty(window.navigator, "onLine", {
  configurable: true,
  value: false,
});

render(<OfflineConnectionAction href="/recipes/recipe-a/edit" />);
expect(screen.getByRole("button", { name: "等待网络恢复" })).toBeDisabled();

Object.defineProperty(window.navigator, "onLine", {
  configurable: true,
  value: true,
});
window.dispatchEvent(new Event("online"));

expect(await screen.findByRole("link", { name: "返回在线页面" }))
  .toHaveAttribute("href", "/recipes/recipe-a/edit");
expect(screen.getByRole("status")).toHaveTextContent("网络已恢复");
```

离线壳测试同时确认：恢复联网不会自动修改 `window.location`；编辑页、烹饪页和购物页的原目标地址保持不变；组件卸载后移除监听器。

- [ ] **Step 2: 写 Manifest 与安全区失败测试**

```ts
expect(manifest()).toMatchObject({
  id: "/",
  start_url: "/recipes",
  scope: "/",
  display: "standalone",
  orientation: "any",
});
```

`globals.test.ts` 读取 CSS 并断言存在 `.pwa-shell-content`、`.pwa-offline-frame`、`safe-area-inset-top`、`safe-area-inset-bottom` 和桌面断点覆盖。

- [ ] **Step 3: 运行测试并确认 RED**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa/components/offline-connection-action.test.tsx src/features/offline/components/offline-app.test.tsx src/app/manifest.test.ts src/app/globals.test.ts
```

Expected: FAIL，因为恢复入口、Manifest ID 和独立窗口安全区尚未实现。

- [ ] **Step 4: 实现恢复入口并接入离线壳**

```tsx
export function OfflineConnectionAction({ href }: OfflineConnectionActionProps) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setRecovered(true);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online ? (
    <div>
      {recovered ? <p role="status">网络已恢复，可以返回在线页面。</p> : null}
      <a href={href}>返回在线页面</a>
    </div>
  ) : (
    <button disabled type="button">等待网络恢复</button>
  );
}
```

实际样式复用 Button 的尺寸和圆角；`OfflineFrame` 与 `OfflineMessage` 都替换现有无条件 `<a>`。不能自动跳转，不能清空 IndexedDB，不能触发 Supabase 请求。

- [ ] **Step 5: 补齐 Manifest 与安全区**

`manifest.ts` 增加 `id` 和 `orientation`；`layout.tsx` 的 `viewport` 增加 `viewportFit: "cover"`。`globals.css` 使用两个明确类：

```css
.pwa-shell-content {
  padding-top: max(1.5rem, env(safe-area-inset-top));
  padding-bottom: max(6rem, calc(5rem + env(safe-area-inset-bottom)));
}

.pwa-offline-frame {
  padding-top: max(1.25rem, env(safe-area-inset-top));
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
}

@media (min-width: 48rem) {
  .pwa-shell-content {
    padding-top: 2rem;
    padding-bottom: 2rem;
  }
}
```

`AppShell` 将原 `py-6 pb-24 md:pb-8` 替换为 `pwa-shell-content`，保留横向 padding 和最大宽度；`OfflineFrame` 使用 `pwa-offline-frame`，避免 `viewport-fit=cover` 后内容进入刘海或 Home Indicator 区域。现有底部导航、PWA 更新提示和同步提示的 `env(safe-area-inset-bottom)` 继续保留。

- [ ] **Step 6: 运行测试并确认 GREEN**

Run Task 5 的测试命令。Expected: 离线恢复、Manifest 和安全区测试全部 PASS；在线恢复不自动离开当前表单。

- [ ] **Step 7: 独立提交**

```powershell
git add src/features/pwa/components/offline-connection-action.tsx src/features/pwa/components/offline-connection-action.test.tsx src/features/offline/components/offline-app.tsx src/features/offline/components/offline-app.test.tsx src/app/manifest.ts src/app/manifest.test.ts src/app/layout.tsx src/app/globals.css src/app/globals.test.ts src/components/app-shell.tsx
git commit -m "feat(pwa): refine standalone offline recovery"
```

---

### Task 6: 文档、完整验证、Preview 回归与交付

**Files:**
- Modify: `README.md`
- Modify: `docs/testing/module-5a-pwa-shell-acceptance.md`
- Review: Task 1–5 的全部 PWA、离线壳、布局和测试文件。

**Interfaces:**
- 文档只描述已经实现并实际验证的能力。
- 不创建数据库迁移、不修改 `.env*`、不更改 Vercel Production 环境变量。
- Consumes 当前模块全部提交；Produces 可复现的本地与 Preview 验收记录。

- [ ] **Step 1: 更新产品边界文档**

README 必须写明：

- Chromium 可使用原生安装提示，iOS/iPadOS 使用 Safari“添加到主屏幕”；
- 回到前台或恢复联网时最多每五分钟检查一次新版本；
- 用户确认后才切换 Service Worker；
- 页面导航等待 3.5 秒后才回退离线壳；该超时不作用于保存、同步、图片和 AI；
- Cache Storage 不保存私人数据，IndexedDB 仍按用户隔离；
- 离线恢复联网后由用户主动返回在线页面。

验收文档中删除已经过时的“只有公共离线页、没有 IndexedDB 私人快照”描述，并追加 LF-4/LF-5/LF-6 与本次深化后的实际边界；不能删除历史测试证据。

- [ ] **Step 2: 运行 PWA 与离线专项测试**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa src/features/offline src/app/manifest.test.ts src/app/globals.test.ts src/app/sw.js/route.test.ts src/features/recipes/components/recipe-local-first.test.tsx src/features/recipes/components/recipe-editor-local-first.test.tsx src/features/cooking/components/cooking-screen.test.tsx
```

Expected: 全部 PASS；无未处理 Promise、act 警告或跨用户数据断言失败。

- [ ] **Step 3: 运行完整工程验证**

```powershell
npm.cmd test -- --pool=forks --maxWorkers=4 --file-parallelism --exclude ".worktrees/**"
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: Tests、TypeScript、Build、`git diff --check` exit code 0；Lint 不新增错误或警告。若全量测试出现时间相关偶发失败，记录首次结果并单独重跑对应测试文件，不能只用重跑结果覆盖首次失败。

- [ ] **Step 4: 执行敏感信息与缓存边界扫描**

```powershell
rg -n --hidden -g '!node_modules' -g '!.next' -g '!.git' -g '!docs/**' -g '!.env*' '(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|SUPABASE_SERVICE_ROLE_KEY=|DASHSCOPE_API_KEY=.+|QIANWEN_API_KEY=.+)' .
rg -n 'cache\.put\(request|/api/|supabase' src/features/pwa/service-worker-source.ts
git status --short --branch
git diff --stat
```

Expected: 无真实密钥；第二条只允许测试性的否定断言或注释，不允许 Worker 运行代码缓存这些目标；工作区只包含本模块文件。

- [ ] **Step 5: 本地 Production 模式验证两个缓存版本**

第一次使用仅作用于当前进程的安全公开 Supabase 占位值和 `PWA_CACHE_VERSION=qa-v1` 构建并启动端口 `3107`。不得写入 `.env` 文件，不得输出真实密钥。浏览器验证：

1. `/manifest.webmanifest` 的 name、id、start_url、scope、display、orientation 和图标正确；
2. `/sw.js` 为 `no-store`，Worker scope 为 `/`；
3. 首页下载入口在 Chromium 原生提示可用时调用系统安装，在不支持时显示对应平台步骤；
4. Cache Storage 只有一个 `recipio-public-shell-qa-v1`，内容只包含公开白名单、`/offline/app` 和该壳精确引用的 `/_next/static/` 文件；
5. 缓存中不存在 `/login`、`/recipes` 私人 HTML/RSC、`/api/**` 或 Supabase URL；
6. 在线打开一份菜谱后断网，分别冷启动 `/recipes`、详情、编辑、烹饪和 `/shopping`，均进入保留原目标的离线壳；
7. 模拟导航 fetch 挂起，3.5 秒左右进入离线壳，不长期白屏；
8. 恢复联网只显示“网络已恢复”，不自动跳走。

随后停止服务器，用 `PWA_CACHE_VERSION=qa-v2` 重新构建启动；调用一次 `registration.update()`，确认出现“稍后 / 立即更新”，选择“稍后”不接管，点击“立即更新”后只刷新一次并清除 qa-v1。测试结束后正常停止本地服务器。

- [ ] **Step 6: 提交文档并推送功能分支**

```powershell
git add README.md docs/testing/module-5a-pwa-shell-acceptance.md
git commit -m "docs(pwa): record deepening acceptance"
git status --short --branch
git push -u origin feat/recipe-app-pwa-deepening
```

Expected: 当前分支推送成功；不推送 main、不 Force Push、不创建 PR。

- [ ] **Step 7: 等待 Vercel Preview Ready**

确认 Vercel 项目是 `recipe-app-shopping`，部署来源分支是 `feat/recipe-app-pwa-deepening`，提交与本地 HEAD 一致，环境为 Preview，状态为 Ready。若 Vercel CLI 未链接项目，使用已登录的 Vercel Dashboard 读取，不运行交互式错误项目绑定。

- [ ] **Step 8: 执行 Preview 浏览器验收**

在 Preview 进行：

- 桌面 Chromium：1440×900，检查安装入口、手动说明、键盘焦点、更新提示和无框架错误；
- 手机：390×844，检查首页按钮、Dialog、刘海/Home Indicator 安全区、底部导航和提示卡不遮挡；
- 已安装/standalone 模拟：按钮显示“应用已安装”，主内容和底部导航无横向溢出；
- 离线冷启动：列表、详情、编辑、烹饪、购物五条路径；
- 恢复网络：只出现恢复提示，用户点击后回到准确原路径；
- 控制台：无新增 error；允许记录浏览器本身不支持安装提示的能力差异；
- Cache Storage：无私人 HTML、API、RSC 或 Supabase 请求。

截图保存在仓库外临时目录；记录实际 Preview URL、Vercel Deployment ID、Commit、视口、Console、Cache Storage 条目和验收结论。

- [ ] **Step 9: 模块交付并暂停**

按项目规定汇报：完成功能、修改文件、数据库/API/配置变化、测试数量与退出码、Lint warnings、Build、敏感信息扫描、Branch、Commit 列表、Push、GitHub 分支链接、Preview 地址、已知浏览器边界。明确 Production 未发布，等待用户验收和单独授权。

## 不在本模块范围

- Web Push、邮件、后台定时提醒、Background Sync API 或 Periodic Background Sync；
- 把 AI、登录、首次数据恢复或云图片变成离线功能；
- 缓存登录后的 Next.js HTML、RSC、Server Action 或 Supabase 响应；
- 自动覆盖用户正在使用的旧版本；
- Android APK/AAB、Capacitor、App Store 或应用商店发布；
- 改写 IndexedDB schema、同步冲突策略或增加 CRDT；
- UI 全面重设计或无关依赖升级。

## 风险与控制

- **iOS 没有 `beforeinstallprompt`：** 只提供 Safari 手动步骤，不伪造系统安装成功状态。
- **弱网超时可能过早进入离线壳：** 仅导航使用 3.5 秒，用户恢复网络后可主动返回；保存和同步不受影响。
- **`viewport-fit=cover` 可能让内容进入系统安全区：** 同一 Task 同时加入主壳与离线壳安全区 CSS，并在 390×844 和 standalone 模式验证。
- **Worker 更新造成重复刷新：** 保留现有 `hasReloadedRef`，更新检查节流为五分钟，激活仍需用户确认。
- **静态构建资源缓存扩大：** 仍只解析同源 `/offline/app` HTML 的 `/_next/static/` 引用，不运行运行时通配缓存写入。
- **旧缓存占空间：** 激活时继续清理 `recipio-public-shell-*` 旧版本和旧品牌 `food-sequence-public-shell-*`，不删除其他站点缓存。
- **安装状态无法跨所有浏览器准确检测：** 只信任 `display-mode: standalone`、iOS `navigator.standalone` 和 `appinstalled`，其他情况展示可恢复的安装说明。

## Self-review

- **Spec coverage:** 安装入口、平台差异、离线冷启动、弱网等待、前台更新、用户确认接管、独立窗口安全区、缓存隐私边界和 Preview 验收均有对应 Task。
- **Scope control:** 没有新增数据库、API、环境变量、付费服务或 PWA 框架；没有触碰 AI、营养、菜谱业务表或同步协议。
- **Type consistency:** `PwaInstallPlatform` 由 Task 1 产生并被 Task 2 消费；`OfflineConnectionActionProps` 只包含 `href`；`PwaRuntime`、`InstallAppButton` 和 `buildServiceWorkerSource` 的现有公开签名保持不变。
- **Placeholder scan:** 计划中没有 TBD/TODO/“类似前一步”；每个实现 Task 都给出明确文件、接口、失败测试、实现约束、验证命令和提交信息。
- **Release boundary:** 只推送 `feat/recipe-app-pwa-deepening` 并验收 Preview；Production 仍需单独确认。
