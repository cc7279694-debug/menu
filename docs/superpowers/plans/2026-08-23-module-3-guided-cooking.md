# 食序模块 3：分步烹饪 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for every behavior change, build-web-apps:frontend-testing-debugging for rendered acceptance, and superpowers:verification-before-completion before reporting completion.

**Goal:** 在已验收的私人菜谱详情之上，交付份量换算、可恢复的单步骤厨房模式、当前步骤食材、并行计时器、屏幕常亮和本机烹饪进度。

**Architecture:** 菜谱仍由现有 Server Component 和 `getRecipeDetail()` 在线读取；新的 `/recipes/[recipeId]/cook` 页面只把类型化 `RecipeDetail` 交给 `cooking` 客户端模块。份量换算、步骤食材和计时器均使用无副作用纯函数；当前步骤、目标份数和计时器结束时间写入版本化 `localStorage` 快照，不新增数据库表，也不频繁写 Supabase。计时器以绝对 `endsAt` 时间恢复，Wake Lock 和浏览器通知都采用渐进增强，失败不得阻断做菜。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、现有 shadcn/ui、Zod 4、Supabase Auth/PostgreSQL/私有 Storage 读取、Vitest、Testing Library、原生 Web APIs（Local Storage、Screen Wake Lock、Notifications）。

**Spec:** `docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md`

## Global Constraints

- Base branch: `feat/recipe-app-recipes` at `8acd366`.
- Implementation branch: `feat/recipe-app-cooking`.
- 固定使用 Next.js 15、React、TypeScript、Tailwind CSS、shadcn/ui、Supabase 和 Vercel；不新增后端服务。
- 模块 3 不新增或修改数据库表、RLS、Storage 策略或 Supabase RPC。
- 不实现购物清单、Service Worker、IndexedDB 离线菜谱、家庭共享、AI 导入、语音控制或跨设备同步烹饪进度。
- 数字用量按 `targetServings / baseServings` 换算；文字用量保持原样；步骤覆盖用量优先于菜谱食材用量。
- 一个步骤最多保留一个计时器，不同步骤计时器可并行；计时器不实现暂停，只提供启动/重新开始、取消和完成后关闭。
- 所有本机进度都使用版本化、菜谱隔离的键；菜谱 `updatedAt` 改变时丢弃旧进度，避免恢复到已经被编辑过的步骤。
- Wake Lock、Notifications 和 Local Storage 不可用时必须显示非阻塞提示，并保留核心的步骤浏览和页面内计时。
- 手机 360px 和常见桌面宽度必须完整可操作，主要触控目标至少 44px，状态不能只用颜色表达。
- 每个任务按 TDD 执行：先写失败测试、确认失败、最小实现、确认通过，再提交一个边界清晰的 Conventional Commit。

---

## 1. Confirmed product behavior

### 1.1 Entry and resume

菜谱详情在主要操作区显示目标份数输入和“开始烹饪”。默认值为菜谱基础份数，允许 `0.25` 到 `1000`，最多两位小数。已有同一菜谱且版本仍有效的本机进度时，入口优先显示“继续上次烹饪”，同时提供“重新开始”；重新开始必须先清除旧步骤和计时器，再按当前选择的份数创建新会话。

### 1.2 Serving display

`scaleQuantity(quantity, baseServings, targetServings)` 只处理数字用量。显示规则：整数不显示小数；接近常见厨房分数 `1/8、1/4、1/3、3/8、1/2、5/8、2/3、3/4、7/8` 时显示整数加分数；其他结果四舍五入到最多两位小数并去掉末尾零。文字用量例如“适量、少许”原样显示，空单位不追加空格。

### 1.3 Step ingredients

当前步骤只显示 `ingredientLinks` 关联的食材，并保持菜谱食材原排序。用量选择优先级为：`quantityTextOverride` → `quantityOverride` → 食材 `quantityText` → 食材 `quantity` → “适量”。数字覆盖量和普通数字量都按目标份数换算；关联备注与食材预处理备注分别展示，不互相覆盖。

