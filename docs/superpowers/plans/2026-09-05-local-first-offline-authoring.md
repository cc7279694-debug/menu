# LF-5 Offline Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让已使用过谱序 RECIPIO 的用户在断网冷启动后，仍能新建和编辑纯文字/结构化菜谱，并把变更安全保存在 IndexedDB、排队等待 Supabase 同步。

**Architecture:** Service Worker 将 `/recipes/new` 和 `/recipes/:id/edit` 的离线导航转到现有公开 `/offline/app`；离线壳从 Dexie 读取最后认证用户、菜谱快照、草稿和媒体引用，再复用现有 `RecipeEditor` 的受限离线模式。保存只调用本地写入与 mutation queue，绝不在本地存储失败时回退到网络请求；恢复联网后继续复用 LF-4 同步器。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, React Hook Form, Dexie/IndexedDB, Service Worker, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-27-module-5b-offline-data-sync-design.md`、用户确认的 `Local-first + Cloud Sync + PWA-ready` 改造要求，以及 `docs/superpowers/plans/2026-09-05-local-first-sync-hardening.md`。

## Global Constraints

- 保持 Next.js 15、React、TypeScript、Tailwind CSS、shadcn/ui、Supabase、PostgreSQL、Supabase Auth 和 Vercel。
- IndexedDB/Dexie 继续作为本地结构化数据层；不得使用 localStorage 保存菜谱、草稿、媒体或同步队列。
- 本模块不新增 Supabase 表、Migration、RLS、环境变量、第三方同步服务或付费服务。
- 离线可编辑：标题、简介、份数、准备/烹饪时间、已有分类和标签、备注、每份营养手填值、食材、提前准备、步骤、火候和计时。
- 离线不可用：AI 营养分析、来源导入、新建分类、新建标签、新增/替换/删除图片；界面必须说明原因。
- 离线编辑不得丢失已有云端图片路径；图片内容继续由本地媒体缓存只读展示，变更图片必须联网。
- 本地保存失败时不得偷偷调用 Server Action 或 Supabase；应保留当前表单并显示明确错误。
- 冲突策略继续采用 LF-4 的 MVP Last Write Wins，不引入 CRDT、实时协作或复杂版本树。
- Cache Storage 仍只保存公开 App Shell；私人菜谱、草稿、API、RSC 和 Supabase 响应不得进入 Service Worker 缓存。
- Preview 验收通过后暂停；Production 发布需要单独确认。

---

### Task 1: Preserve Media References for Safe Offline Editing

**Files:**
- Modify: `src/features/offline/local-db.ts`
- Modify: `src/features/offline/media-cache.ts`
- Modify: `src/features/offline/media-cache.test.ts`
- Modify: `src/features/offline/components/offline-cached-media.tsx`
- Modify: `src/features/offline/components/offline-cached-media.test.tsx`
- Modify: `src/features/offline/components/offline-recipe-cache.tsx`
- Modify: `src/features/offline/components/offline-recipe-cache.test.tsx`

**Interfaces:**
- Produces: `LocalRecipeMediaRecord.blob: Blob | null`.
- Produces: `rememberRecipeMediaReference(input: Omit<RecipeMediaCacheInput, "url">): Promise<void>`.
- Produces: `listRecipeMedia(userId: string, recipeId: string): Promise<LocalRecipeMediaRecord[]>`.
- Existing `getRecipeMedia(...)` signature remains unchanged.

- [ ] **Step 1: Write the failing media-reference tests**

Add tests proving that the storage path is recorded before a network image fetch, a failed fetch leaves a metadata-only record, a successful fetch replaces it with a Blob, and `OfflineCachedMedia` keeps its placeholder when `blob` is `null`.

```ts
await rememberRecipeMediaReference({
  userId: "user-a",
  recipeId: "recipe-a",
  mediaId: "cover",
  sourceKey: "user-a/recipe-a/cover.webp",
});

