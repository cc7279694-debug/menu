# LF-6 离线烹饪现场状态实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让谱序的烹饪模式把当前步骤、提前准备勾选和计时器可靠保存在 IndexedDB，刷新、关闭页面或断网后仍能从原位置继续。

**Architecture:** 保留现有 `CookingSessionV1`、墙上时钟计时和烹饪 UI；把持久化从 `localStorage` 迁移到已存在的 Dexie `cookingSessions` 表。在线和 `/offline/app?path=.../cook` 共用同一个本地会话仓库。烹饪进度属于当前设备的本地现场状态，不进入 Supabase 同步队列。

**Tech Stack:** Next.js 15、React 19、TypeScript、Dexie/IndexedDB、Vitest、Testing Library；Supabase/Vercel 不变。

**Spec:** 用户确认的 `Local-first + Cloud Sync + PWA-ready` 要求，重点落实“烹饪模式断网可继续、当前步骤不丢、计时器不因刷新停止、提前准备状态本地保存”。

## 全局约束

- 不新增 Supabase 表、Migration、RLS、环境变量、第三方同步服务或付费服务。
- 烹饪会话唯一持久化层是 IndexedDB/Dexie；不得继续把完整会话写入 `localStorage`。
- 旧版 `localStorage` 会话只允许一次性兼容读取，成功迁移后删除，不再写回。
- 会话按 `userId + recipeId` 隔离；没有 `userId` 时只使用内存会话。
- 继续校验 `recipeUpdatedAt`；菜谱版本变化后不恢复不兼容会话。
- 计时器仍由 `startedAt/endsAt` 计算剩余时间；不依赖后台轮询持续运行。
- 本模块不把当前步骤、计时器加入云端同步，不设计多设备实时共享。

---

### Task 1：建立 Dexie 烹饪会话仓库

**Files:** `src/features/offline/local-db.ts`、`types.ts`、`database.ts`、`database.test.ts`

**Interfaces:** `LocalCookingSessionRecord.payload` 使用 `CookingSessionV1`；新增 `getCookingSession(userId, recipe)`、`putCookingSession(userId, session)`、`deleteCookingSession(userId, recipeId)`，只读写现有 `cookingSessions` 表。

- [ ] 写失败测试：同用户同菜谱保存/读取、不同用户隔离、菜谱版本变化返回 null、删除、损坏 payload 清理。
- [ ] 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/database.test.ts`，确认因函数不存在而失败。
- [ ] 用现有 `safe()` 和 compound key `[userId, recipe.id]` 实现；复用会话 schema 校验；数据库版本保持 3。
- [ ] 重跑测试确认通过。
- [ ] 提交 `feat(offline): add cooking session repository`。

### Task 2：将烹饪 Hook 从 localStorage 迁移到 IndexedDB

**Files:** `src/features/cooking/session-storage.ts`、`hooks/use-cooking-session.ts` 及其测试、`components/cooking-entry.tsx` 及其测试、`components/cooking-screen.tsx` 及其测试

**Interfaces:** `CookingScreen` 和 `useCookingSession` 接收 `userId`；没有 `userId` 时保持内存模式。`session-storage.ts` 保留纯创建/解析/版本校验函数，持久化改由 `offline/database.ts` 提供。

- [ ] 用 `fake-indexeddb` 写失败测试：Dexie 恢复步骤和计时器、刷新后按 `endsAt` 重算、重启/完成删除当前用户会话、旧 localStorage 键只迁移一次、存储失败仍可导航。
- [ ] 运行三个 cooking 测试文件，确认当前同步 localStorage 实现先失败。
- [ ] 首屏继续用空会话避免水合差异；挂载后按 `restart` 删除或异步读取 Dexie；无记录时校验并迁移旧键；初始化后每次变更 `putCookingSession`；完成/重启 `deleteCookingSession`；所有异步 effect 捕获错误。
- [ ] 重跑 cooking 测试，确认导航、提前准备、计时、通知、水合和无障碍行为均通过。
- [ ] 提交 `feat(cooking): persist sessions in indexeddb`。

### Task 3：接入离线烹饪壳

**Files:** `src/features/offline/components/offline-app.tsx`、对应测试；仅在文案需要时修改 `src/features/pwa/components/pwa-runtime.tsx` 及测试。

**Interfaces:** 保留现有 cooking `OfflineTarget`；离线加载的 `data.profile.userId` 传入 `CookingScreen`；只读缓存菜谱和本机会话，不发网络请求。

- [ ] 写失败 shell 测试：预置菜谱快照和 Dexie 会话后，离线 cooking 恢复步骤、计时器和离线状态；另一用户不可见。
- [ ] 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/components/offline-app.test.tsx`，确认当前未传 userId 时失败。
- [ ] 在离线 cooking 分支传 `userId={data.profile.userId}`；保持图片清洗行为；文案只说明状态保存在本机，不声称云同步。
- [ ] 运行 `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline src/features/pwa`。
- [ ] 提交 `feat(offline): resume cooking sessions`。

### Task 4：完整验证、Preview 回归并暂停

- [ ] 运行完整测试、`npm.cmd run typecheck`、`npm.cmd run lint`、`npm.cmd run build`、`git diff --check`；Lint 不新增错误，只保留既有图片 warning。
- [ ] 检查 `git status`、相对 `52cff0c` 的文件范围和敏感信息扫描；只允许 LF-6 文件变化。
- [ ] `git push origin feat/recipe-app-shopping`，等待最新 Preview Ready；不发布 Production。
- [ ] Preview 验收：在线进入已缓存菜谱 cooking，移动到第 2 步、启动计时、勾选准备；刷新/第二标签页恢复；`/offline/app?.../cook` 断网可继续；重启只清当前用户/菜谱；完成清理会话且历史流程不变；390px/桌面无溢出、控制台无新错误。
- [ ] 按模块格式汇报文件、测试、Preview 地址和数据库/API/config（none），等待用户验收。

## 已知边界

烹饪会话是设备本地状态，不做跨设备同步；浏览器通知拒绝不影响页面计时；离线 cooking 仍要求菜谱此前已缓存；图片离线变更、AI/导入、周计划和营养分析不在本模块。

## 自检

已覆盖当前步骤、提前准备、计时器、刷新/关闭恢复、离线路由和用户隔离；`cookingSessions` 已在 Dexie 版本 3 中，不新增迁移；每个行为先写失败测试再实现；Preview 通过后暂停，Production 单独确认。
