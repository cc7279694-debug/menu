# Module 5A PWA Shell and Update Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为“食序”补齐可安装 PWA、安全的公共壳缓存、可靠的 Service Worker 更新提示和自包含离线页，同时绝不缓存认证页面、API、Supabase 响应或用户私人数据。

**Architecture:** 使用 Next.js App Router 的 `manifest.ts` 和 `/sw.js` Route Handler 提供 Manifest 与 Service Worker；Service Worker 采用严格静态白名单，只预缓存离线页、Manifest 和图标。根布局只挂载一个客户端 PWA Runtime，负责网络状态、更新提示、用户确认后的 `SKIP_WAITING` 和单次刷新。私人菜谱快照、IndexedDB 与离线购物变更队列留给 Module 5B，不混入本模块。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、Vitest、原生 Service Worker / Cache Storage API

**Spec:** `docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md`

## Global Constraints

- 保持 Next.js 15、React、TypeScript、Tailwind CSS、shadcn/ui、Supabase 与 Vercel 技术栈不变。
- 不新增第三方 PWA/Workbox 依赖，不升级现有技术栈。
- 不修改数据库、RLS、Storage、业务 Server Actions 或 Supabase API。
- Service Worker 不得缓存 `/login`、`/recipes`、`/shopping`、`/favorites`、`/settings`、`/_next/*`、API、RSC、Server Action、Supabase 或其他跨域响应。
- 新 Service Worker 安装后保持 waiting；只有用户点击“立即更新”后才接收 `SKIP_WAITING`。
- `controllerchange` 后最多刷新一次；不得形成更新或刷新循环。
- 激活时只清理本应用旧版本的 PWA 公共缓存，不清理其他站点缓存或私人浏览数据。
- 开发模式不注册 Service Worker，避免本地开发受到旧资源干扰。
- 不实现 IndexedDB 私人菜谱快照、离线购物变更队列或后台同步；这些属于 Module 5B。
- 不自动部署 Production、不合并 `main`、不创建 PR；Preview 部署需要单独授权。
- 保留现有 `.superpowers/sdd/2026-08-24-module-4-shopping-list/` 未跟踪目录，不纳入提交。

---

## Current Diagnosis

- 仓库目前没有 `public/`、Manifest、Service Worker、离线页或注册逻辑。
- `src/app/layout.tsx` 仅提供标题和描述，没有 Manifest、主题色、Apple PWA 元数据和 PWA Runtime。
- 认证中间件覆盖绝大多数路径；`/sw.js`、`/manifest.webmanifest` 和 `/offline.html` 必须在调用 Supabase Auth 前直接放行。
- 所有核心页面均为认证后的动态页面；因此缓存页面或 Next.js JS/CSS 会同时带来隐私泄露和版本错配风险。
- 当前产品规格中的完整 Module 5 还包含 IndexedDB 私人数据和离线同步；本计划只实现已确认的 PWA 安装、公共缓存、更新和离线壳边界。

## File Map

**Create**

- `src/app/manifest.ts`：类型化 PWA Manifest。
- `src/app/manifest.test.ts`：Manifest 与图标引用测试。
- `src/app/sw.js/route.ts`：以正确响应头提供 Service Worker。
- `src/app/sw.js/route.test.ts`：验证脚本响应头、版本和缓存边界。
- `src/features/pwa/service-worker-source.ts`：生成严格白名单 Service Worker 源码。
- `src/features/pwa/service-worker-source.test.ts`：验证安装、更新、激活、fetch 策略。
- `src/features/pwa/components/pwa-runtime.tsx`：唯一注册入口、在线状态和更新提示 UI。
- `src/features/pwa/components/pwa-runtime.test.tsx`：注册去重、等待更新、确认更新、单次刷新与在线状态测试。
- `src/lib/supabase/middleware.test.ts`：公共 PWA 资源绕过认证测试。
- `public/offline.html`：无 Next.js 资源依赖的自包含离线页。
- `public/icons/icon-192.png`：192×192 安装图标。
- `public/icons/icon-512.png`：512×512 安装图标。
- `public/icons/icon-maskable-512.png`：512×512 maskable 图标。
- `public/icons/apple-touch-icon.png`：180×180 Apple Touch 图标。
- `docs/testing/module-5a-pwa-shell-acceptance.md`：可复现验收记录。

**Modify**

