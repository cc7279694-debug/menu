# 食序模块 1：项目基础、登录与导航 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Before implementation, use `superpowers:using-git-worktrees` to create an isolated worktree for branch `feat/recipe-app-foundation-auth`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可运行的 Next.js 15 应用、Supabase 邮箱验证码登录、受保护路由和手机/桌面响应式导航，为后续菜谱模块提供稳定基础。

**Architecture:** 使用 Next.js 15 App Router 和 TypeScript；Supabase SSR 客户端统一封装浏览器、服务端和 Middleware 会话刷新。登录采用“发送邮箱验证码 → 输入 6 位验证码 → 服务端验证”的双阶段流程；认证后的页面放在受保护 Route Group 中，并通过统一 App Shell 提供手机底部导航和桌面侧栏。

**Tech Stack:** Next.js 15、React 19、TypeScript、Tailwind CSS 4、shadcn/ui、Supabase Auth、`@supabase/ssr`、Zod、Vitest、Testing Library

**Spec:** `docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md`

## Global Constraints

- 所有应用代码使用 TypeScript；不创建独立后端服务。
- 固定使用 Next.js 15、React 19、Tailwind CSS 4、shadcn/ui、Supabase 和 Vercel 兼容结构。
- 本模块不创建业务数据表，不执行 Supabase Migration，不接触生产项目。
- 本模块只实现项目基础、邮箱验证码登录、路由保护和导航占位页。
- 不实现菜谱 CRUD、购物清单、PWA 离线缓存或图片上传。
- 所有私密值只存在于未提交的 `.env.local`；仓库只提交字段为空的 `.env.example`。
- Windows 环境使用 `npm.cmd` 和 `npx.cmd`，避免 PowerShell 执行策略阻塞。
- 每个任务独立测试并提交；模块全部验证通过后才推送功能分支。
- 未配置 GitHub Remote 时不得自行创建远程仓库，报告缺失并暂停推送。

## Planned File Map

### Project and test infrastructure

- `package.json`：依赖、开发脚本和测试脚本。
- `next.config.ts`：Next.js 配置。
- `tsconfig.json`：严格 TypeScript 与 `@/*` 路径别名。
- `eslint.config.mjs`：Next.js ESLint 配置。
- `postcss.config.mjs`：Tailwind PostCSS 配置。
- `components.json`：shadcn/ui 配置。
- `vitest.config.ts`：Vitest + jsdom + 路径别名。
- `src/test/setup.ts`：Testing Library matcher 和测试清理。
- `.env.example`：无值的 Supabase 公共变量模板。

### App shell

- `src/app/layout.tsx`：根布局、元数据和全局样式。
- `src/app/page.tsx`：根据会话跳转登录页或菜谱首页。
- `src/app/globals.css`：温暖中性色设计变量和全局基础样式。
- `src/app/(auth)/login/page.tsx`：邮箱验证码登录页。
- `src/app/(app)/layout.tsx`：认证检查和 App Shell。
- `src/app/(app)/recipes/page.tsx`：菜谱模块占位页。
- `src/app/(app)/shopping/page.tsx`：购物模块占位页。
- `src/app/(app)/favorites/page.tsx`：收藏模块占位页。
- `src/app/(app)/settings/page.tsx`：账号信息和退出入口。

### Supabase and authentication

- `src/lib/env.ts`：环境变量校验。
- `src/lib/supabase/browser.ts`：浏览器 Supabase Client。
- `src/lib/supabase/server.ts`：Server Component/Action Supabase Client。
- `src/lib/supabase/middleware.ts`：刷新会话并执行路由保护。
- `src/middleware.ts`：Next.js Middleware 入口和 matcher。
- `src/features/auth/schemas.ts`：邮箱、验证码和回跳地址校验。
- `src/features/auth/actions.ts`：发送验证码、验证验证码和退出登录。
- `src/features/auth/components/login-form.tsx`：双阶段登录表单。
- `src/features/auth/route-access.ts`：公开路由判断和安全回跳地址。