expect(await getRecipeMedia("user-a", "recipe-a", "cover")).toMatchObject({
  sourceKey: "user-a/recipe-a/cover.webp",
  blob: null,
});
expect(await listRecipeMedia("user-a", "recipe-a")).toHaveLength(1);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/media-cache.test.ts src/features/offline/components/offline-cached-media.test.tsx src/features/offline/components/offline-recipe-cache.test.tsx
```

Expected: FAIL because media references cannot yet exist without a Blob and the new functions are not exported.

- [ ] **Step 3: Implement metadata-first media caching**

Change the record contract without changing Dexie keys or indexes:

```ts
export type LocalRecipeMediaRecord = {
  userId: string;
  recipeId: string;
  mediaId: string;
  sourceKey: string;
  mimeType: string | null;
  byteSize: number;
  cachedAt: string;
  blob: Blob | null;
};
```

`rememberRecipeMediaReference` writes a `blob: null` record only when no matching Blob record already exists. `cacheRecipeMediaFromUrl` calls it before `fetch`; a successful response overwrites the record with the downloaded Blob. `OfflineRecipeCache` records every non-null `coverPath`/`imagePath` before starting background fetches. `OfflineCachedMedia` calls `URL.createObjectURL` only when `media.blob` is a Blob.

No Dexie version bump is required because the object-store key path and indexes do not change.

- [ ] **Step 4: Run the targeted tests**

Run the Step 2 command again.

Expected: all targeted tests PASS; a 404 image leaves `sourceKey` available but renders the accessible placeholder.

- [ ] **Step 5: Commit**

```powershell
git add src/features/offline/local-db.ts src/features/offline/media-cache.ts src/features/offline/media-cache.test.ts src/features/offline/components/offline-cached-media.tsx src/features/offline/components/offline-cached-media.test.tsx src/features/offline/components/offline-recipe-cache.tsx src/features/offline/components/offline-recipe-cache.test.tsx
git commit -m "fix(offline): preserve recipe media references"
```

### Task 2: Add an Explicit Offline Capability Mode to RecipeEditor

**Files:**
- Modify: `src/features/recipes/components/recipe-editor.tsx`
- Modify: `src/features/recipes/components/recipe-editor-local-first.test.tsx`
- Modify: `src/features/recipes/components/recipe-nutrition.tsx`
- Modify: `src/features/recipes/components/recipe-nutrition.test.tsx`

**Interfaces:**
- Produces: `RecipeEditorProps.availability?: "online" | "offline"`, defaulting to `"online"`.
- In `offline` availability, save consumes `saveRecipeLocally(...)` only.
- `RecipeNutritionEditor` produces `analysisDisabledReason?: string` and disables only AI analysis; manual nutrient fields remain editable.

- [ ] **Step 1: Write failing capability tests**

Cover these exact behaviors:

```tsx
<RecipeEditor
  availability="offline"
  categories={cachedCategories}
  initialValue={input}
  localFirstUserId={userId}
  mode="edit"
  onSaved={onSaved}
  tags={cachedTags}
  userId={userId}
/>
```

- A banner says: `当前离线，文字内容会先保存在本机，联网后自动同步。`.
- Existing category/tag options remain selectable.
- New category, new tag, image picker and AI analysis controls are unavailable and explain that they require networking.
- Clicking `保存菜谱` calls `saveRecipeLocally` and never calls `saveRecipeAction`, `createCategoryAction`, `createTagAction`, media upload or AI analysis.
- When `saveRecipeLocally` rejects, the form stays visible and shows `本机保存失败，请检查浏览器存储空间后重试`; it must not fall back to `saveRecipeAction`.

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/recipes/components/recipe-editor-local-first.test.tsx src/features/recipes/components/recipe-nutrition.test.tsx
```

Expected: FAIL because `availability` and `analysisDisabledReason` are not implemented.

- [ ] **Step 3: Implement the capability boundary**

Add the prop with an online default:

```ts
type RecipeEditorProps = {
  availability?: "online" | "offline";
  // existing props remain unchanged
};
```

In offline mode:

- submit the parsed form directly through `saveRecipeLocally`;
- report IndexedDB failure and return without executing the existing network path;
- replace category/tag creation inputs with a short networking notice;
- replace each `ImagePicker` with `图片保持不变，联网后可添加、替换或删除`;
- pass `analysisDisabledReason="AI 营养分析需要联网；现有营养数据仍可手动修改。"`;
- preserve all existing online behavior and imported-draft confirmation logic.