### 1.4 Timers

有 `timerSeconds` 的步骤显示“启动计时”。启动后，全局计时区域持续显示所有未关闭计时器；导航到其他步骤不会停止计时。剩余时间始终由 `Math.max(0, endsAt - Date.now())` 计算，页面回到前台或重新打开时立即校正。计时结束后显示可见且可读屏的“已完成”，在浏览器已授权时额外发送一次本机通知；拒绝通知权限不影响页面计时。

### 1.5 Progress, completion, and device APIs

当前步骤用稳定 `stepId` 保存，而不是数组下标。页面提供上一步、下一步、步骤总数和百分比进度；最后一步的主操作是“完成烹饪”。完成后清除该菜谱会话和计时器，释放 Wake Lock，并显示“返回菜谱”和“编辑我的备注”。Wake Lock 不支持、请求失败或被系统释放时只显示简短说明。

---

## 2. File map

### New domain files

- `src/features/cooking/types.ts`：会话、计时器、步骤食材和能力状态类型。
- `src/features/cooking/servings.ts`：份量校验、换算、厨房分数和步骤食材视图模型。
- `src/features/cooking/servings.test.ts`：数字、文字、覆盖量、排序和格式边界测试。
- `src/features/cooking/session-storage.ts`：版本化本机会话的创建、解析、读写、清除和失效规则。
- `src/features/cooking/session-storage.test.ts`：损坏 JSON、菜谱版本、步骤 ID 和重新开始测试。
- `src/features/cooking/timers.ts`：绝对结束时间、多计时器、剩余时间和通知状态纯函数。
- `src/features/cooking/timers.test.ts`：并行、后台恢复、过期、重启、取消和一次通知测试。

### New React files

- `src/features/cooking/hooks/use-cooking-session.ts`：把纯函数与 React 状态、Local Storage 和每秒时钟连接起来。
- `src/features/cooking/hooks/use-cooking-session.test.tsx`：恢复、步骤导航、持久化、完成清理测试。
- `src/features/cooking/hooks/use-wake-lock.ts`：请求、释放和前台恢复 Screen Wake Lock。
- `src/features/cooking/hooks/use-wake-lock.test.tsx`：支持、不支持、释放和失败状态测试。
- `src/features/cooking/components/cooking-entry.tsx`：菜谱详情的份数选择、继续和重新开始入口。
- `src/features/cooking/components/cooking-entry.test.tsx`：默认份数、非法值和恢复入口测试。
- `src/features/cooking/components/cooking-screen.tsx`：厨房模式组合、步骤导航、完成态和无障碍播报。
- `src/features/cooking/components/cooking-screen.test.tsx`：当前步骤食材、进度、导航、计时器和完成流程测试。
- `src/features/cooking/components/timer-tray.tsx`：并行计时器列表与启动/取消/关闭操作。
- `src/app/(app)/recipes/[recipeId]/cook/page.tsx`：受保护的服务端烹饪路由。

### Existing files to modify

- `src/features/recipes/components/recipe-detail.tsx`：嵌入 `CookingEntry`，保留现有详情展示。
- `src/features/recipes/components/recipe-detail.test.tsx`：证明详情页出现烹饪入口且仍展示原信息。
- `README.md`：记录模块 3 路由、本机进度、浏览器能力降级和验证命令。
- `docs/testing/module-3-guided-cooking-acceptance.md`：记录自动测试与浏览器验收边界，不写入密钥或真实邮箱。

---

### Task 1: Serving scaling and step-ingredient projection

**Files:**
- Create: `src/features/cooking/types.ts`
- Create: `src/features/cooking/servings.ts`
- Test: `src/features/cooking/servings.test.ts`