- `src/app/layout.tsx`：声明 Manifest、图标、主题色并挂载一个 `PwaRuntime`。
- `src/features/auth/route-access.ts`：识别无需认证的 PWA 公共资源。
- `src/features/auth/route-access.test.ts`：覆盖公共资源和认证页面边界。
- `src/lib/supabase/middleware.ts`：PWA 公共资源在创建 Supabase 客户端前直接返回。
- `README.md`：说明 Module 5A 能力、缓存边界和 Module 5B 延期内容。

## Database and API Design

- 数据库：无迁移、无表、无 RPC、无 RLS 或 Storage 变更。
- 业务 API：无变更。
- 新静态端点：`GET /sw.js`，仅返回 Service Worker JavaScript，并设置 `Content-Type: application/javascript; charset=utf-8`、`Cache-Control: no-cache, no-store, must-revalidate` 和 `Service-Worker-Allowed: /`。
- Manifest：由 `src/app/manifest.ts` 生成 `/manifest.webmanifest`。

---

### Task 1: Installable Manifest, Icons, and Self-Contained Offline Page

**Files:**

- Create: `src/app/manifest.ts`
- Create: `src/app/manifest.test.ts`
- Create: `public/offline.html`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `public/icons/apple-touch-icon.png`
- Modify: `src/app/layout.tsx`

**Interfaces:**

- Produces: `manifest(): MetadataRoute.Manifest` at `/manifest.webmanifest`.
- Produces: exact public asset URLs used by Task 2: `/offline.html`, `/manifest.webmanifest`, `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-maskable-512.png`, `/icons/apple-touch-icon.png`.
- Consumes: `PROJECT_META.name` and `PROJECT_META.description`.

- [ ] **Step 1: Write the failing Manifest and asset tests**

```ts
import { readFile, stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("PWA install assets", () => {
  it("publishes a standalone Chinese-first manifest", () => {
    expect(manifest()).toMatchObject({
      name: "食序",
      short_name: "食序",
      start_url: "/recipes",
      scope: "/",
      display: "standalone",
      lang: "zh-CN",
      theme_color: "#27231f",
      background_color: "#faf8f3",
    });
  });

  it.each([
    ["public/icons/icon-192.png", 192, 192],
    ["public/icons/icon-512.png", 512, 512],
    ["public/icons/icon-maskable-512.png", 512, 512],
    ["public/icons/apple-touch-icon.png", 180, 180],
  ])("provides a valid PNG %s", async (path, width, height) => {
    const png = await readFile(path);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
    expect((await stat(path)).size).toBeGreaterThan(512);
  });

  it("keeps the offline fallback independent from Next.js chunks", async () => {
    const html = await readFile("public/offline.html", "utf8");
    expect(html).toContain("当前处于离线状态");
    expect(html).not.toContain("/_next/");
    expect(html).not.toContain("<script");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the files do not exist**

Run:

```powershell
npm.cmd test -- --run --maxWorkers=1 --no-file-parallelism src/app/manifest.test.ts
```

Expected: FAIL because `@/app/manifest` and public assets are missing.

- [ ] **Step 3: Implement the typed Manifest**

```ts
import type { MetadataRoute } from "next";

import { PROJECT_META } from "@/lib/project-meta";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PROJECT_META.name,
    short_name: PROJECT_META.name,
    description: PROJECT_META.description,
    start_url: "/recipes",
    scope: "/",
    display: "standalone",
    lang: "zh-CN",
    theme_color: "#27231f",
    background_color: "#faf8f3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 4: Add metadata and one PWA Runtime mount point to the root layout**

Add `manifest: "/manifest.webmanifest"`, icon declarations and `appleWebApp: { capable: true, title: PROJECT_META.name, statusBarStyle: "default" }`. Export `viewport` with `themeColor: "#27231f"`. Do not duplicate the runtime inside authenticated layouts.

- [ ] **Step 5: Create the offline page and icon assets**

Create `public/offline.html` as UTF-8 HTML with inline CSS only, `lang="zh-CN"`, responsive viewport, heading “当前处于离线状态”, explanation that私人菜谱和购物数据不会被公共缓存保存, and an ordinary `<a href="/">重新连接</a>`. It must not reference JavaScript, remote fonts, Next.js chunks or private content.

Reuse the visual composition of `src/app/favicon.ico` and current warm-neutral palette to export the four exact PNG sizes. The maskable icon must keep important artwork inside the central 80% safe zone. Do not introduce a new logo concept in this module.

