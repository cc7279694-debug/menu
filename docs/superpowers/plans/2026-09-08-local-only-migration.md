# Local-only RECIPIO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first RECIPIO runtime without breaking the current Supabase/Vercel rollback path.

**Architecture:** Shared domain and application services call Repository interfaces. Dexie/IndexedDB is the first local adapter; Capacitor SQLite and filesystem are added after the browser vertical slice is stable. Existing Supabase actions remain behind the legacy path until the local slice passes acceptance.

**Tech Stack:** Next.js 15 during transition, React 19, TypeScript, Zod, Dexie 4, IndexedDB, later Vite/Capacitor/SQLite.

**Spec:** `docs/superpowers/specs/2026-09-08-local-only-architecture.md`

## Global Constraints

- 本阶段不删除 Supabase、Auth、Vercel 或现有 Server Actions。
- 不迁移现有云端数据；新本地数据库可以从空数据开始。
- 本地业务记录使用 UUID 和 ISO 时间戳。
- 图片原图与缩略图由本地媒体索引管理；不设置人为文件大小上限。
- AI 失败不能阻塞本地菜谱读写；Qwen 3.8 Flash 是默认模型。
- 每个任务都必须先写失败测试，再实现最小代码，再运行相关验证。

### Task 1: Local repository contracts and Dexie recipe store

**Files:**
- Create: `src/features/local-data/types.ts`
- Create: `src/features/local-data/recipe-repository.ts`
- Create: `src/features/local-data/dexie-recipe-repository.ts`
- Test: `src/features/local-data/dexie-recipe-repository.test.ts`
- Modify: `src/features/offline/local-db.ts`

**Interfaces:**
- `RecipeRepository.list(options?: { includeDeleted?: boolean }): Promise<LocalRecipeRecord[]>`
- `RecipeRepository.get(id: string): Promise<LocalRecipeRecord | null>`
- `RecipeRepository.save(input: LocalRecipeWriteInput): Promise<LocalRecipeRecord>`
- `RecipeRepository.moveToTrash(id: string): Promise<void>`
- `RecipeRepository.restore(id: string): Promise<void>`
- `RecipeRepository.permanentlyDelete(id: string): Promise<void>`

- [ ] Write tests proving create/read survives a new repository instance, soft delete hides records by default, and UUID/timestamps are generated locally.
- [ ] Run `npm.cmd test -- src/features/local-data/dexie-recipe-repository.test.ts` and observe the expected missing-module failure.
- [ ] Add the typed local record and repository interfaces.
- [ ] Add a versioned Dexie store for local recipes and implement the adapter with `fake-indexeddb` compatibility.
- [ ] Re-run the focused test, then run `npm.cmd run typecheck`.
- [ ] Commit with `feat(local): add dexie recipe repository`.

### Task 2: Local recipe vertical slice

**Files:**
- Create/modify only the recipe local-first components and their tests after Task 1 review.

- [ ] Add local list/detail/edit wiring behind a feature boundary.
- [ ] Keep the legacy Supabase path available as an explicit fallback.
- [ ] Verify refresh, offline navigation, trash/restore, empty, loading and error states.

### Task 3: Local media index

**Files:**
- Extend the local-data media boundary and add browser storage tests.

- [ ] Store original image metadata and thumbnail references locally.
- [ ] Ensure failed image loading never blocks recipe text.

### Task 4: Local plan, shopping, cooking and history repositories

- [ ] Migrate one feature at a time using the same repository contract and contract tests.
- [ ] Preserve timers, checked ingredients and cooking progress across refresh/restart.

### Task 5: Vite/Capacitor runtime and SQLite adapter

- [ ] Add a parallel Vite entry using the shared React/domain modules.
- [ ] Add Capacitor SQLite and native filesystem adapters after the browser adapter is accepted.

### Task 6: AI, backup, PWA and cloud-runtime retirement

- [ ] Add local import jobs, Qwen direct-call boundary, basic nutrition follow-up and clear offline errors.
- [ ] Add versioned ZIP backup/restore with pre-restore backup.
- [ ] Replace Next runtime-only PWA behavior with static service-worker caching.
- [ ] Remove Auth/Supabase runtime only after Android and PWA acceptance.
