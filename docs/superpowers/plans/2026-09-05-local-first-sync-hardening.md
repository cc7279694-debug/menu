# Local-first 同步状态与重试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让谱序的本地操作具备可见的同步状态、可控的重试入口，并在网络恢复和多设备读取时保持简单的 Last Write Wins 行为。

**Architecture:** 保留现有 IndexedDB/Dexie 队列和 Supabase Server Action，不新增服务或数据库表。队列记录继续保存本地操作，新增轻量同步摘要和最近失败时间；`OfflineSyncRuntime` 负责自动同步、离线提示和用户主动重试。菜谱读取继续使用现有的本地时间戳保护，云端较旧结果不得覆盖有更新的本地快照。

**Tech Stack:** Next.js 15, React 19, TypeScript, Dexie.js, Supabase Server Actions, Vitest, Testing Library, Vercel Preview。

**Spec:** 用户提供的 “Local-first + Cloud Sync + PWA-ready” 改造要求；当前 LF-1、LF-2、LF-3a、LF-3b 已完成并通过验收。

## Global Constraints

- 继续使用 Next.js 15、React、TypeScript、Tailwind CSS、shadcn/ui、Supabase、Vercel。
- 不新增 Supabase 表、迁移、环境变量或第三方同步服务。
- IndexedDB/Dexie 是本地结构化数据层，禁止使用 localStorage 保存队列或菜谱。
- 冲突策略固定为 MVP 级 Last Write Wins；不引入 CRDT、实时协作或复杂事件总线。
- 同步失败不能阻塞菜谱、购物清单和离线页面继续使用。
- 只修改 LF-4 所需文件，不重构已通过验收的菜谱编辑器和导入流程。
- 完成后执行相关测试、完整 TypeScript、Lint、Production Build、敏感信息扫描和 Preview 回归；不自动发布 Production。

---

### Task 1: 增加本地同步摘要与失败时间

**Files:**
- Modify: `src/features/offline/local-db.ts`
- Modify: `src/features/offline/types.ts`
- Modify: `src/features/offline/database.ts`
- Test: `src/features/offline/database.test.ts`
- Test: `src/features/offline/local-db.test.ts`

**Interfaces:**
- Produces `OfflineSyncSummary`: `{ pendingCount: number; failedCount: number; lastError: string | null; lastAttemptAt: string | null }`.
- Produces `getOfflineSyncSummary(userId: string): Promise<OfflineSyncSummary>`.
- Existing `listRecipeMutationQueue`、`listShoppingToggleQueue` and sync function signatures remain unchanged.

- [ ] **Step 1: Write the failing test**

在 `database.test.ts` 放入一条普通菜谱操作、一条带 `lastError` 的菜谱操作和一条带 `lastError` 的购物操作，断言 `getOfflineSyncSummary("user-a")` 返回 `pendingCount: 3`、`failedCount: 2`、最近错误和最近尝试时间；用另一个用户查询时返回全零。

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/database.test.ts
```

Expected: 因 `getOfflineSyncSummary` 尚未导出而失败。

- [ ] **Step 3: Write minimal implementation**

给 `LocalMutationRecord` 和 `OfflineShoppingToggle` 增加可选字段 `lastAttemptAt?: string`，不修改 Dexie stores。失败记录更新时写入当前 ISO 时间，并在 `database.ts` 添加：

```ts
export type OfflineSyncSummary = {
  pendingCount: number;
  failedCount: number;
  lastError: string | null;
  lastAttemptAt: string | null;
};

