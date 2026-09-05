# LF-6 离线烹饪现场状态实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将谱序的烹饪步骤、提前准备勾选和计时器从 `localStorage` 迁移到 IndexedDB，使刷新、关闭页面和离线冷启动都能安全恢复烹饪现场。

**Architecture:** 保留 `CookingSessionV1`、现有烹饪 UI 和基于 `startedAt/endsAt` 的墙上时钟计时。新增专用 `cooking-session-repository.ts` 作为 Dexie 适配层，在线与离线烹饪共用；Hook 只负责会话状态和串行持久化。烹饪现场是设备本地状态，不进入 Supabase mutation queue。

**Tech Stack:** Next.js 15、React 19、TypeScript、Dexie/IndexedDB、Vitest、Testing Library；Supabase 与 Vercel 保持不变。

**Spec:** 用户确认的 `Local-first + Cloud Sync + PWA-ready` 要求；`docs/superpowers/specs/2026-08-27-module-5b-offline-data-sync-design.md`。

## 全局约束

- 不新增 Supabase 表、Migration、RLS、环境变量、服务商或付费服务。
- 完整烹饪会话不再写入 `localStorage`；旧键只用于一次性迁移，成功后删除。
- Dexie 表继续使用已有 `[userId+recipeId]` 主键，不提高 `RECIPIO_LOCAL_DB_VERSION = 3`。
- 会话按用户隔离；没有 `userId` 时只允许内存会话，不生成共享或匿名持久化键。
- `recipeUpdatedAt`、步骤 ID、计时器步骤 ID和准备项 ID都必须校验。
- IndexedDB 恢复完成前显示现有页面骨架，但暂时禁用会改变会话的按钮，防止异步旧值覆盖新点击。
- 写入按触发顺序串行执行；完成或重新开始不能被更早的延迟写入反向覆盖。
- 不做跨设备烹饪进度同步，不引入 BroadcastChannel、CRDT 或后台定时任务。

---

### Task 1：提取会话校验并建立专用 Dexie 仓库

**Files:**
- Create: `src/features/cooking/cooking-session-repository.ts`
- Create: `src/features/cooking/cooking-session-repository.test.ts`
- Modify: `src/features/cooking/session-storage.ts`
- Modify: `src/features/cooking/session-storage.test.ts`
- Reuse unchanged: `src/features/offline/local-db.ts`

**Interfaces:**

```ts
export function parseCookingSession(
  value: unknown,
  recipe: CookingSessionRecipe,
): CookingSessionV1 | null;

export function getCookingSession(
  userId: string,
  recipe: CookingSessionRecipe,
): Promise<CookingSessionV1 | null>;

export function putCookingSession(
  userId: string,
  session: CookingSessionV1,
): Promise<void>;

export function deleteCookingSession(
  userId: string,
  recipeId: string,
): Promise<void>;

export function migrateLegacyCookingSession(
  userId: string,
  recipe: CookingSessionRecipe,
  storage: Storage | null,
): Promise<CookingSessionV1 | null>;
```

- [ ] **Step 1: Write failing parser tests.** 在 `session-storage.test.ts` 用对象输入覆盖合法会话、菜谱版本变化、未知步骤、未知计时器步骤和已删除准备项；生产变更应是新增 `parseCookingSession`，测试必须先因导出不存在而失败。
- [ ] **Step 2: Verify RED.** 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/cooking/session-storage.test.ts`。
- [ ] **Step 3: Implement the parser.** 复用现有 Zod schema；`loadCookingSession(storage, recipe)` 只负责读取旧 JSON 后调用 `parseCookingSession`，不新增写入行为。
- [ ] **Step 4: Verify GREEN.** 重跑 Step 2 命令。
- [ ] **Step 5: Write failing repository tests.** 使用 `fake-indexeddb/auto` 覆盖同用户读写、不同用户隔离、不兼容记录自动删除、删除会话、旧 localStorage 成功迁移后删除键、Dexie 写失败时保留旧键。
- [ ] **Step 6: Verify repository RED.** 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/cooking/cooking-session-repository.test.ts`，确认因新模块不存在而失败。
- [ ] **Step 7: Implement the repository.** 直接调用 `getLocalDatabase().cookingSessions`；记录形状固定为 `{ userId, recipeId, updatedAt: new Date(session.updatedAt).toISOString(), payload: session }`。读取时调用 `parseCookingSession`；不合法则删除当前复合键并返回 `null`。迁移顺序固定为“读取旧键 → 校验 → 写 Dexie → 删除旧键”。
- [ ] **Step 8: Verify GREEN and regression.** 同时运行 repository 与 session-storage 两个测试文件。
- [ ] **Step 9: Commit.** 提交信息：`feat(cooking): add indexeddb session repository`。