- [ ] **Step 6: Run the test and verify it passes**

Run:

```powershell
npm.cmd test -- --run --maxWorkers=1 --no-file-parallelism src/app/manifest.test.ts
```

Expected: 1 file PASS with all Manifest, PNG dimension and offline-page assertions passing.

---

### Task 2: Strict-Allowlist Service Worker and No-Cache Route

**Files:**

- Create: `src/features/pwa/service-worker-source.ts`
- Create: `src/features/pwa/service-worker-source.test.ts`
- Create: `src/app/sw.js/route.ts`
- Create: `src/app/sw.js/route.test.ts`

**Interfaces:**

- Produces: `PWA_CACHE_PREFIX = "food-sequence-public-shell"`.
- Produces: `PWA_PUBLIC_ASSETS` readonly list containing only Task 1 public assets.
- Produces: `buildServiceWorkerSource(cacheVersion: string): string`.
- Produces: `GET(): Promise<Response>` for `/sw.js`.
- Consumes: `VERCEL_GIT_COMMIT_SHA` or `PWA_CACHE_VERSION`; sanitized fallback is `local-v1`.

- [ ] **Step 1: Write failing policy and route tests**

```ts
expect(PWA_PUBLIC_ASSETS).toEqual([
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
]);

const source = buildServiceWorkerSource("test-v2");
expect(source).toContain('addEventListener("install"');
expect(source).toContain('addEventListener("message"');
expect(source).toContain('data.type === "SKIP_WAITING"');
expect(source).toContain('addEventListener("activate"');
expect(source).toContain('request.mode === "navigate"');
expect(source).not.toContain('cache.put(request');
expect(source).not.toMatch(/\/recipes|\/shopping|\/login|\/_next|supabase/i);
```

Route assertions:

```ts
const response = await GET();
expect(response.headers.get("content-type")).toContain("application/javascript");
expect(response.headers.get("cache-control")).toBe("no-cache, no-store, must-revalidate");
expect(response.headers.get("service-worker-allowed")).toBe("/");
expect(await response.text()).toContain("food-sequence-public-shell");
```

- [ ] **Step 2: Run tests and verify the missing modules fail**

Run:

```powershell
npm.cmd test -- --run --maxWorkers=1 --no-file-parallelism src/features/pwa/service-worker-source.test.ts src/app/sw.js/route.test.ts
```

Expected: FAIL because the source builder and route do not exist.

- [ ] **Step 3: Implement the Service Worker source builder**

The generated script must implement exactly these behaviors:

```js
const CACHE_NAME = "food-sequence-public-shell-<sanitized-version>";
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("food-sequence-public-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
  }
});
```

Do not call `skipWaiting()` during install. Do not add runtime cache writes.

- [ ] **Step 4: Implement `/sw.js` Route Handler**

Use `VERCEL_GIT_COMMIT_SHA`, then `PWA_CACHE_VERSION`, then `local-v1`. Sanitize to letters, digits, `_` and `-`, maximum 64 characters. Return the generated source with the exact headers listed in Database and API Design. Mark the route dynamic so a new deployment/runtime version cannot receive a stale cached script.

- [ ] **Step 5: Run policy and route tests**

Run the Step 2 command. Expected: both files PASS.

---

### Task 3: Public PWA Resource Boundary Before Authentication

**Files:**

- Modify: `src/features/auth/route-access.ts`
- Modify: `src/features/auth/route-access.test.ts`
- Modify: `src/lib/supabase/middleware.ts`
- Create: `src/lib/supabase/middleware.test.ts`

**Interfaces:**

- Produces: `isPwaPublicResource(pathname: string): boolean`.
- Consumes: exact paths `/sw.js`, `/manifest.webmanifest`, `/offline.html`, plus `/icons/` prefix.
- Preserves: authenticated redirect behavior for application routes and logged-in redirect away from `/login`.

- [ ] **Step 1: Add failing route-access tests**

```ts
expect(isPwaPublicResource("/sw.js")).toBe(true);
expect(isPwaPublicResource("/manifest.webmanifest")).toBe(true);
expect(isPwaPublicResource("/offline.html")).toBe(true);
expect(isPwaPublicResource("/icons/icon-192.png")).toBe(true);
expect(isPwaPublicResource("/recipes")).toBe(false);
expect(isPwaPublicResource("/shopping")).toBe(false);
```