### Navigation

- `src/features/navigation/routes.ts`：唯一导航配置源。
- `src/components/app-shell.tsx`：响应式应用布局。
- `src/components/mobile-bottom-nav.tsx`：手机底部导航。
- `src/components/desktop-sidebar.tsx`：桌面侧栏。
- `src/components/page-placeholder.tsx`：模块未开发时的统一占位内容。

---

### Task 1: Scaffold the Next.js 15 project and test harness

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `components.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/project-meta.ts`
- Test: `src/lib/project-meta.test.ts`

**Interfaces:**
- Consumes: confirmed design spec only.
- Produces: `PROJECT_META`, npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`; base App Router project used by all later tasks.

- [ ] **Step 1: Scaffold into the existing documentation repository**

Run from the isolated worktree root:

```powershell
npx.cmd create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*"
```

Expected: the CLI creates the Next.js application files and preserves `docs/`. If it reports a conflicting generated file, stop and inspect that exact path rather than overwriting documentation.

- [ ] **Step 2: Install focused runtime and test dependencies**

```powershell
npm.cmd install @supabase/ssr @supabase/supabase-js zod lucide-react clsx tailwind-merge class-variance-authority
npm.cmd install -D tailwindcss@4 @tailwindcss/postcss vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx.cmd shadcn@latest init -d
```

Expected: lockfile updates once; shadcn creates `components.json` and `src/lib/utils.ts` without adding unrelated components.

- [ ] **Step 3: Add deterministic scripts to `package.json`**

Set the scripts exactly to:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

If the generated Next 15 patch no longer supports `next lint`, replace only `lint` with `eslint .`; do not change both commands speculatively.

- [ ] **Step 4: Write the failing project metadata test**

Create `src/lib/project-meta.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { PROJECT_META } from "@/lib/project-meta";