### Task 2：让烹饪 Hook 使用异步、串行的本地持久化

**Files:**
- Modify: `src/features/cooking/hooks/use-cooking-session.ts`
- Modify: `src/features/cooking/hooks/use-cooking-session.test.tsx`

**Interfaces:**

```ts
type UseCookingSessionOptions = {
  recipe: RecipeDetail;
  requestedServings: number;
  restart: boolean;
  userId: string | null;
};

type CookingSessionController = {
  // existing fields remain
  ready: boolean;
};
```

- [ ] **Step 1: Write failing hook tests.** 覆盖 Dexie 恢复当前步骤/份数/准备项/多计时器；`endsAt` 已过时显示完成；`restart` 不恢复旧会话；无 `userId` 或 IndexedDB 失败时仍可内存烹饪；恢复未完成前 `ready=false`；快速连续两次导航最终持久化最后一步；完成操作最终删除会话且不会被旧排队写入复活。
- [ ] **Step 2: Verify RED.** 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/cooking/hooks/use-cooking-session.test.tsx`。
- [ ] **Step 3: Implement initialization barrier.** 初始状态仍由 `createCookingSession(recipe, requestedServings, 0)` 提供，保证 SSR 稳定；effect 依次处理 restart、Dexie 读取、旧键迁移和新会话创建。用 generation/cancel 标记忽略旧 recipe 或卸载后的异步结果，完成后才设置 `ready=true`。
- [ ] **Step 4: Implement ordered persistence.** 使用 `writeChainRef.current = writeChainRef.current.then(operation, operation)` 串行执行 put/delete；只有 `ready` 且有 `userId` 时写入。`complete()` 和 `restart()` 通过同一队列执行删除，禁止普通 persistence effect 随后写回旧会话。
- [ ] **Step 5: Keep failure non-blocking.** 仓库失败设置 `storageAvailable=false`，但保留内存状态、步骤导航和页面计时；不调用 Supabase、Server Action 或同步队列。
- [ ] **Step 6: Verify GREEN.** 重跑 Hook 测试，并运行 `src/features/cooking/timers.test.ts`。
- [ ] **Step 7: Commit.** 提交信息：`feat(cooking): persist sessions with indexeddb`。

### Task 3：贯通在线详情、烹饪界面和离线壳的用户身份

**Files:**
- Modify: `src/features/recipes/components/recipe-detail-local-first-page.tsx`
- Modify: `src/features/recipes/components/recipe-local-first.test.tsx`
- Modify: `src/features/recipes/components/recipe-detail.tsx`
- Modify: `src/features/recipes/components/recipe-detail.test.tsx`
- Modify: `src/features/cooking/components/cooking-entry.tsx`
- Modify: `src/features/cooking/components/cooking-entry.test.tsx`
- Modify: `src/features/cooking/components/cooking-screen.tsx`
- Modify: `src/features/cooking/components/cooking-screen.test.tsx`
- Modify: `src/features/offline/components/offline-app.tsx`
- Modify: `src/features/offline/components/offline-app.test.tsx`

**Interfaces:**

```ts
RecipeDetailView({ recipe, cookingHistory, userId })
CookingEntry({ recipe, userId })
CookingScreen({ recipe, requestedServings, restart, userId, mealPlanEntryId })
```

`userId` 在应用页面与离线壳中均为明确字符串；仅测试或独立预览可传 `null`。

- [ ] **Step 1: Write failing identity-flow tests.** 断言 `RecipeDetailLocalFirstPage` 将 action 返回的 `userId` 传给 `RecipeDetailView`；详情将其传给 `CookingEntry`；入口从 Dexie 异步显示“继续上次烹饪”；离线壳把最后认证用户传给 `CookingScreen`；不同用户看不到彼此会话。
- [ ] **Step 2: Verify RED.** 运行 recipe detail、CookingEntry、CookingScreen、OfflineApp 对应测试文件。
- [ ] **Step 3: Implement prop flow.** 在线链路固定为 `loadRecipeDetailAction → RecipeDetailLocalFirstPage → RecipeDetailView → CookingEntry`；cook 页面继续使用已有 `user.id`；`CookingScreen` 必须把 `userId` 传给 Hook；离线 cooking 分支传 `data.profile.userId`。
- [ ] **Step 4: Add the brief restore state.** `ready=false` 时显示 `正在恢复本机烹饪进度…`，并禁用上一步、下一步、开始计时、准备确认和完成按钮；恢复后不保留 loading。存储不可用只显示现有非阻塞提示。
- [ ] **Step 5: Preserve existing behavior.** 图片清洗、Wake Lock、通知权限、烹饪复盘、历史记录、meal plan 关联和份数缩放均不改变。
- [ ] **Step 6: Verify GREEN.** 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/recipes/components/recipe-local-first.test.tsx src/features/recipes/components/recipe-detail.test.tsx src/features/cooking/components/cooking-entry.test.tsx src/features/cooking/components/cooking-screen.test.tsx src/features/offline/components/offline-app.test.tsx`。
- [ ] **Step 7: Commit.** 提交信息：`feat(offline): restore cooking progress by user`。