- [ ] **Step 2: Add a failing middleware short-circuit test**

Mock `@supabase/ssr` and assert that requesting `/sw.js` returns a pass-through response without calling `createServerClient` or `auth.getUser`. In the same test file, assert `/recipes` still creates the client and redirects an unauthenticated request to `/login?next=%2Frecipes`.

- [ ] **Step 3: Run tests and verify failure**

```powershell
npm.cmd test -- --run --maxWorkers=1 --no-file-parallelism src/features/auth/route-access.test.ts src/lib/supabase/middleware.test.ts
```

Expected: FAIL because `isPwaPublicResource` and the early return are absent.

- [ ] **Step 4: Implement the public-resource predicate and middleware early return**

At the top of `updateSession`, before `getPublicEnv()` and `createServerClient()`:

```ts
if (isPwaPublicResource(request.nextUrl.pathname)) {
  return NextResponse.next({ request });
}
```

Keep `/login` in the existing authenticated/public flow; do not treat application pages as PWA resources.

- [ ] **Step 5: Run tests and verify pass**

Run the Step 3 command. Expected: both files PASS.

---

### Task 4: Single Registration, Network Status, and User-Controlled Update UI

**Files:**

- Create: `src/features/pwa/components/pwa-runtime.tsx`
- Create: `src/features/pwa/components/pwa-runtime.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**

- Produces: `PwaRuntime(): React.ReactElement | null`.
- Registers: `/sw.js` with `{ scope: "/", updateViaCache: "none" }` only when `NODE_ENV === "production"` and the API exists.
- Consumes: `registration.waiting`, `updatefound`, worker `statechange`, `controllerchange`, `online` and `offline` events.
- Sends: `{ type: "SKIP_WAITING" }` only from the “立即更新” button.

- [ ] **Step 1: Write failing runtime tests**

Cover these exact cases with Testing Library and mocked Service Worker objects:

1. Development mode or unsupported browser performs zero registrations.
2. Two React effect cycles reuse one module-level registration promise.
3. Existing `registration.waiting` renders “发现新版本” and buttons “立即更新” / “稍后”.
4. An installing worker reaching `installed` while a controller exists renders the prompt.
5. Clicking “立即更新” posts exactly `{ type: "SKIP_WAITING" }` to the waiting worker.
6. Two `controllerchange` events call `window.location.reload()` once.
7. `offline` displays an `aria-live="polite"` banner stating current limitations; `online` removes it.
8. Unmount removes every event listener added by the component.

- [ ] **Step 2: Run the test and verify failure**

```powershell
npm.cmd test -- --run --maxWorkers=1 --no-file-parallelism src/features/pwa/components/pwa-runtime.test.tsx
```

Expected: FAIL because `PwaRuntime` does not exist.

- [ ] **Step 3: Implement the runtime component**

Use one module-level `registrationPromise`, component refs for cleanup and `hasReloadedRef`, and ordinary React state for `isOffline` and `waitingWorker`. The update prompt must be a small fixed card above mobile navigation, use existing `Button`, remain keyboard accessible, and avoid animation when reduced motion is requested.

Offline copy:

```text
当前离线。公共离线页仍可使用，私人菜谱和购物变更需要恢复网络后继续。
```

Update copy:

```text
发现新版本，更新后可获得最新页面与样式。
```

“稍后” only dismisses the current prompt; it must not activate the waiting worker.

- [ ] **Step 4: Mount once in the root layout**

Render `<PwaRuntime />` once after `{children}` in `src/app/layout.tsx`. Do not mount it again in `AppShell`, login, cooking or shopping components.

- [ ] **Step 5: Run runtime and layout-related tests**

```powershell
npm.cmd test -- --run --maxWorkers=1 --no-file-parallelism src/features/pwa/components/pwa-runtime.test.tsx src/components/app-shell.test.tsx src/app/manifest.test.ts
```

Expected: all files PASS.

---

### Task 5: Documentation, Production-Mode Browser Acceptance, and Git Delivery

**Files:**

- Modify: `README.md`
- Create: `docs/testing/module-5a-pwa-shell-acceptance.md`

**Interfaces:**

- Consumes: all Module 5A files and exact cache allowlist.
- Produces: reproducible local production acceptance evidence and a pushed feature-branch commit.

- [ ] **Step 1: Update README boundaries**

State that Module 5A provides install metadata, a self-contained public offline fallback, safe Service Worker updates and network-state feedback. Explicitly state that private recipe snapshots, offline cooking data, shopping mutation queues and background synchronization remain Module 5B.

- [ ] **Step 2: Run the full verification suite sequentially**

```powershell
npm.cmd test -- --maxWorkers=1 --no-file-parallelism
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: all tests, TypeScript and production build exit 0; ESLint has zero errors. Existing explicitly documented image-element warnings may remain only if unchanged.