**Interfaces:**
- Produces: `parseTargetServings(value, fallback): number`
- Produces: `scaleQuantity(quantity, baseServings, targetServings): number`
- Produces: `formatKitchenQuantity(quantity): string`
- Produces: `formatIngredientAmount(quantity, quantityText, unit): string`
- Produces: `getStepIngredients(recipe, stepId, targetServings): CookingStepIngredient[]`

`CookingStepIngredient` must use this exact shape:

```ts
type CookingStepIngredient = {
  recipeIngredientId: string;
  name: string;
  amount: string;
  preparationNote: string | null;
  linkNote: string | null;
};
```

- [ ] **Step 1: Write failing tests for scaling and formatting**

```ts
expect(scaleQuantity(2, 2, 4)).toBe(4);
expect(formatKitchenQuantity(1.5)).toBe("1 1/2");
expect(formatKitchenQuantity(0.333333)).toBe("1/3");
expect(formatKitchenQuantity(1.27)).toBe("1.27");
expect(parseTargetServings("0", 2)).toBe(2);
expect(parseTargetServings("4.5", 2)).toBe(4.5);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm.cmd test -- src/features/cooking/servings.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected: FAIL because the `cooking/servings` module does not exist.

- [ ] **Step 3: Implement the minimal pure scaling functions**

Use this exact public contract:

```ts
export const MIN_SERVINGS = 0.25;
export const MAX_SERVINGS = 1000;

export function scaleQuantity(quantity: number, baseServings: number, targetServings: number) {
  if (!Number.isFinite(quantity) || baseServings <= 0 || targetServings <= 0) return quantity;
  return quantity * (targetServings / baseServings);
}
```

Implement the confirmed fraction list only; do not introduce arbitrary fraction approximation or unit conversion.

- [ ] **Step 4: Add failing tests for step overrides and source ordering**

```ts
expect(getStepIngredients(recipe, "step-1", 4)).toEqual([
  expect.objectContaining({ name: "鸡蛋", amount: "2 个", linkNote: "先用一半" }),
  expect.objectContaining({ name: "盐", amount: "少许" }),
]);
```

The fixture must include a numeric `quantityOverride`, a `quantityTextOverride`, a missing unit, an unlinked ingredient, and links listed in the opposite order from `recipe.ingredients`.

- [ ] **Step 5: Implement `getStepIngredients`**

Build a link map by `recipeIngredientId`, iterate `recipe.ingredients` in its existing order, discard unlinked ingredients, apply the confirmed override priority, and keep `preparationNote` separate from `linkNote`.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm.cmd test -- src/features/cooking/servings.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected: PASS.

Commit: `feat(cooking): add serving scaling rules`

---

### Task 2: Versioned local cooking sessions

**Files:**
- Modify: `src/features/cooking/types.ts`
- Create: `src/features/cooking/session-storage.ts`
- Test: `src/features/cooking/session-storage.test.ts`

**Interfaces:**
- Produces: `CookingSessionV1`
- Produces: `cookingSessionKey(recipeId): string`
- Produces: `createCookingSession(recipe, targetServings, now?): CookingSessionV1`
- Produces: `loadCookingSession(storage, recipe): CookingSessionV1 | null`
- Produces: `saveCookingSession(storage, session): boolean`
- Produces: `clearCookingSession(storage, recipeId): void`

- [ ] **Step 1: Write failing session contract tests**

The exact persisted shape is:

```ts
type CookingSessionV1 = {
  version: 1;
  recipeId: string;
  recipeUpdatedAt: string;
  targetServings: number;
  currentStepId: string;
  timers: CookingTimer[];
  startedAt: number;
  updatedAt: number;
};
```

Test that a new session selects the first sorted step, uses the requested valid servings, and stores `version: 1`.

- [ ] **Step 2: Confirm tests fail, then implement key and creation functions**

Run: `npm.cmd test -- src/features/cooking/session-storage.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected before implementation: FAIL.

Use key: `food-sequence:cooking:v1:${recipeId}`.

- [ ] **Step 3: Add corruption and invalidation tests**

Test all of these independently:

```ts
expect(loadCookingSession(storageWith("not-json"), recipe)).toBeNull();
expect(loadCookingSession(storageWith(otherRecipeSession), recipe)).toBeNull();
expect(loadCookingSession(storageWith(oldUpdatedAtSession), recipe)).toBeNull();
expect(loadCookingSession(storageWith(missingStepSession), recipe)).toBeNull();
```

Also prove out-of-range target servings and non-finite timer values are rejected.

- [ ] **Step 4: Implement defensive parsing with Zod**

Use a strict discriminated version field. Catch storage access errors because private browsing or browser policy may reject Local Storage. `saveCookingSession` returns `false` on failure so the UI can show “本机进度无法保存”; it must not throw during cooking.

- [ ] **Step 5: Run tests and commit**

Run: `npm.cmd test -- src/features/cooking/session-storage.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected: PASS.

Commit: `feat(cooking): persist local cooking progress`

---

### Task 3: Absolute-time parallel timers

**Files:**
- Modify: `src/features/cooking/types.ts`
- Create: `src/features/cooking/timers.ts`
- Test: `src/features/cooking/timers.test.ts`

**Interfaces:**
- Produces: `startStepTimer(timers, input, now): CookingTimer[]`
- Produces: `cancelStepTimer(timers, stepId): CookingTimer[]`
- Produces: `dismissStepTimer(timers, stepId): CookingTimer[]`
- Produces: `markTimerNotified(timers, stepId, now): CookingTimer[]`
- Produces: `getTimerView(timer, now): CookingTimerView`
- Produces: `formatRemainingSeconds(seconds): string`

Use these exact timer contracts:

```ts
type CookingTimer = {
  stepId: string;
  label: string;
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
  notifiedAt: number | null;
};

type CookingTimerView = CookingTimer & {
  remainingSeconds: number;
  status: "running" | "finished";
};
```

- [ ] **Step 1: Write failing absolute-time tests**

```ts
const timers = startStepTimer([], { stepId: "s1", label: "步骤 1", durationSeconds: 90 }, 1_000);
expect(timers[0].endsAt).toBe(91_000);
expect(getTimerView(timers[0], 31_000).remainingSeconds).toBe(60);
expect(getTimerView(timers[0], 120_000)).toMatchObject({ remainingSeconds: 0, status: "finished" });
```

- [ ] **Step 2: Confirm failure and implement the minimal timer functions**

Run: `npm.cmd test -- src/features/cooking/timers.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected before implementation: FAIL.

Starting the same step again replaces only that step's timer; a different step appends a second timer. Preserve stable step order by original `startedAt`.

- [ ] **Step 3: Add parallel, restart, cancellation, and notification tests**

Prove two steps count down from the same `now`, refreshing with a later `now` needs no decrement mutation, an expired timer is notified only when `notifiedAt` is null, and cancel/dismiss removes only the selected timer.

- [ ] **Step 4: Implement and run tests**

Run: `npm.cmd test -- src/features/cooking/timers.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected: PASS.

Commit: `feat(cooking): add resumable parallel timers`

---

### Task 4: React session orchestration, Wake Lock, and notifications

**Files:**
- Create: `src/features/cooking/hooks/use-cooking-session.ts`
- Test: `src/features/cooking/hooks/use-cooking-session.test.tsx`
- Create: `src/features/cooking/hooks/use-wake-lock.ts`
- Test: `src/features/cooking/hooks/use-wake-lock.test.tsx`

**Interfaces:**
- Consumes: Task 2 session storage and Task 3 timer functions.
- Produces: `useCookingSession({ recipe, requestedServings, restart }): CookingSessionController`
- Produces: `useWakeLock(enabled): { status: WakeLockStatus; message: string | null }`

`CookingSessionController` must expose these stable fields and actions:

```ts
type CookingSessionController = {
  session: CookingSessionV1;
  currentStep: RecipeDetail["steps"][number];
  currentIndex: number;
  progressPercent: number;
  timerViews: CookingTimerView[];
  storageAvailable: boolean;
  previous(): void;
  next(): void;
  restart(targetServings: number): void;
  complete(): void;
  startTimer(stepId: string, label: string, durationSeconds: number): Promise<void>;
  cancelTimer(stepId: string): void;
  dismissTimer(stepId: string): void;
};