describe("PROJECT_META", () => {
  it("uses the approved Chinese product identity", () => {
    expect(PROJECT_META.name).toBe("食序");
    expect(PROJECT_META.description).toContain("分步烹饪");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

```powershell
npm.cmd test -- src/lib/project-meta.test.ts
```

Expected: FAIL because `@/lib/project-meta` does not exist.

- [ ] **Step 6: Add Vitest configuration and minimal metadata**

Create `vitest.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `src/lib/project-meta.ts`:

```ts
export const PROJECT_META = {
  name: "食序",
  description: "记录自己的菜谱，一步一步完成分步烹饪。",
} as const;
```

Use `PROJECT_META` in `src/app/layout.tsx` metadata. Replace the generated demo content in `src/app/page.tsx` with a plain server-rendered loading shell; Task 4 will add session redirects.

- [ ] **Step 7: Run baseline verification**

```powershell
npm.cmd test -- src/lib/project-meta.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: all commands PASS. The generated application builds without Supabase environment variables because no client has been invoked yet.

- [ ] **Step 8: Commit the scaffold**

```powershell
git add package.json package-lock.json next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs components.json src vitest.config.ts
git commit -m "chore(app): scaffold Next.js foundation"
```

---

### Task 2: Add validated environment access and Supabase clients

**Files:**
- Create: `.env.example`
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Test: `src/lib/env.test.ts`

**Interfaces:**
- Consumes: `@supabase/ssr`, `zod`, Next.js `cookies()`.
- Produces: `parsePublicEnv(input)`, `getPublicEnv()`, `getBrowserSupabaseClient()`, `createServerSupabaseClient()`.

- [ ] **Step 1: Write failing environment validation tests**

Create `src/lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/lib/env";

describe("parsePublicEnv", () => {
  it("accepts a valid Supabase URL and anonymous key", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("rejects missing public configuration", () => {
    expect(() => parsePublicEnv({})).toThrow("Supabase configuration is missing");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npm.cmd test -- src/lib/env.test.ts
```

Expected: FAIL because `@/lib/env` does not exist.

- [ ] **Step 3: Implement environment validation**

Create `.env.example` with empty values only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  input: Record<string, string | undefined>,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Supabase configuration is missing or invalid");
  }

  return parsed.data;
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
```

- [ ] **Step 4: Implement browser and server clients**

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    const env = getPublicEnv();
    browserClient = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }

  return browserClient;
}
```

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies; Middleware refreshes them.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Verify configuration code**

```powershell
npm.cmd test -- src/lib/env.test.ts
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Expected: all commands PASS; `.env.local` does not exist in Git status.

- [ ] **Step 6: Commit the Supabase client boundary**

```powershell
git add .env.example src/lib/env.ts src/lib/env.test.ts src/lib/supabase/browser.ts src/lib/supabase/server.ts
git commit -m "feat(auth): add Supabase client boundary"
```

---

### Task 3: Implement email OTP domain rules and server actions

**Files:**
- Create: `src/features/auth/schemas.ts`
- Create: `src/features/auth/actions.ts`
- Test: `src/features/auth/schemas.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient()`.
- Produces: `emailSchema`, `otpSchema`, `nextPathSchema`, `requestEmailOtp(previousState, formData)`, `verifyEmailOtp(previousState, formData)`, `signOut()` and `AuthActionState`.

- [ ] **Step 1: Write failing authentication schema tests**

Create `src/features/auth/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  emailSchema,
  nextPathSchema,
  otpSchema,
} from "@/features/auth/schemas";

describe("authentication schemas", () => {
  it("normalizes a valid email", () => {
    expect(emailSchema.parse("  Cook@Example.com ")).toBe("cook@example.com");
  });

  it("accepts exactly six digits for email OTP", () => {
    expect(otpSchema.parse("012345")).toBe("012345");
    expect(() => otpSchema.parse("12345")).toThrow();
    expect(() => otpSchema.parse("12345a")).toThrow();
  });

  it("rejects external redirect targets", () => {
    expect(nextPathSchema.parse("/recipes")).toBe("/recipes");
    expect(nextPathSchema.parse("https://evil.example")).toBe("/recipes");
    expect(nextPathSchema.parse("//evil.example")).toBe("/recipes");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npm.cmd test -- src/features/auth/schemas.test.ts
```

Expected: FAIL because the schemas module does not exist.

- [ ] **Step 3: Implement the schemas and state type**

Create `src/features/auth/schemas.ts`:

```ts
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("请输入有效邮箱地址");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "请输入 6 位验证码");

export const nextPathSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/recipes";
    }

    return value;
  });

export type AuthActionState = {
  status: "idle" | "code-sent" | "error";
  message?: string;
  email?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = { status: "idle" };
```

- [ ] **Step 4: Implement server actions with exact error boundaries**

Create `src/features/auth/actions.ts` with `"use server"` and these behaviors:

```ts
"use server";

import { redirect } from "next/navigation";

import {
  emailSchema,
  nextPathSchema,
  otpSchema,
  type AuthActionState,
} from "@/features/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requestEmailOtp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));

  if (!parsedEmail.success) {
    return { status: "error", message: parsedEmail.error.issues[0]?.message };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsedEmail.data,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { status: "error", message: "验证码发送失败，请稍后重试" };
  }

  return {
    status: "code-sent",
    email: parsedEmail.data,
    message: "验证码已发送，请检查邮箱",
  };
}

export async function verifyEmailOtp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const parsedOtp = otpSchema.safeParse(formData.get("token"));
  const nextPath = nextPathSchema.parse(formData.get("next")?.toString());

  if (!parsedEmail.success || !parsedOtp.success) {
    return { status: "error", message: "邮箱或验证码格式不正确" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsedEmail.data,
    token: parsedOtp.data,
    type: "email",
  });

  if (error) {
    return { status: "error", email: parsedEmail.data, message: "验证码无效或已过期" };
  }

  redirect(nextPath);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

Do not expose Supabase error text to users; log only a sanitized error category if diagnostics are later added.

- [ ] **Step 5: Verify the auth domain layer**

```powershell
npm.cmd test -- src/features/auth/schemas.test.ts
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Expected: tests PASS; the server action module contains no service-role key or client-provided `user_id`.

- [ ] **Step 6: Commit OTP authentication logic**

```powershell
git add src/features/auth
git commit -m "feat(auth): add email OTP actions"
```

---

### Task 4: Build the two-stage login page

**Files:**
- Create: `src/features/auth/components/login-form.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Test: `src/features/auth/components/login-form.test.tsx`

**Interfaces:**
- Consumes: `requestEmailOtp`, `verifyEmailOtp`, `INITIAL_AUTH_STATE`.
- Produces: `<LoginForm nextPath?: string />` and accessible `/login` page.

- [ ] **Step 1: Add only the required shadcn components**

```powershell
npx.cmd shadcn@latest add button card input label
```

Expected: only the four listed UI component files and their required shared utility changes are added.

- [ ] **Step 2: Write a failing accessible login form test**

Create `src/features/auth/components/login-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/actions", () => ({
  requestEmailOtp: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

import { LoginForm } from "@/features/auth/components/login-form";

describe("LoginForm", () => {
  it("starts with an accessible email step", () => {
    render(<LoginForm nextPath="/recipes" />);

    expect(screen.getByLabelText("邮箱地址")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeEnabled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```powershell
npm.cmd test -- src/features/auth/components/login-form.test.tsx
```

Expected: FAIL because `LoginForm` does not exist.

- [ ] **Step 4: Implement the client form**

Create `src/features/auth/components/login-form.tsx`:

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";

import {
  requestEmailOtp,
  verifyEmailOtp,
} from "@/features/auth/actions";
import { INITIAL_AUTH_STATE } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath = "/recipes" }: LoginFormProps) {
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(
    requestEmailOtp,
    INITIAL_AUTH_STATE,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailOtp,
    INITIAL_AUTH_STATE,
  );

  useEffect(() => {
    if (requestState.status === "code-sent" && requestState.email) {
      setVerifiedEmail(requestState.email);
      setPhase("otp");
    }
  }, [requestState]);

  if (phase === "email") {
    return (
      <form action={requestAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">邮箱地址</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {requestState.message}
        </p>
        <Button className="w-full" disabled={requestPending} type="submit">
          {requestPending ? "正在发送…" : "发送验证码"}
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input name="email" type="hidden" value={verifiedEmail} />
      <input name="next" type="hidden" value={nextPath} />
      <div className="space-y-2">
        <Label htmlFor="token">6 位验证码</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          required
        />
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {verifyState.message ?? requestState.message}
      </p>
      <Button className="w-full" disabled={verifyPending} type="submit">
        {verifyPending ? "正在验证…" : "验证并登录"}
      </Button>
      <Button
        className="w-full"
        onClick={() => setPhase("email")}
        type="button"
        variant="ghost"
      >
        更换邮箱
      </Button>
    </form>
  );
}
```

The OTP stays only in browser form state. Use the approved copy exactly as shown.

- [ ] **Step 5: Implement the login page**

Create `src/app/(auth)/login/page.tsx` as a Server Component:

```tsx
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { nextPathSchema } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "登录 · 食序" };

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = nextPathSchema.parse(next);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登录食序</CardTitle>
          <CardDescription>使用邮箱验证码同步你的个人菜谱。</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm nextPath={nextPath} />
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 6: Verify the login UI**

```powershell
npm.cmd test -- src/features/auth/components/login-form.test.tsx
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Expected: test PASS; all form controls have visible labels and focus states.

- [ ] **Step 7: Commit the login page**

```powershell
git add -- 'src/app/(auth)/login' 'src/components/ui' 'src/features/auth/components'
git commit -m "feat(auth): build email OTP login page"
```

---

### Task 5: Add session refresh and protected routing

**Files:**
- Create: `src/features/auth/route-access.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Modify: `src/app/page.tsx`
- Test: `src/features/auth/route-access.test.ts`

**Interfaces:**
- Consumes: Supabase public environment values and SSR cookies.
- Produces: `isPublicPath(pathname)`, `buildLoginRedirect(requestUrl)`, `updateSession(request)`; redirects unauthenticated app routes to `/login?next=...`.

- [ ] **Step 1: Write failing route-access tests**

Create `src/features/auth/route-access.test.ts`:

```ts
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
    expect(buildLoginRedirect(new URL("https://food.test/favorites?q=egg")).toString()).toBe(
      "https://food.test/login?next=%2Ffavorites%3Fq%3Degg",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npm.cmd test -- src/features/auth/route-access.test.ts
```

Expected: FAIL because route-access helpers do not exist.

- [ ] **Step 3: Implement pure route helpers**

Create `src/features/auth/route-access.ts`:

```ts
const PUBLIC_PATHS = new Set(["/login"]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function buildLoginRedirect(requestUrl: URL): URL {
  const redirectUrl = new URL("/login", requestUrl);
  redirectUrl.searchParams.set("next", `${requestUrl.pathname}${requestUrl.search}`);
  return redirectUrl;
}
```

- [ ] **Step 4: Implement Supabase session Middleware**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  buildLoginRedirect,
  isPublicPath,
} from "@/features/auth/route-access";
import { getPublicEnv } from "@/lib/env";

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    return copySessionCookies(
      response,
      NextResponse.redirect(buildLoginRedirect(request.nextUrl)),
    );
  }

  if (user && pathname === "/login") {
    return copySessionCookies(
      response,
      NextResponse.redirect(new URL("/recipes", request.url)),
    );
  }

  return response;
}
```

Create `src/middleware.ts`:

```ts
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Implement root routing**

Update `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/recipes" : "/login");
}
```

- [ ] **Step 6: Verify route protection**

```powershell
npm.cmd test -- src/features/auth/route-access.test.ts
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Expected: all commands PASS. A URL containing query parameters retains only the internal path/query in `next`.

- [ ] **Step 7: Commit route protection**

```powershell
git add src/app/page.tsx src/features/auth/route-access.ts src/features/auth/route-access.test.ts src/lib/supabase/middleware.ts src/middleware.ts
git commit -m "feat(auth): protect authenticated routes"
```

---

### Task 6: Build responsive authenticated navigation

**Files:**
- Create: `src/features/navigation/routes.ts`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/mobile-bottom-nav.tsx`
- Create: `src/components/desktop-sidebar.tsx`
- Create: `src/components/page-placeholder.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/recipes/page.tsx`
- Create: `src/app/(app)/shopping/page.tsx`
- Create: `src/app/(app)/favorites/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/features/navigation/routes.test.ts`
- Test: `src/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient()`, `signOut()`.
- Produces: `APP_ROUTES`, `<AppShell>{children}</AppShell>`, authenticated placeholder routes `/recipes`, `/shopping`, `/favorites`, `/settings`.

- [ ] **Step 1: Write failing navigation configuration test**

Create `src/features/navigation/routes.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npm.cmd test -- src/features/navigation/routes.test.ts
```

Expected: FAIL because navigation routes do not exist.

- [ ] **Step 3: Implement the single navigation source**

Create `src/features/navigation/routes.ts`:

```ts
import { BookOpen, Heart, Settings, ShoppingBasket } from "lucide-react";

export const APP_ROUTES = [
  { href: "/recipes", label: "菜谱", icon: BookOpen },
  { href: "/shopping", label: "购物", icon: ShoppingBasket },
  { href: "/favorites", label: "收藏", icon: Heart },
  { href: "/settings", label: "设置", icon: Settings },
] as const;
```

Both mobile and desktop navigation must map this array; they must not duplicate route data.

- [ ] **Step 4: Write the failing App Shell test**

Create `src/components/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/recipes",
}));

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("renders content and both responsive navigation landmarks", () => {
    render(<AppShell><h1>我的菜谱</h1></AppShell>);

    expect(screen.getByRole("heading", { name: "我的菜谱" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "桌面主导航" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "手机主导航" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the App Shell test to verify it fails**

```powershell
npm.cmd test -- src/components/app-shell.test.tsx
```

Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 6: Implement responsive navigation components**

Create `src/components/desktop-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/features/navigation/routes";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-dvh w-64 border-r bg-card p-5 md:block">
      <div className="mb-8 text-xl font-semibold">食序</div>
      <nav aria-label="桌面主导航" className="space-y-1">
        {APP_ROUTES.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
                active && "bg-accent font-medium text-accent-foreground",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

Create `src/components/mobile-bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/features/navigation/routes";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="手机主导航"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {APP_ROUTES.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
              active && "bg-accent font-medium text-accent-foreground",
            )}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Create `src/components/app-shell.tsx`:

```tsx
import type { ReactNode } from "react";

import { DesktopSidebar } from "@/components/desktop-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <DesktopSidebar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-8 md:pb-8">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 7: Add the protected layout and placeholder pages**

Create `src/app/(app)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
```

Create a focused `PagePlaceholder` with props:

```tsx
export type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
    </section>
  );
}
```

Do not add disabled buttons that look actionable.

Use it for:

- `/recipes`: “我的菜谱” / “下一模块将在这里添加、整理和搜索菜谱。”
- `/shopping`: “购物清单” / “购物清单将在菜谱模块完成后接入。”
- `/favorites`: “我的收藏” / “收藏的菜谱会集中显示在这里。”

Create the three pages with this exact pattern, substituting only the listed copy:

```tsx
import { PagePlaceholder } from "@/components/page-placeholder";

export default function RecipesPage() {
  return (
    <PagePlaceholder
      title="我的菜谱"
      description="下一模块将在这里添加、整理和搜索菜谱。"
    />
  );
}
```

Create `src/app/(app)/shopping/page.tsx`:

```tsx
import { PagePlaceholder } from "@/components/page-placeholder";

export default function ShoppingPage() {
  return (
    <PagePlaceholder
      title="购物清单"
      description="购物清单将在菜谱模块完成后接入。"
    />
  );
}
```

Create `src/app/(app)/favorites/page.tsx`:

```tsx
import { PagePlaceholder } from "@/components/page-placeholder";

export default function FavoritesPage() {
  return (
    <PagePlaceholder
      title="我的收藏"
      description="收藏的菜谱会集中显示在这里。"
    />
  );
}
```

Create `src/app/(app)/settings/page.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline">退出登录</Button>
      </form>
    </section>
  );
}
```

It must not expose user IDs or token values.

- [ ] **Step 8: Apply the approved visual foundation**

Update the theme tokens in `src/app/globals.css` to the following light foundation, retaining Tailwind/shadcn directives generated by the CLI:

```css
:root {
  color-scheme: light;
  --background: oklch(0.985 0.006 85);
  --foreground: oklch(0.19 0.012 55);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.19 0.012 55);
  --primary: oklch(0.25 0.018 55);
  --primary-foreground: oklch(0.985 0.006 85);
  --secondary: oklch(0.94 0.014 80);
  --secondary-foreground: oklch(0.25 0.018 55);
  --muted: oklch(0.95 0.01 80);
  --muted-foreground: oklch(0.48 0.015 55);
  --accent: oklch(0.91 0.025 78);
  --accent-foreground: oklch(0.25 0.018 55);
  --border: oklch(0.88 0.012 75);
  --input: oklch(0.84 0.014 75);
  --ring: oklch(0.36 0.02 55);
  --radius: 0.875rem;
}