export async function getOfflineSyncSummary(userId: string): Promise<OfflineSyncSummary> {
  const [recipes, shopping] = await Promise.all([
    listRecipeMutationQueue(userId),
    listShoppingToggleQueue(userId),
  ]);
  const records = [...recipes, ...shopping];
  const failed = records.filter((record) => record.lastError);
  const lastAttemptAt = records
    .map((record) => record.lastAttemptAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  return {
    pendingCount: records.length,
    failedCount: failed.length,
    lastError: failed.at(-1)?.lastError ?? null,
    lastAttemptAt,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

运行同一条 Vitest 命令，预期 `database.test.ts`、`local-db.test.ts` 全部通过，且 IndexedDB 版本仍为 3。

- [ ] **Step 5: Commit**

```powershell
git add src/features/offline/local-db.ts src/features/offline/types.ts src/features/offline/database.ts src/features/offline/database.test.ts src/features/offline/local-db.test.ts
git commit -m "feat(sync): expose local sync summary"
```

### Task 2: 固化失败重试和 Last Write Wins 读取保护

**Files:**
- Modify: `src/features/offline/recipe-sync.ts`
- Modify: `src/features/offline/shopping-sync.ts`
- Modify: `src/features/offline/components/offline-recipe-cache.tsx`
- Test: `src/features/offline/recipe-sync.test.ts`
- Test: `src/features/offline/shopping-sync.test.ts`
- Test: `src/features/offline/components/offline-recipe-cache.test.tsx`

**Interfaces:**
- `syncRecipeMutationQueue(userId)` and `syncShoppingToggleQueue(userId)` remain the only queue submitters.
- Failed records remain queued with incremented `attemptCount`, `lastError`, and `lastAttemptAt`; a later `recipio:sync-requested` retries the same record.

- [ ] **Step 1: Write the failing test**

在两个同步测试中增加：第一次提交失败时记录保留、`attemptCount` 增加且 `lastAttemptAt` 存在；第二次调用成功时当前记录删除。为菜谱缓存增加云端 `updatedAt` 较旧不覆盖本地、云端较新可以覆盖的成对测试。

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/recipe-sync.test.ts src/features/offline/shopping-sync.test.ts src/features/offline/components/offline-recipe-cache.test.tsx
```

Expected: 新增的失败时间和 Last Write Wins 断言先失败。

- [ ] **Step 3: Write minimal implementation**

让两个 `mark*AttemptFailed` 函数在同一事务更新 `attemptCount`、`lastError`、`lastAttemptAt`；同步函数不删除失败记录，下一次显式或网络恢复触发时继续提交。保持现有队列按 `queuedAt` 顺序处理和 `syncPromises` 去重。菜谱缓存继续使用：存在本地快照且 `local.recipe.updatedAt > remote.updatedAt` 时跳过远端覆盖，否则写入远端快照。

- [ ] **Step 4: Run test to verify it passes**

运行 Task 2 的 Vitest 命令，预期全部通过，并确认没有新增数据库迁移文件。

- [ ] **Step 5: Commit**

```powershell
git add src/features/offline/recipe-sync.ts src/features/offline/shopping-sync.ts src/features/offline/components/offline-recipe-cache.tsx src/features/offline/recipe-sync.test.ts src/features/offline/shopping-sync.test.ts src/features/offline/components/offline-recipe-cache.test.tsx
git commit -m "fix(sync): preserve retryable local mutations"
```

### Task 3: 增加同步状态提示和手动重试入口

**Files:**
- Modify: `src/features/offline/components/offline-sync-runtime.tsx`
- Test: `src/features/offline/components/offline-sync-runtime.test.tsx`
- Optional Modify: `src/features/offline/hooks/use-online-status.ts` only if the existing hook cannot expose the current offline state without duplicate listeners.

**Interfaces:**
- `OfflineSyncRuntime` continues to accept `{ userId: string }`.
- The component listens to `online` and `recipio:sync-requested`, and exposes a button named `重试同步` only when pending operations remain after a failure.
- The button dispatches `new Event("recipio:sync-requested")`; it never calls Supabase directly.

- [ ] **Step 1: Write the failing test**

在 `offline-sync-runtime.test.tsx` 覆盖离线提示、同步失败提示与 `重试同步` 按钮、点击后重新触发两个同步队列、同步成功后隐藏重试按钮。测试继续 mock 两个队列函数，不访问真实 Supabase。

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/components/offline-sync-runtime.test.tsx
```

Expected: 新增文案和按钮断言失败。

- [ ] **Step 3: Write minimal implementation**

在 runtime 保留现有 `inFlightRef` 去重逻辑，增加 `isOnline`、`pendingCount`、`failedCount` 状态；同步完成后调用 `getOfflineSyncSummary(userId)` 更新摘要。失败时显示待同步数量和 `重试同步` 按钮，离线时显示本地保存提示；所有提示使用 `role="status"` 和 `aria-live="polite"`，不阻塞页面操作。

- [ ] **Step 4: Run test to verify it passes**

运行 Task 3 的 Vitest 命令，然后运行 `npm.cmd run typecheck`。

- [ ] **Step 5: Commit**

```powershell
git add src/features/offline/components/offline-sync-runtime.tsx src/features/offline/components/offline-sync-runtime.test.tsx src/features/offline/hooks/use-online-status.ts
git commit -m "feat(sync): add offline retry status"
```

### Task 4: 模块级验证、Preview 回归与推送

**Files:**
- No new application files; review all LF-4 files from Tasks 1–3.

- [ ] **Step 1: Run complete verification**

```powershell
npm.cmd test -- --pool=forks --maxWorkers=4 --file-parallelism
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: tests、typecheck、build exit code 0；Lint 只保留现有图片优化警告。

- [ ] **Step 2: Run sensitive-information scan**

```powershell
rg -n --hidden -g '!node_modules' -g '!.next' -g '!.git' -g '!docs/**' -g '!.env*' '(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|SUPABASE_SERVICE_ROLE_KEY=|DASHSCOPE_API_KEY=.+|QIANWEN_API_KEY=.+)' .
```

Expected: 不出现真实密钥。

- [ ] **Step 3: Push the feature branch and wait for Preview**

```powershell
git status --short
git push origin feat/recipe-app-shopping
npx.cmd vercel ls recipe-app-shopping --limit 5
$previewUrl = (npx.cmd vercel ls recipe-app-shopping --limit 5 | Select-String '^https://recipe-app-shopping-' | Select-Object -First 1).ToString().Trim()
npx.cmd vercel inspect $previewUrl --wait
```

Expected: 工作区干净、Preview 为 `Ready`，不发布 Production。

- [ ] **Step 4: Run read-only Preview regression**

检查 `/recipes`、`/recipes/new`、`/offline/app?path=%2Frecipes`；确认页面身份、非空内容、无框架错误、无控制台错误，并用搜索或导航完成一次不写入数据的交互。同步失败和重试按钮由自动化测试覆盖，不在真实账号中创建临时云端数据。

- [ ] **Step 5: Report and pause**

按模块格式汇报同步状态、重试、Last Write Wins、测试结果、Preview 地址、Git 提交和已知限制；等待用户统一验收后再进入 LF-5 PWA 深化。

## Self-review

- Spec coverage: 覆盖本地失败状态、网络恢复、手动重试、跨设备读取时的本地时间戳保护、用户可见同步状态；不引入付费服务、Cron、远程推送或新表。
- Placeholder scan: 每个步骤都有明确文件、接口、命令和预期结果；Preview URL 由执行时的 Vercel CLI 输出提供。
- Type consistency: `OfflineSyncSummary` 由 `database.ts` 产生并由 `OfflineSyncRuntime` 消费；现有同步函数、队列记录和 Server Actions 不改变签名。