type WakeLockStatus = "requesting" | "active" | "released" | "unsupported" | "error";
```

- [ ] **Step 1: Write failing hook tests for restore and navigation**

Render the hook with a memory `Storage` adapter and fake timers. Prove it restores `currentStepId`, moves by sorted step IDs, prevents navigation before the first/after the last step, and persists after each navigation.

- [ ] **Step 2: Confirm failure and implement session state**

Run: `npm.cmd test -- src/features/cooking/hooks/use-cooking-session.test.tsx --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected before implementation: FAIL.

The controller exposes `currentStep`, `currentIndex`, `progressPercent`, `previous`, `next`, `restart`, `complete`, `startTimer`, `cancelTimer`, and `dismissTimer`. A one-second interval updates only `now`; timer state remains absolute.

- [ ] **Step 3: Add tests for background recovery and completion**

Advance fake system time by five minutes without running five minutes of intervals, dispatch `visibilitychange`, and assert remaining time is derived from the new clock. Assert `complete()` clears the recipe key and all timers.

- [ ] **Step 4: Add one-time notification behavior**

Request notification permission only from the explicit “启动计时” interaction and only while permission is `default`. When permission is `granted`, create one notification per newly finished timer and persist `notifiedAt`; when denied or unavailable, only update the page status. Mock `globalThis.Notification` in tests and assert no duplicate constructor calls after rerender.

- [ ] **Step 5: Write Wake Lock tests before implementation**

Mock `navigator.wakeLock.request("screen")` and its sentinel. Verify request when cooking begins, release on completion/unmount, reacquire when the document becomes visible, and return `unsupported` or `error` without throwing.

- [ ] **Step 6: Implement Wake Lock, run hook tests, and commit**

Run:

```powershell
npm.cmd test -- src/features/cooking/hooks --reporter=verbose --maxWorkers=1 --fileParallelism=false
```

Expected: PASS.

Commit: `feat(cooking): orchestrate device cooking session`

---

### Task 5: Recipe-detail cooking entry

**Files:**
- Create: `src/features/cooking/components/cooking-entry.tsx`
- Test: `src/features/cooking/components/cooking-entry.test.tsx`
- Modify: `src/features/recipes/components/recipe-detail.tsx`
- Modify: `src/features/recipes/components/recipe-detail.test.tsx`

**Interfaces:**
- Consumes: `CookingSessionV1` storage contract and existing `getRecipeDetail(recipeId)`.
- Produces: `/recipes/[recipeId]/cook?servings=<number>` and optional `restart=1`.

- [ ] **Step 1: Write failing entry tests**

Test base servings default, min/max validation, a normal start link, and an existing valid session showing both “继续上次烹饪” and “重新开始”. The resume link must not erase storage; the restart interaction must clear storage before navigating with `restart=1`.

- [ ] **Step 2: Confirm failure and implement `CookingEntry`**