body {
  min-height: 100dvh;
  background: var(--background);
  color: var(--foreground);
}
```

Food photography will provide stronger color in later modules; do not add gradients, glass effects or decorative animation in this module.

- [ ] **Step 9: Verify the authenticated shell**

```powershell
npm.cmd test -- src/features/navigation/routes.test.ts src/components/app-shell.test.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: tests, typecheck, lint and build PASS. The build must not require real Supabase credentials merely to compile; runtime auth still requires `.env.local`.

- [ ] **Step 10: Commit responsive navigation**

```powershell
git add src/app src/components src/features/navigation
git commit -m "feat(app): add responsive authenticated shell"
```

---

### Task 7: Complete module verification and handoff

**Files:**
- Create: `README.md`
- Modify only if verification finds an in-scope defect: files created in Tasks 1-6.

**Interfaces:**
- Consumes: the completed module.
- Produces: reproducible setup instructions, verification evidence, one clean feature branch ready for user acceptance.

- [ ] **Step 1: Write reproducible local setup documentation**

Create `README.md` containing:

1. product name and one-paragraph MVP summary;
2. prerequisites: Node.js compatible with Next.js 15 and npm;
3. `npm.cmd install` and `npm.cmd run dev` commands;
4. copy `.env.example` to `.env.local` and fill only the two public Supabase variables;
5. commands for `test`, `typecheck`, `lint`, and `build`;
6. statement that Module 1 contains no database migration and no production deployment;
7. link to the design spec and this implementation plan.