### Task 4：更新验收文档并完成工程验证

**Files:**
- Modify: `docs/testing/module-3-guided-cooking-acceptance.md`
- Review: all LF-6 files from Tasks 1–3

- [ ] **Step 1: Update documentation.** 将“Local Storage 键”改为“IndexedDB `recipio-local-v2.cookingSessions`，按用户和菜谱隔离”；记录旧键自动迁移、设备本地边界和通知限制。
- [ ] **Step 2: Run focused regression.** 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/cooking src/features/offline src/features/recipes/components/recipe-detail.test.tsx`。
- [ ] **Step 3: Run full verification.** 依次运行完整 Vitest、`npm.cmd run typecheck`、`npm.cmd run lint`、`npm.cmd run build` 和 `git diff --check`；Lint 不新增错误，只允许既有图片 warning。
- [ ] **Step 4: Check scope and secrets.** 对比基线 `4fc8d2f`；只允许计划、cooking、必要的 recipe detail/offline wiring 与测试文档变化。扫描 `.env`、API Key、Supabase service role、Token、密码和私钥，发现真实值立即停止提交。
- [ ] **Step 5: Commit and push.** 文档提交使用 `docs(cooking): update offline session acceptance`；推送当前 `feat/recipe-app-shopping`，不创建 PR、不合并 main。

### Task 5：Preview 回归验收并暂停

- [ ] **Step 1: Wait for Preview Ready.** 获取当前分支最新 Vercel Preview 并确认构建为 Ready，不发布 Production。
- [ ] **Step 2: Online recovery scenario.** 登录后打开一份已缓存且至少有两步、一个准备项和一个计时器的菜谱；进入烹饪，切到第 2 步、勾选准备并开始计时；刷新后确认步骤、准备状态和正确剩余时间恢复。
- [ ] **Step 3: Offline recovery scenario.** 从选定菜谱的离线详情点击“开始烹饪”，关闭后再打开浏览器刚生成的 `/offline/app?path=...%2Fcook` 地址；确认无需 Supabase 请求即可继续步骤和计时，图片不可用不阻塞文字内容。
- [ ] **Step 4: Reset and completion scenarios.** “重新开始”清除当前用户/菜谱现场；完成烹饪后本机会话消失，复盘和烹饪历史仍按原逻辑工作。
- [ ] **Step 5: Resilience and layout.** 拒绝通知权限、模拟 IndexedDB 失败、390px 手机宽度与桌面宽度；确认按钮仍可用、无横向溢出、控制台无新错误。
- [ ] **Step 6: Report and pause.** 按模块完成报告列出文件、无数据库/API/config 变化、测试计数、Git 提交、Preview URL、已知边界；等待用户验收，Production 需另行确认。

## 已知边界

- 烹饪现场只保存在当前浏览器设备，不跨设备同步。
- 页面关闭后系统通知是否准时出现取决于浏览器/PWA 能力；重新打开后计时结果按 `endsAt` 正确恢复。
- 离线 cooking 要求菜谱内容此前已写入本地快照。
- 图片离线编辑、AI/导入、周计划与营养分析不属于 LF-6。

## 自检

- **需求覆盖：** 当前步骤、份数、准备项、多计时器、刷新/关闭恢复、用户隔离、离线路由均有测试与验收场景。
- **竞争条件：** 明确了恢复屏障、异步结果取消和串行写入，避免旧状态覆盖新操作或完成后会话复活。
- **结构边界：** 专用 repository 隔离 Dexie 细节；通用 `offline/database.ts` 与 Supabase 同步层不需要改动。
- **迁移边界：** 旧 localStorage 只读一次；Dexie 写成功前不删除旧数据。
- **发布边界：** 仅推送功能分支和验证 Preview，Production 单独授权。