`RecipeNutritionEditor` disables its AI button when `analysisDisabledReason` is present and displays that reason with `role="status"`; nutrient inputs and the “AI 参考值” checkbox remain enabled.

- [ ] **Step 4: Run targeted tests and typecheck**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/recipes/components/recipe-editor-local-first.test.tsx src/features/recipes/components/recipe-nutrition.test.tsx
npm.cmd run typecheck
```

Expected: tests and typecheck PASS; existing online editor tests remain unchanged.

- [ ] **Step 5: Commit**

```powershell
git add src/features/recipes/components/recipe-editor.tsx src/features/recipes/components/recipe-editor-local-first.test.tsx src/features/recipes/components/recipe-nutrition.tsx src/features/recipes/components/recipe-nutrition.test.tsx
git commit -m "feat(offline): add restricted recipe editor mode"
```

### Task 3: Build Offline New and Edit Targets

**Files:**
- Create: `src/features/offline/offline-recipe-editor-data.ts`
- Create: `src/features/offline/offline-recipe-editor-data.test.ts`
- Create: `src/features/offline/components/offline-recipe-editor.tsx`
- Create: `src/features/offline/components/offline-recipe-editor.test.tsx`
- Modify: `src/features/offline/components/offline-app.tsx`
- Modify: `src/features/offline/components/offline-app.test.tsx`
- Modify: `src/features/offline/media-cache.ts`
- Modify: `src/features/offline/database.ts`

**Interfaces:**
- Produces: `buildOfflineTaxonomy(snapshots): { categories: TaxonomyOption[]; tags: TaxonomyOption[] }`.
- Produces: `buildOfflineEditInput(snapshot, media): RecipeSaveInput`.
- Produces: `OfflineRecipeEditor({ userId, mode, snapshots, snapshot, media })`.
- Extends `OfflineTarget` with `{ kind: "recipe-create" }` and `{ kind: "recipe-edit"; recipeId: string }`.

- [ ] **Step 1: Write failing pure-data tests**

Use two cached recipes sharing a tag and assert deduplication by ID. Assert media paths are restored from `mediaId: "cover"` and `mediaId: "step:<stepId>"` while signed URLs remain absent.

```ts
const input = buildOfflineEditInput(snapshot, [
  { ...coverMedia, mediaId: "cover", sourceKey: "user/recipe/cover.webp" },
  { ...stepMedia, mediaId: `step:${stepId}`, sourceKey: "user/recipe/step.webp" },
]);

expect(input.coverPath).toBe("user/recipe/cover.webp");
expect(input.steps[0]?.imagePath).toBe("user/recipe/step.webp");
```

- [ ] **Step 2: Write failing route/component tests**

Add these parsing assertions before the generic recipe-detail match:

```ts
expect(parseOfflineTarget("/recipes/new")).toEqual({ kind: "recipe-create" });
expect(parseOfflineTarget("/recipes/recipe-a/edit")).toEqual({
  kind: "recipe-edit",
  recipeId: "recipe-a",
});
```

Component tests must prove:

- create mode uses the last offline profile and can restore the latest local draft;
- edit mode reads the requested snapshot and media references;
- a missing snapshot shows `这道菜还没有保存到本机，暂时无法离线编辑`;
- successful local save navigates to `/offline/app?path=/recipes/<id>`;
- no Supabase/Auth function runs from the public offline shell.

- [ ] **Step 3: Run tests to verify they fail**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline/offline-recipe-editor-data.test.ts src/features/offline/components/offline-recipe-editor.test.tsx src/features/offline/components/offline-app.test.tsx
```

Expected: FAIL because the new targets and components do not exist.

- [ ] **Step 4: Implement offline editor data helpers**

`buildOfflineTaxonomy` collects non-null categories and all tags from cached recipe snapshots, deduplicates by ID, and sorts names with `localeCompare("zh-CN")`.

`buildOfflineEditInput` starts with `recipeDetailToSaveInput(snapshot.recipe)`, then restores storage paths from metadata records. It never creates image URLs and never stores signed URLs in a draft.

Add `listRecipeMedia(userId, recipeId)` to `media-cache.ts`; do not access Dexie tables directly from React components.

- [ ] **Step 5: Implement OfflineRecipeEditor and route handling**