- [ ] **Step 2: Run the complete code-level verification suite**

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: every command exits with code 0. If build requires runtime environment variables, verify the clients are not initialized at module import time before considering any test-only placeholders.

- [ ] **Step 3: Inspect the exact change boundary and secrets**

```powershell
git status --short --branch
git diff --check
git diff --stat 6ccf038...HEAD
git grep -n -I -E "service_role|SUPABASE_SERVICE_ROLE|eyJ[a-zA-Z0-9_-]{20,}|password=" -- . ":(exclude)package-lock.json"
```

Expected: only Module 1 app files, README and plan-related history are present; secret scan returns no committed credential. If the comparison branch name differs, use the actual documented base commit `6ccf038` rather than guessing.

- [ ] **Step 4: Commit documentation or verification fixes**

```powershell
git add README.md
git commit -m "docs(app): document local foundation setup"
```

If verification required an in-scope fix, include only that fix and its test in a separate Conventional Commit before the documentation commit.

- [ ] **Step 5: Perform optional non-production auth acceptance only when authorized**

Required inputs: a confirmed non-production Supabase URL and anon key in local `.env.local`. Never print their values.

Acceptance flow:

1. open `/login` at mobile and desktop widths;
2. send an OTP to an explicitly authorized test email;
3. verify a wrong code shows the generic error;
4. verify a valid code enters `/recipes`;
5. open `/settings`, confirm only the email is shown, then sign out;
6. confirm `/recipes` redirects back to `/login?next=%2Frecipes`;
7. confirm no database migration, Storage bucket or production resource was changed.

If non-production credentials or email authorization are absent, mark this acceptance as pending; code-level success must not be reported as real Supabase success.

- [ ] **Step 6: Push only the current feature branch when a remote exists**

```powershell
git push -u origin feat/recipe-app-foundation-auth
```

Expected: push succeeds without force. If `origin` is absent, authentication fails, or the remote rejects the push, make no repeated or destructive attempts; report the exact blocker and pause.

- [ ] **Step 7: Deliver Module 1 and stop**

Report exactly:

1. completed foundation, login and navigation behavior;
2. created or modified files grouped by responsibility;
3. no migration, or the exact non-production configuration used without values;
4. all code-level and any authorized live-test results;
5. pending real-environment or remote limitations;
6. Module 2 as the next possible module, without starting it;
7. branch name, commit IDs, commit messages, push result and remote branch link when available.

Wait for user acceptance before planning or implementing Module 2.