Run: `npm.cmd test -- src/features/cooking/components/cooking-entry.test.tsx --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected before implementation: FAIL.

Use a numeric input with an associated label, inline validation text, and a primary control at least 44px high. Do not add a modal for the normal start path.

- [ ] **Step 3: Add the entry to recipe detail**

Place it near `RecipeActions` so users reach cooking in at most three clicks. Update the existing detail test to assert the heading, original metadata, and “开始烹饪” are all present.

- [ ] **Step 4: Run entry/detail tests and commit**

Run:

```powershell
npm.cmd test -- src/features/cooking/components/cooking-entry.test.tsx src/features/recipes/components/recipe-detail.test.tsx --reporter=verbose --maxWorkers=1 --fileParallelism=false
npm.cmd run typecheck
```

Expected: PASS.

Commit: `feat(cooking): add guided cooking entry`

---

### Task 6: Mobile-first single-step cooking screen

**Files:**
- Create: `src/features/cooking/components/timer-tray.tsx`
- Create: `src/features/cooking/components/cooking-screen.tsx`
- Test: `src/features/cooking/components/cooking-screen.test.tsx`
- Create: `src/app/(app)/recipes/[recipeId]/cook/page.tsx`

**Interfaces:**
- Consumes: `RecipeDetail`, `getStepIngredients`, `useCookingSession`, and `useWakeLock`.
- Produces: the complete client-rendered kitchen flow.

- [ ] **Step 1: Write the failing first-step rendering test**

Assert the screen exposes the recipe title, “第 1 / 3 步”, a semantic progressbar with `aria-valuenow`, only the first instruction, only linked scaled ingredients, and previous disabled/next enabled.

- [ ] **Step 2: Confirm failure and implement the accessible shell**

Run: `npm.cmd test -- src/features/cooking/components/cooking-screen.test.tsx --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected before implementation: FAIL.

Use one large step card, sticky bottom navigation on mobile, a bounded centered layout on desktop, `aria-live="polite"` for step/timer changes, and visible text in addition to icons. Do not hide the global app navigation through layout restructuring in this module.

- [ ] **Step 3: Add step image enlargement test and implementation**

Clicking the current step image opens the existing shadcn Dialog with descriptive alt text and a keyboard-accessible close control. A missing image renders no empty placeholder.

- [ ] **Step 4: Add multi-timer interaction tests**

Start the first step timer, navigate to step two, start its timer, and assert both are visible in `TimerTray`. Advance the fake clock, assert finished visual/readable state, dismiss one, and assert the other remains.

- [ ] **Step 5: Add completion and degraded-capability tests**

On the last step, “完成烹饪” clears the session and renders links to `/recipes/[recipeId]` and `/recipes/[recipeId]/edit`. Mock unsupported Wake Lock, Notification, and throwing Local Storage independently; each case must retain step navigation and show one non-blocking message.

- [ ] **Step 6: Run component tests and commit**

After the screen exists, add the protected server route in the same task. Use `getRecipeDetail(recipeId)` and `notFound()` exactly like the detail route. Parse `searchParams.servings` through `parseTargetServings`; treat only `restart === "1"` as restart. Render `CookingScreen` with the recipe, requested servings, and restart flag. Do not query or mutate Supabase from the client component.

Run: `npm.cmd test -- src/features/cooking/components/cooking-screen.test.tsx --reporter=verbose --maxWorkers=1 --fileParallelism=false`

Expected: PASS.

Commit: `feat(cooking): build single-step kitchen mode`

---

### Task 7: Documentation, full verification, browser acceptance, and delivery

**Files:**
- Modify: `README.md`
- Create: `docs/testing/module-3-guided-cooking-acceptance.md`

**Interfaces:**
- Consumes: all Module 3 behavior.
- Produces: reproducible evidence and final GitHub branch state.

- [ ] **Step 1: Document the exact module boundary**

README must state:

- route `/recipes/[recipeId]/cook`;
- no database migration in Module 3;
- progress key `food-sequence:cooking:v1:<recipeId>`;
- Local Storage is device-local and not cross-device sync;
- timer accuracy comes from absolute end times;
- Wake Lock and Notifications are optional enhancements;
- Module 4 shopping and Module 5 offline/IndexedDB remain deferred.

- [ ] **Step 2: Run fresh focused and full verification serially**

Run:

```powershell
npm.cmd test -- src/features/cooking --reporter=verbose --maxWorkers=1 --fileParallelism=false
npm.cmd test -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd run test:db -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd run typecheck
npm.cmd run lint
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-review-placeholder'
npm.cmd run build
git diff --check
git status --short --branch
git grep -n -I -E "service_role|SUPABASE_SERVICE_ROLE|eyJ[a-zA-Z0-9_-]{20,}|password=" -- . ":(exclude)package-lock.json"
npm.cmd audit --omit=dev
```