`OfflineRecipeEditor` passes `availability="offline"`, `localFirstUserId={userId}` and cached taxonomy to the existing editor. For edit mode it requires a snapshot; for create mode it lets the existing editor generate a UUID and restore `getLatestRecipeDraft(userId)`.

On save:

```ts
const path = `/recipes/${encodeURIComponent(recipeId)}`;
window.location.assign(`/offline/app?path=${encodeURIComponent(path)}`);
```

Update `OfflineApp` target parsing in this order: `/recipes/new`, `/recipes/:id/edit`, `/recipes`, `/shopping`, detail/cook. Load media references only for edit mode. Keep `/recipes/import`, settings, plan and unknown routes unsupported offline.

- [ ] **Step 6: Run targeted tests**

Run the Step 3 command again.

Expected: all targeted tests PASS and the offline shell contains no server auth or Supabase calls.

- [ ] **Step 7: Commit**

```powershell
git add src/features/offline/offline-recipe-editor-data.ts src/features/offline/offline-recipe-editor-data.test.ts src/features/offline/components/offline-recipe-editor.tsx src/features/offline/components/offline-recipe-editor.test.tsx src/features/offline/components/offline-app.tsx src/features/offline/components/offline-app.test.tsx src/features/offline/media-cache.ts src/features/offline/database.ts
git commit -m "feat(offline): support recipe authoring cold starts"
```

### Task 4: Extend the PWA Navigation Contract and Correct Offline Copy

**Files:**
- Modify: `src/features/pwa/service-worker-source.ts`
- Modify: `src/features/pwa/service-worker-source.test.ts`
- Modify: `src/features/pwa/components/pwa-runtime.tsx`
- Modify: `src/features/pwa/components/pwa-runtime.test.tsx`

**Interfaces:**
- `OFFLINE_PRIVATE_ROUTE_PATTERNS` additionally recognizes `/recipes/new` and `/recipes/:id/edit`.
- The cache namespace becomes `recipio-public-shell`; activation cleans both current older versions and legacy `food-sequence-public-shell-*` caches.
- Manifest identity, `start_url`, scope and icons remain unchanged.

- [ ] **Step 1: Write failing Service Worker and copy tests**

Assert the generated source contains explicit new/edit patterns, uses `recipio-public-shell-<version>`, and includes legacy-prefix cleanup. Assert the runtime message is:

```text
当前离线。菜谱文字、烹饪进度和购物勾选会保存在本机，联网后自动同步；图片和 AI 功能需要联网。
```

Both update and offline messages must use `role="status"` and `aria-live="polite"`.

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/pwa/service-worker-source.test.ts src/features/pwa/components/pwa-runtime.test.tsx
```

Expected: FAIL on the new route patterns, cache prefix and updated capability copy.

- [ ] **Step 3: Implement the navigation and cache update**

- Add exact regexes for `/recipes/new` and `/recipes/:id/edit` to the generated worker.
- Rename only the Cache Storage namespace to `recipio-public-shell`.
- Embed `LEGACY_CACHE_PREFIXES = ["food-sequence-public-shell"]`; activation deletes legacy caches plus non-current RECIPIO versions, then claims clients.
- Keep the strict public allowlist and user-confirmed `SKIP_WAITING` flow unchanged.
- Update the offline banner to match the features that now work locally.
- Do not add a Manifest `id`: changing identity after users have installed the app can create duplicate-install behavior.

- [ ] **Step 4: Run targeted tests**

Run the Step 2 command again.

Expected: all targeted tests PASS; generated source still contains no `/api/`, Supabase URL or runtime `cache.put(request)`.

- [ ] **Step 5: Commit**

```powershell
git add src/features/pwa/service-worker-source.ts src/features/pwa/service-worker-source.test.ts src/features/pwa/components/pwa-runtime.tsx src/features/pwa/components/pwa-runtime.test.tsx
git commit -m "feat(pwa): route offline recipe authoring"
```

### Task 5: Full Verification, Push, and Preview Acceptance

**Files:**
- No new application files; review all LF-5 changes from Tasks 1–4.

**Interfaces:**
- Consumes the offline editor, media-reference metadata, mutation queue and PWA route contract.
- Produces Preview evidence only; Production remains unchanged.

- [ ] **Step 1: Run the focused offline regression suite**

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism src/features/offline src/features/pwa src/features/recipes/components/recipe-editor-local-first.test.tsx src/features/recipes/components/recipe-nutrition.test.tsx
```