- [ ] **Step 3: Run a secret and scope audit**

Inspect `git status`, `git diff --stat`, `git diff --name-only` and search staged changes for `.env`, credentials, tokens, service-role keys and connection strings. Confirm no database migration, business action, API response caching, `/_next` caching or private route caching was added.

- [ ] **Step 4: Start a production server with a local PWA version**

Use process-only local Supabase public variables and `PWA_CACHE_VERSION=qa-v1`; do not print their values. Start `npm.cmd start -- --port 3107` after the production build. Keep development Service Worker disabled and perform PWA checks only against this production server.

- [ ] **Step 5: Browser acceptance on desktop and mobile**

Using the in-app Browser:

1. Open `/recipes`, `/recipes/new`, `/shopping` and `/settings` while authenticated.
2. Verify meaningful page content, no Next.js error overlay and no relevant console errors.
3. Verify 360×800, 390×844 and 430×932 have no horizontal overflow or fixed-navigation collision.
4. Verify `navigator.serviceWorker.ready` resolves and exactly one registration controls scope `/`.
5. Verify Cache Storage contains one `food-sequence-public-shell-qa-v1` cache whose entries equal `PWA_PUBLIC_ASSETS`; it must contain no authenticated page, API, `/_next`, JS, CSS, RSC or Supabase URL.
6. Save desktop and 360px screenshots outside the repository.

- [ ] **Step 6: Verify the offline fallback**

After the worker controls the tab, stop the local server and navigate to an authenticated application route. Expected: the self-contained page shows “当前处于离线状态”, remains styled, exposes no user data and has no framework overlay. Restart the same server and verify the retry link recovers the application.

- [ ] **Step 7: Verify waiting update and one-time refresh**

Restart the production server with `PWA_CACHE_VERSION=qa-v2`, call `registration.update()` once, and verify:

1. The new worker reaches `waiting`; the page does not refresh automatically.
2. The “发现新版本” prompt appears.
3. “稍后” keeps the old worker active.
4. “立即更新” sends `SKIP_WAITING`.
5. `controllerchange` reloads exactly once.
6. After activation, only `food-sequence-public-shell-qa-v2` remains; `qa-v1` is deleted.

- [ ] **Step 8: Record the acceptance report**

Write exact URLs, viewports, cache contents, offline result, update sequence, console result, test counts, warnings and remaining Module 5B scope into `docs/testing/module-5a-pwa-shell-acceptance.md`. Do not claim Lighthouse or Vercel Preview evidence until those are actually run.

- [ ] **Step 9: Commit and push the current feature branch**

Stage only Module 5A files, excluding `.superpowers/sdd/2026-08-24-module-4-shopping-list/`.

```powershell
git commit -m "feat(pwa): add safe install and update flow"
git push origin feat/recipe-app-shopping
```

Verify local `HEAD` equals `origin/feat/recipe-app-shopping`, then pause for user acceptance. Do not merge `main` and do not create a PR.

## Preview Deployment Gate

After Module 5A local acceptance and user approval, create a separate Vercel Preview task. That task must first verify the selected Vercel project, Preview branch, non-production Supabase variables and migration state. Only the Preview URL may be used for PWA installation and Lighthouse checks; Production deployment remains explicitly excluded.

## Self-Review

- Spec coverage: Manifest, icons, installability, public offline page, strict cache boundary, network state, waiting update, user-confirmed activation, single reload, old-cache cleanup, desktop/mobile verification and Preview gate are covered.
- Intentional gap: IndexedDB private snapshots and offline shopping synchronization are excluded as Module 5B.
- Placeholder scan: no unresolved implementation marker or unspecified implementation step remains.
- Type consistency: `PWA_PUBLIC_ASSETS`, `PWA_CACHE_PREFIX`, `buildServiceWorkerSource`, `isPwaPublicResource` and `PwaRuntime` names are consistent across tasks.