Do not run the Vitest suites concurrently on the current Windows host; acceptance on 2026-08-23 proved concurrent workers can exhaust Node memory while the same suites pass serially. Record exact counts, lint warnings, build warnings, and audit advisories without relabeling them as fixed.

- [ ] **Step 3: Run required Browser acceptance**

Use `build-web-apps:frontend-testing-debugging` and the in-app Browser. If no authorized non-production Supabase credentials exist, use safe public placeholders only for login/route-protection smoke testing and mark authenticated cooking UI as requiring either mocked component evidence or later non-production acceptance.

When an authorized non-production session is available, test this exact flow at desktop and 360px mobile widths:

1. Open a two-serving recipe with at least three steps, linked ingredients, two timers, and one step image.
2. Select four servings and start cooking.
3. Confirm numeric quantities double and text quantities remain unchanged.
4. Confirm only current-step ingredients appear and override quantity wins.
5. Start timer A, move to the next step, start timer B, and confirm both remain visible.
6. Background or hide the tab, advance beyond one end time, return, and confirm remaining time is recomputed from `endsAt`.
7. Reload and confirm the current step, servings, and timers restore.
8. Verify Wake Lock unsupported/denied messaging without blocking navigation when the test browser exposes that state.
9. Complete cooking and confirm local session removal plus return/edit-note links.
10. Check URL/title, meaningful DOM, no framework overlay, console health, keyboard focus, no horizontal overflow, and screenshots.

Save screenshots outside the repository. Never use a production Supabase project or real personal email for acceptance.

- [ ] **Step 4: Update acceptance evidence and inspect scope**

The acceptance document must separate:

- pure-function and component evidence;
- local build/browser smoke evidence;
- real Supabase authenticated evidence;
- browser capability limitations;
- known dependency and `<img>` warnings.

Inspect: `git diff --stat 8acd366...HEAD` and `git diff --name-only 8acd366...HEAD`. No shopping, offline, database migration, deployment, or unrelated refactor files are allowed.

- [ ] **Step 5: Commit documentation, push, and stop**

Commit: `docs(cooking): document guided cooking acceptance`

Push without force:

```powershell
git push -u origin feat/recipe-app-cooking
```

Do not create or merge a Pull Request, push `main`, deploy Vercel, or apply any Supabase migration.

Report and stop for user acceptance with:

1. completed functions;
2. modified/new files grouped by responsibility;
3. database/API/config changes, explicitly stating “no database change”;
4. tests, Browser evidence, and any live-environment boundary;
5. known warnings and remaining risks;
6. Module 4 as the possible next module without starting it;
7. branch, every commit ID/message, push result, and GitHub branch link.

---

## 3. Plan self-review

- Spec coverage: Tasks 1–6 cover servings, one-step mode, linked ingredients, parallel timers, screen wake, local progress, image enlargement, completion, notification fallback, mobile and accessibility requirements.
- Module isolation: no database, Storage, shopping, Service Worker, IndexedDB, deployment, AI, family, or community change is required.
- Data integrity: local sessions are versioned and invalidated by recipe `updatedAt`; step IDs, not indexes, identify progress and timers.
- Timer accuracy: the persisted source of truth is `endsAt`; intervals only repaint and cannot accumulate drift.
- Degradation: Local Storage, Wake Lock, and Notifications failures are independently recoverable and never block step navigation.
- Security: the client receives only the existing RLS-protected `RecipeDetail`; no service-role key, owner override, new public API, or production action is introduced.
- Type consistency: every later task consumes named exports defined by Tasks 1–4; route and component prop names match the interfaces above.
- Scope size: each task has one reviewable responsibility and its own focused red-green test cycle and commit.
- Placeholder scan: the plan contains no unresolved product decision, deferred implementation marker, or unspecified error behavior.