Expected: all offline/PWA/editor files PASS.

- [ ] **Step 2: Run complete engineering verification**

```powershell
npm.cmd test -- --pool=forks --maxWorkers=4 --file-parallelism
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: tests, typecheck and build exit 0; lint has no errors and adds no warning beyond the existing image-performance warnings.

- [ ] **Step 3: Check scope and sensitive information**

```powershell
git status --short
git diff --stat d642a25...HEAD
git diff --name-only d642a25...HEAD
rg -n --hidden -g '!node_modules' -g '!.next' -g '!.git' -g '!docs/**' -g '!.env*' '(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|SUPABASE_SERVICE_ROLE_KEY=|DASHSCOPE_API_KEY=.+|QIANWEN_API_KEY=.+)' .
```

Expected: only LF-5 plan, offline, PWA and shared editor files changed; no secret values are found.

- [ ] **Step 4: Push the feature branch and wait for Preview**

```powershell
git push origin feat/recipe-app-shopping
$lf5Deployments = npx.cmd vercel ls recipe-app-shopping --limit 5
$lf5PreviewUrl = ($lf5Deployments | Select-String '^https://recipe-app-shopping-' | Select-Object -First 1).ToString().Trim()
npx.cmd vercel inspect $lf5PreviewUrl --wait
```

Expected: the latest branch Preview is `Ready`; do not promote it to Production.

- [ ] **Step 5: Run authenticated online-to-offline acceptance**

Using the Preview and one disposable test recipe:

1. Online: sign in, open the recipe, confirm its details and image have been cached.
2. Offline: close and reopen the installed PWA at `/recipes/new`; create a text-only recipe and save it.
3. Offline: reopen that recipe at `/recipes/:id/edit`, change title, ingredients, steps, heat and timer, then save again.
4. Offline: edit a previously cached recipe with an existing cover/step image; confirm the UI says images are unchanged and the queued payload preserves their storage paths.
5. Offline: confirm AI analysis, image changes, new categories and new tags are unavailable with clear explanations.
6. Online again: confirm automatic sync completes, the created/edited recipes appear on normal pages, and the existing images remain attached.
7. Simulate one failed sync; confirm the queue remains and “重试同步” succeeds later.
8. At 390px and desktop width, confirm the sticky save action, form fields and notices do not overflow.
9. Inspect Cache Storage: no private page, API, RSC, Supabase response or recipe content is cached; only the versioned public shell exists.
10. Check browser console for new errors and unhandled Promise rejections.

- [ ] **Step 6: Report and pause**

Report exact commits, changed files, test counts, lint warnings, build result, Preview URL and browser evidence. State that database/API/environment changes are `none`. Pause for module acceptance and separate Production authorization.

## Risks and Deliberate Limits

- Local media references preserve existing cloud images, but offline users cannot add, replace or delete images in this module.
- A browser profile is not encrypted storage; logout and “清除离线数据” continue to remove private IndexedDB content.
- Only cached categories/tags are selectable offline. Creating taxonomy records requires authenticated cloud writes and stays online-only.
- AI and source import remain online because they require external services.
- Installed users may briefly keep the old public shell until they accept the waiting Service Worker update; their IndexedDB business data is unaffected.
- Offline routes outside list/detail/cook/new/edit/shopping remain unsupported and fall back to the generic offline message.

## Self-review

- **Spec coverage:** Covers cold-start create/edit, optimistic local save, queued sync, offline limitations, media-path preservation, network recovery, private-cache exclusion and mobile acceptance.
- **Intentional gaps:** Offline media mutation, offline taxonomy creation, AI, import, plans and nutrition analysis are explicitly deferred because they require cloud services or a separate media-upload queue.
- **Placeholder scan:** Preview URL extraction is fully specified by the PowerShell commands; no implementation behavior is left unspecified.
- **Type consistency:** `LocalRecipeMediaRecord`, `RecipeEditorProps.availability`, `buildOfflineEditInput`, `OfflineRecipeEditor` and the two new `OfflineTarget` variants are defined before downstream use.
