# Module 5B Offline Data and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让食序 ORDINE 在完全断网冷启动后仍可读取最近 10 道菜谱和当前购物清单，并将离线购物勾选在恢复网络后安全同步。

**Architecture:** 使用公开、版本化的 Next.js 离线壳承载冷启动 UI，仅在 Cache Storage 中保存该壳及其精确构建资源；私人菜谱快照、购物清单快照和幂等勾选队列存入按用户隔离的 IndexedDB。在线页面异步写快照，Service Worker 只负责路由和公开资源，客户端同步器通过现有 Supabase 鉴权 Server Actions 提交目标状态并以服务器快照收口。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、Supabase Auth/PostgreSQL、Service Worker、IndexedDB、`idb`、Vitest、Testing Library、`fake-indexeddb`。

**Spec:** `docs/superpowers/specs/2026-08-27-module-5b-offline-data-sync-design.md`

## Global Constraints

- 不缓存登录后页面、RSC、API、Supabase 响应或任何用户私人网络响应。
- 最近菜谱最多 10 条，只保存结构化文本；首版不保存封面或步骤图片 Blob、签名 URL、Storage 路径。
- 购物清单离线只允许改变 `isChecked`；其他编辑操作保持联网限定。
- 相同 `[userId, listId, itemId]` 只保留最后目标状态；删除队列项前必须核对 `clientMutationId`，避免覆盖同步期间产生的新操作。
- 服务器始终重新验证用户、活动清单和条目所有权；IndexedDB 中的 `userId` 不构成授权。
- 不新增数据库 migration、RPC、表、索引或策略；若现有约束不足，停止实现并重新提交数据库设计。
- Service Worker 新版本保持 waiting，只有用户确认后才 `SKIP_WAITING`，接管后只刷新一次。
- 保持现有业务逻辑、移动端可访问性和性能优化，不做无关重构。
- 每项实现使用 TypeScript；新增运行时依赖仅限小型 `idb`，测试依赖仅限 `fake-indexeddb`。
- 使用 Windows 命令时调用 `npm.cmd`；不提交 `.env`、密钥、Token 或密码。

---

## File Map

### 新增文件

- `src/features/offline/types.ts`：离线快照、队列、同步结果的唯一类型定义。
- `src/features/offline/recipe-snapshot.ts`：从在线 `RecipeDetail` 生成无图片私人快照。
- `src/features/offline/database.ts`：IndexedDB schema、事务、用户隔离、容量淘汰和清理。
- `src/features/offline/database.test.ts`：真实 IndexedDB 行为测试，使用 `fake-indexeddb`。
- `src/features/offline/recipe-snapshot.test.ts`：菜谱字段裁剪和图片清除测试。
- `src/features/offline/hooks/use-online-status.ts`：稳定的在线/离线状态订阅。
- `src/features/offline/components/offline-recipe-cache.tsx`：在线菜谱页面的非阻塞快照写入。
- `src/features/offline/components/offline-recipe-cache.test.tsx`：快照写入边界测试。
- `src/features/offline/shopping-sync.ts`：队列同步、条件删除和服务器快照收口。
- `src/features/offline/shopping-sync.test.ts`：同步成功、失败、覆盖和失效清单测试。
- `src/features/offline/components/offline-sync-runtime.tsx`：认证页面的联网恢复同步与状态反馈。
- `src/features/offline/components/offline-sync-runtime.test.tsx`：重复触发合并和提示测试。
- `src/features/offline/components/offline-app.tsx`：公开离线壳路由分发和本机用户加载。
- `src/features/offline/components/offline-recipe-list.tsx`：最近离线菜谱列表。
- `src/features/offline/components/offline-recipe-detail.tsx`：只读菜谱详情。
- `src/features/offline/components/offline-shopping-list.tsx`：可离线勾选的当前购物清单。
- `src/features/offline/components/offline-app.test.tsx`：离线路由、空状态与禁用边界测试。
- `src/app/offline/app/page.tsx`：公开离线壳入口。
- `src/features/offline/components/offline-settings-controls.tsx`：清除离线数据和安全退出。
- `src/features/offline/components/offline-settings-controls.test.tsx`：先清本地再退出测试。

### 修改文件

- `package.json`、`package-lock.json`：加入 `idb` 和 `fake-indexeddb`。
- `src/app/(app)/recipes/[recipeId]/page.tsx`：传入服务器确认的 `userId` 并写菜谱快照。
- `src/app/(app)/recipes/[recipeId]/cook/page.tsx`：直接进入烹饪页时也写菜谱快照。
- `src/app/(app)/shopping/page.tsx`：把服务器确认的 `userId` 传给购物页面。
- `src/features/shopping/components/shopping-page.tsx`：写清单快照，离线时原子排队勾选。
- `src/features/shopping/components/shopping-list-view.tsx`：离线时只开放 Checkbox。
- `src/features/shopping/components/shopping-item-row.tsx`：禁用离线编辑、删除和排序控件。
- `src/features/shopping/components/shopping-generator.tsx`：离线时禁用重新生成。
- `src/features/shopping/types.ts`：增加同步 Action 的机器可读错误代码和确认结果类型。
- `src/features/shopping/actions.ts`：勾选返回服务器确认值，新增同步后读取活动清单 Action。
- `src/features/shopping/actions.test.ts`：验证确认值、认证和失效清单结果。
- `src/components/app-shell.tsx`：接收 `userId` 并挂载同步运行时。
- `src/app/(app)/layout.tsx`：向 AppShell 传入服务器验证用户 ID。
- `src/features/pwa/service-worker-source.ts`：公开离线壳精确预缓存和受支持路径冷启动跳转。
- `src/features/pwa/service-worker-source.test.ts`：验证缓存白名单、版本隔离和导航分支。
- `src/features/auth/route-access.ts`：公开放行 `/offline/app`。
- `src/features/auth/route-access.test.ts`：验证离线壳不触发登录重定向。
- `src/app/(app)/settings/page.tsx`：替换为离线数据管理控件。

---

### Task 1: IndexedDB 基础设施与菜谱快照类型

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/offline/types.ts`
- Create: `src/features/offline/recipe-snapshot.ts`
- Create: `src/features/offline/recipe-snapshot.test.ts`
- Create: `src/features/offline/database.ts`
- Create: `src/features/offline/database.test.ts`

**Interfaces:**
- Consumes: `RecipeDetail`、`ShoppingActiveList`。
- Produces: `OfflineRecipeSnapshot`、`OfflineShoppingSnapshot`、`OfflineShoppingToggle`、`toOfflineRecipeSnapshot()`、`rememberOfflineProfile()`、`getLastOfflineProfile()`、`putRecipeSnapshot()`、`listRecipeSnapshots()`、`getRecipeSnapshot()`、`putShoppingSnapshot()`、`getShoppingSnapshot()`、`queueShoppingToggle()`、`listShoppingToggleQueue()`、`markShoppingToggleAttemptFailed()`、`deleteShoppingToggleIfCurrent()`、`clearOfflineData()`。

- [ ] **Step 1: 安装两个小型依赖**

Run:

```powershell
npm.cmd install idb
npm.cmd install --save-dev fake-indexeddb
```

Expected: `package.json` 只新增 `idb` 和 `fake-indexeddb`，锁文件正常更新，没有技术栈升级。

- [ ] **Step 2: 先写菜谱裁剪失败测试**

在 `recipe-snapshot.test.ts` 构造包含 `coverUrl`、`coverPath`、步骤 `imageUrl` 和 `imagePath` 的完整菜谱，要求：

```ts
const snapshot = toOfflineRecipeSnapshot(USER_ID, recipe, NOW);

expect(snapshot.userId).toBe(USER_ID);
expect(snapshot.recipe.coverUrl).toBeNull();
expect(snapshot.recipe.coverPath).toBeNull();
expect(snapshot.recipe.steps[0]).toMatchObject({ imageUrl: null, imagePath: null });
expect(snapshot.dataVersion).toBe(1);
```

- [ ] **Step 3: 运行菜谱裁剪测试并确认失败**

Run: `npm.cmd test -- src/features/offline/recipe-snapshot.test.ts`

Expected: FAIL，原因是模块或 `toOfflineRecipeSnapshot` 尚不存在。

- [ ] **Step 4: 定义离线类型并实现最小菜谱裁剪**

在 `types.ts` 定义：

```ts
export type OfflineProfile = {
  userId: string;
  lastAuthenticatedAt: string;
};

export type OfflineRecipeDetail = Omit<RecipeDetail, "coverUrl" | "coverPath" | "steps"> & {
  coverUrl: null;
  coverPath: null;
  steps: Array<Omit<RecipeDetail["steps"][number], "imageUrl" | "imagePath"> & {
    imageUrl: null;
    imagePath: null;
  }>;
};

export type OfflineRecipeSnapshot = {
  userId: string;
  recipeId: string;
  cachedAt: string;
  lastOpenedAt: string;
  dataVersion: 1;
  recipe: OfflineRecipeDetail;
};

export type OfflineShoppingSnapshot = {
  userId: string;
  listId: string;
  cachedAt: string;
  serverUpdatedAt: string;
  dataVersion: 1;
  list: ShoppingActiveList;
};

export type OfflineShoppingToggle = {
  userId: string;
  listId: string;
  itemId: string;
  targetChecked: boolean;
  clientMutationId: string;
  queuedAt: string;
  attemptCount: number;
  lastError: string | null;
};
```

`toOfflineRecipeSnapshot()` 必须显式把所有图片 URL/路径置为 `null`，其余数组创建新对象，不能修改服务端传入值。

- [ ] **Step 5: 运行菜谱裁剪测试并确认通过**

Run: `npm.cmd test -- src/features/offline/recipe-snapshot.test.ts`

Expected: PASS。

- [ ] **Step 6: 先写 IndexedDB 行为失败测试**

在测试顶部导入 `fake-indexeddb/auto`，每个用例后调用 `clearOfflineData()`。覆盖：

```ts
await rememberOfflineProfile(USER_A, NOW);
expect(await getLastOfflineProfile()).toMatchObject({ userId: USER_A });

for (const recipe of elevenRecipeSnapshots) await putRecipeSnapshot(recipe);
expect(await listRecipeSnapshots(USER_A)).toHaveLength(10);
expect((await listRecipeSnapshots(USER_A))[0].lastOpenedAt)
  .toBe(lateTimestamp);

await putShoppingSnapshot(snapshotForUserA);
expect(await getShoppingSnapshot(USER_B)).toBeNull();
```

再验证 `queueShoppingToggle()` 在一个事务中同时修改快照条目和队列，第二次相同键写入只保留最后 `targetChecked`。

写入一个 `dataVersion: 2` 的不兼容记录，要求读取函数删除该记录并返回 `null` 或不在列表中；模拟 IndexedDB 打开失败时，公开函数必须返回稳定错误且不得输出快照内容。

- [ ] **Step 7: 运行数据库测试并确认失败**

Run: `npm.cmd test -- src/features/offline/database.test.ts`

Expected: FAIL，原因是数据库函数尚未实现。

- [ ] **Step 8: 实现 IndexedDB schema 和事务**

使用 `idb` 的 `DBSchema` 定义四个 object stores：

```ts
interface OrdineOfflineSchema extends DBSchema {
  profiles: { key: string; value: OfflineProfile };
  recipes: {
    key: [string, string];
    value: OfflineRecipeSnapshot;
    indexes: { "by-user-last-opened": [string, string] };
  };
  shoppingSnapshots: { key: string; value: OfflineShoppingSnapshot };
  shoppingToggleQueue: {
    key: [string, string, string];
    value: OfflineShoppingToggle;
    indexes: { "by-user-queued-at": [string, string] };
  };
}
```

`queueShoppingToggle()` 在同一 `readwrite` 事务中读取购物快照、更新目标条目并覆盖复合键队列；找不到匹配快照或条目时抛出稳定错误。`markShoppingToggleAttemptFailed()` 只更新匹配 `clientMutationId` 的 `attemptCount` 和 `lastError`；`deleteShoppingToggleIfCurrent()` 只有数据库当前记录的 `clientMutationId` 与已提交记录一致时才删除。所有读取函数检查 `dataVersion === 1`，发现不兼容记录时在事务内删除并返回空结果。

数据库模块导出签名固定为：

```ts
export function rememberOfflineProfile(userId: string, authenticatedAt: string): Promise<void>;
export function getLastOfflineProfile(): Promise<OfflineProfile | null>;
export function putRecipeSnapshot(snapshot: OfflineRecipeSnapshot): Promise<void>;
export function listRecipeSnapshots(userId: string): Promise<OfflineRecipeSnapshot[]>;
export function getRecipeSnapshot(userId: string, recipeId: string): Promise<OfflineRecipeSnapshot | null>;
export function putShoppingSnapshot(snapshot: OfflineShoppingSnapshot): Promise<void>;
export function getShoppingSnapshot(userId: string): Promise<OfflineShoppingSnapshot | null>;
export function queueShoppingToggle(input: {
  userId: string;
  listId: string;
  itemId: string;
  targetChecked: boolean;
}): Promise<OfflineShoppingToggle>;
export function listShoppingToggleQueue(userId: string): Promise<OfflineShoppingToggle[]>;
export function markShoppingToggleAttemptFailed(
  record: OfflineShoppingToggle,
  message: string,
): Promise<void>;
export function deleteShoppingToggleIfCurrent(record: OfflineShoppingToggle): Promise<boolean>;
export function clearOfflineData(): Promise<void>;
```

- [ ] **Step 9: 运行 Task 1 测试和类型检查**

Run:

```powershell
npm.cmd test -- src/features/offline/recipe-snapshot.test.ts src/features/offline/database.test.ts
npm.cmd run typecheck
```

Expected: 两个测试文件全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 10: 提交 Task 1**

```powershell
git add package.json package-lock.json src/features/offline/types.ts src/features/offline/recipe-snapshot.ts src/features/offline/recipe-snapshot.test.ts src/features/offline/database.ts src/features/offline/database.test.ts
git commit -m "feat(offline): add private snapshot storage"
```

---

### Task 2: 在线菜谱快照写入

**Files:**
- Create: `src/features/offline/components/offline-recipe-cache.tsx`
- Create: `src/features/offline/components/offline-recipe-cache.test.tsx`
- Modify: `src/app/(app)/recipes/[recipeId]/page.tsx`
- Modify: `src/app/(app)/recipes/[recipeId]/cook/page.tsx`

**Interfaces:**
- Consumes: `toOfflineRecipeSnapshot(userId, recipe, now)`、`rememberOfflineProfile()`、`putRecipeSnapshot()`、`getServerAuthContext()`。
- Produces: `<OfflineRecipeCache userId: string recipe: RecipeDetail />`。

- [ ] **Step 1: 先写组件失败测试**

Mock 数据库函数，渲染：

```tsx
render(<OfflineRecipeCache recipe={recipe} userId={USER_ID} />);

await waitFor(() => {
  expect(rememberOfflineProfile).toHaveBeenCalledWith(USER_ID, expect.any(String));
  expect(putRecipeSnapshot).toHaveBeenCalledWith(
    expect.objectContaining({ userId: USER_ID, recipeId: recipe.id }),
  );
});
```

加入数据库拒绝写入的用例，要求组件不抛错、不替换页面内容，并通过 `onCacheError` 测试回调报告一次失败。

- [ ] **Step 2: 运行组件测试并确认失败**

Run: `npm.cmd test -- src/features/offline/components/offline-recipe-cache.test.tsx`

Expected: FAIL，组件尚不存在。

- [ ] **Step 3: 实现非阻塞快照组件**

组件返回 `null`，在 `useEffect` 中创建同一个 ISO 时间值，依次记录用户和菜谱快照：

```ts
void rememberOfflineProfile(userId, now)
  .then(() => putRecipeSnapshot(toOfflineRecipeSnapshot(userId, recipe, now)))
  .catch(() => onCacheError?.());
```

Effect 依赖只包含 `userId`、`recipe` 和回调，不在 render 阶段访问 IndexedDB。

- [ ] **Step 4: 在详情页和直接烹饪入口挂载快照**

两个 Server Component 使用缓存过的 `getServerAuthContext()` 取得服务器验证用户。菜谱存在且用户存在时渲染：

```tsx
<>
  <OfflineRecipeCache recipe={recipe} userId={user.id} />
  <RecipeDetailView recipe={recipe} />
</>
```

烹饪页使用相同方式在 `CookingScreen` 前挂载；不得从查询参数、Cookie 字符串或客户端输入取得 `userId`。

- [ ] **Step 5: 运行相关测试和类型检查**

Run:

```powershell
npm.cmd test -- src/features/offline/components/offline-recipe-cache.test.tsx src/features/recipes/components/recipe-detail.test.tsx src/features/cooking/components/cooking-screen.test.tsx
npm.cmd run typecheck
```

Expected: 全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 6: 提交 Task 2**

```powershell
git add src/features/offline/components/offline-recipe-cache.tsx src/features/offline/components/offline-recipe-cache.test.tsx 'src/app/(app)/recipes/[recipeId]/page.tsx' 'src/app/(app)/recipes/[recipeId]/cook/page.tsx'
git commit -m "feat(offline): cache recently opened recipes"
```

---

### Task 3: 购物清单快照与离线勾选

**Files:**
- Create: `src/features/offline/hooks/use-online-status.ts`
- Modify: `src/app/(app)/shopping/page.tsx`
- Modify: `src/features/shopping/components/shopping-page.tsx`
- Modify: `src/features/shopping/components/shopping-page.test.tsx`
- Modify: `src/features/shopping/components/shopping-list-view.tsx`
- Modify: `src/features/shopping/components/shopping-item-row.tsx`
- Modify: `src/features/shopping/components/shopping-generator.tsx`

**Interfaces:**
- Consumes: `rememberOfflineProfile()`、`putShoppingSnapshot()`、`queueShoppingToggle()`。
- Produces: `useOnlineStatus(): boolean`、`<ShoppingPage userId: string ...>`，以及 `offline`/`disabled` 展示属性。

- [ ] **Step 1: 先写离线购物失败测试**

扩展 `shopping-page.test.tsx`：把 `navigator.onLine` 设为 `false`，渲染带 `userId` 和当前清单的页面，点击 Checkbox 后要求：

```ts
expect(queueShoppingToggle).toHaveBeenCalledWith({
  userId: USER_ID,
  listId: LIST_ID,
  itemId: ITEM_ID,
  targetChecked: true,
});
expect(setShoppingItemCheckedAction).not.toHaveBeenCalled();
expect(screen.getByRole("checkbox", { name: /标记为未完成/ })).toBeChecked();
```

同时断言添加、编辑、删除、排序、清理和重新生成不可用，Checkbox 仍可用，页面显示“联网后可用”。

- [ ] **Step 2: 运行购物组件测试并确认失败**

Run: `npm.cmd test -- src/features/shopping/components/shopping-page.test.tsx`

Expected: FAIL，因为页面尚无 `userId`、离线分支或队列调用。

- [ ] **Step 3: 实现稳定联网状态 Hook**

`useOnlineStatus()` 初始值从 `navigator.onLine` 读取，并只注册一组 `online`/`offline` 监听器；服务端渲染初始值为 `true`。测试环境通过事件触发状态变化，不能轮询。

- [ ] **Step 4: 把服务器验证用户传给购物页面**

`src/app/(app)/shopping/page.tsx` 在现有并行查询中加入 `getServerAuthContext()`，确认 `user` 后传入：

```tsx
<ShoppingPage
  currentList={currentList}
  initialRecipes={initialRecipes}
  userId={user.id}
/>
```

- [ ] **Step 5: 写快照并实现离线勾选分支**

`ShoppingPage` 在 `currentList` 变化后异步调用 `rememberOfflineProfile()` 与 `putShoppingSnapshot()`。离线 `handleToggle` 必须先调用 `queueShoppingToggle()`；成功后更新 React 状态，失败则保留原 UI 并显示“离线操作保存失败，请重试”。在线分支保留现有 Server Action 语义，不因本任务改变其他编辑流程。

- [ ] **Step 6: 只保留 Checkbox 的离线可操作性**

向 `ShoppingListView`、`ShoppingItemRow` 和 `ShoppingGenerator` 传递明确布尔属性。离线时：

```tsx
<Checkbox disabled={togglePending} ... />
<Button disabled={offline || reorderPending} ...>上移</Button>
<Button disabled={offline} ...>编辑</Button>
<Button disabled={offline} ...>删除</Button>
```

页面级“添加食材”“清理已完成”和生成按钮同样禁用，并提供可读说明；不得仅通过颜色表达禁用原因。

- [ ] **Step 7: 运行购物与离线数据库回归测试**

Run:

```powershell
npm.cmd test -- src/features/shopping/components/shopping-page.test.tsx src/features/offline/database.test.ts src/features/shopping/actions.test.ts
npm.cmd run typecheck
```

Expected: 全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 8: 提交 Task 3**

```powershell
git add 'src/app/(app)/shopping/page.tsx' src/features/offline/hooks/use-online-status.ts src/features/shopping/components/shopping-page.tsx src/features/shopping/components/shopping-page.test.tsx src/features/shopping/components/shopping-list-view.tsx src/features/shopping/components/shopping-item-row.tsx src/features/shopping/components/shopping-generator.tsx
git commit -m "feat(offline): queue shopping toggles offline"
```

---

### Task 4: 服务器确认结果与恢复同步

**Files:**
- Modify: `src/features/shopping/types.ts`
- Modify: `src/features/shopping/actions.ts`
- Modify: `src/features/shopping/actions.test.ts`
- Create: `src/features/offline/shopping-sync.ts`
- Create: `src/features/offline/shopping-sync.test.ts`
- Create: `src/features/offline/components/offline-sync-runtime.tsx`
- Create: `src/features/offline/components/offline-sync-runtime.test.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: IndexedDB 队列函数、`setShoppingItemCheckedAction()`、`getActiveShoppingList()`。
- Produces: `ShoppingSyncActionResult<T>`、`ShoppingToggleConfirmation`、`getActiveShoppingListForSyncAction()`、`syncShoppingToggleQueue()`、`<OfflineSyncRuntime userId: string />`。

- [ ] **Step 1: 先写 Server Action 失败测试**

更新成功查询 mock，让 `.select()` 返回 `id, is_checked, updated_at`，断言：

```ts
await expect(setShoppingItemCheckedAction(input)).resolves.toEqual({
  ok: true,
  data: {
    itemId: ITEM_ID,
    isChecked: true,
    updatedAt: "2026-08-27T08:00:00.000Z",
  },
});
```

为 `getActiveShoppingListForSyncAction()` 增加已登录成功、未登录稳定错误和查询失败稳定错误测试。勾选与刷新 Action 的失败分支必须携带机器可读 `code`，同步器不能靠中文消息判断认证或失效状态。

- [ ] **Step 2: 运行 Action 测试并确认失败**

Run: `npm.cmd test -- src/features/shopping/actions.test.ts`

Expected: FAIL，现有勾选 Action 仍返回 `null`，刷新 Action 尚不存在。

- [ ] **Step 3: 实现服务器确认接口**

在 `src/features/shopping/types.ts` 增加并由两个同步相关 Action 使用：

```ts
export type ShoppingSyncErrorCode =
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "STALE_TARGET"
  | "REQUEST_FAILED";

export type ShoppingSyncActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ShoppingSyncErrorCode; message: string };
```

定义：

```ts
export type ShoppingToggleConfirmation = {
  itemId: string;
  isChecked: boolean;
  updatedAt: string;
};

export async function setShoppingItemCheckedAction(
  input: unknown,
): Promise<ShoppingSyncActionResult<ShoppingToggleConfirmation>>;

export async function getActiveShoppingListForSyncAction():
  Promise<ShoppingSyncActionResult<ShoppingActiveList | null>>;
```

勾选更新仍按 `user_id + shopping_list_id + id` 限定并验证活动清单，只把 select 改为 `id, is_checked, updated_at`。刷新 Action 调用现有受鉴权查询，捕获异常并返回稳定中文错误和代码；不接受客户端 `userId`。现有购物页只读取 `ok`、`data`、`message`，因此保持在线交互语义不变。

- [ ] **Step 4: 先写同步器失败测试**

使用依赖注入的 `submitToggle` 和 `fetchActiveList`，覆盖：

```ts
const result = await syncShoppingToggleQueue(USER_ID, dependencies);
expect(result).toEqual({ status: "synced", syncedCount: 2, remainingCount: 0 });
```

还要验证：

- 网络异常增加 `attemptCount` 并保留记录。
- 业务错误保留记录，除非刷新确认清单或条目已失效。
- 同步 A 时同键写入 B，A 成功不能删除 B。
- 刷新服务器快照后，把仍在队列中的目标状态覆盖回本地展示快照。
- 同一进程同时调用两次时复用同一个 in-flight Promise，不重复提交。

- [ ] **Step 5: 运行同步器测试并确认失败**

Run: `npm.cmd test -- src/features/offline/shopping-sync.test.ts`

Expected: FAIL，同步器尚不存在。

- [ ] **Step 6: 实现顺序同步与条件删除**

导出：

```ts
export type ShoppingSyncResult =
  | { status: "idle"; syncedCount: 0; remainingCount: 0 }
  | { status: "synced"; syncedCount: number; remainingCount: number }
  | { status: "auth-required" | "failed"; syncedCount: number; remainingCount: number; message: string };

export type ShoppingSyncDependencies = {
  listQueue: typeof listShoppingToggleQueue;
  submitToggle: typeof setShoppingItemCheckedAction;
  fetchActiveList: typeof getActiveShoppingListForSyncAction;
  saveSnapshot: typeof putShoppingSnapshot;
  markFailed: typeof markShoppingToggleAttemptFailed;
  deleteIfCurrent: typeof deleteShoppingToggleIfCurrent;
};

export function syncShoppingToggleQueue(
  userId: string,
  dependencies?: ShoppingSyncDependencies,
): Promise<ShoppingSyncResult>;
```

按 `queuedAt` 顺序提交，每次成功调用 `deleteShoppingToggleIfCurrent(record)`。完成或遇到确认失效状态后读取服务器活动清单；保存前重新读取剩余队列，把剩余 `targetChecked` 覆盖到服务器快照对应条目，避免新操作被旧响应回滚。

- [ ] **Step 7: 先写同步运行时失败测试**

渲染 `<OfflineSyncRuntime userId={USER_ID} />`，触发两次 `online`，要求同步函数只调用一次；分别断言“正在同步”“2 项已同步”“同步失败，操作已保留”和“请重新登录”使用 `role="status"` 或 `aria-live="polite"`。

- [ ] **Step 8: 实现同步运行时并挂到认证壳**

`AuthenticatedLayout` 把 `user.id` 传入 `AppShell`，`AppShell` 在导航外挂载：

```tsx
<OfflineSyncRuntime userId={userId} />
```

运行时在首次挂载且在线时检查队列，并监听 `online`；状态反馈为非阻塞固定提示，不使用无限动画，不修改现有 `PwaRuntime` 的 Worker 更新职责。

- [ ] **Step 9: 运行 Task 4 测试和类型检查**

Run:

```powershell
npm.cmd test -- src/features/shopping/actions.test.ts src/features/offline/shopping-sync.test.ts src/features/offline/components/offline-sync-runtime.test.tsx src/lib/supabase/server-auth.test.ts
npm.cmd run typecheck
```

Expected: 全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 10: 提交 Task 4**

```powershell
git add src/features/shopping/types.ts src/features/shopping/actions.ts src/features/shopping/actions.test.ts src/features/offline/shopping-sync.ts src/features/offline/shopping-sync.test.ts src/features/offline/components/offline-sync-runtime.tsx src/features/offline/components/offline-sync-runtime.test.tsx src/components/app-shell.tsx 'src/app/(app)/layout.tsx'
git commit -m "feat(offline): sync queued shopping states"
```

---

### Task 5: 公开离线应用壳与私人快照界面

**Files:**
- Create: `src/app/offline/app/page.tsx`
- Create: `src/features/offline/components/offline-app.tsx`
- Create: `src/features/offline/components/offline-recipe-list.tsx`
- Create: `src/features/offline/components/offline-recipe-detail.tsx`
- Create: `src/features/offline/components/offline-shopping-list.tsx`
- Create: `src/features/offline/components/offline-app.test.tsx`
- Modify: `src/features/auth/route-access.ts`
- Modify: `src/features/auth/route-access.test.ts`

**Interfaces:**
- Consumes: `getLastOfflineProfile()`、菜谱/购物快照读取函数、`queueShoppingToggle()`、`CookingScreen`。
- Produces: 公开 `/offline/app?path=<original-path>` 页面和四类离线视图。

- [ ] **Step 1: 先写公开路由失败测试**

在 `route-access.test.ts` 断言：

```ts
expect(isPwaPublicResource("/offline/app")).toBe(true);
expect(isPwaPublicResource("/offline/app/anything")).toBe(false);
```

确认普通 `/recipes`、`/shopping` 仍不是公开资源。

- [ ] **Step 2: 先写离线壳失败测试**

Mock IndexedDB 查询并覆盖：

- `path=/recipes` 按 `lastOpenedAt` 显示最近菜谱。
- `path=/recipes/<id>` 显示只读详情且没有编辑、收藏或服务器按钮。
- `path=%2Frecipes%2F<id>%2Fcook%3Fservings%3D4` 渲染 `CookingScreen` 并使用离线菜谱。
- `path=/shopping` 显示当前清单，Checkbox 调用 `queueShoppingToggle()`。
- 无 profile、无快照、未知路径分别显示明确空状态。
- IndexedDB 不可用时显示“此设备暂时无法使用离线数据”，页面不崩溃。
- 恢复在线时显示“返回在线页面”，链接只允许解析后的站内受支持路径，不能接受 `//evil.example` 或完整外部 URL。

- [ ] **Step 3: 运行离线壳测试并确认失败**

Run:

```powershell
npm.cmd test -- src/features/auth/route-access.test.ts src/features/offline/components/offline-app.test.tsx
```

Expected: FAIL，公开路径和离线组件尚未实现。

- [ ] **Step 4: 实现安全目标路径解析**

只接受以下正则语义：

```ts
type OfflineTarget =
  | { kind: "recipe-list" }
  | { kind: "recipe-detail"; recipeId: string }
  | { kind: "cooking"; recipeId: string; servings: number | null; restart: boolean }
  | { kind: "shopping" }
  | { kind: "unsupported" };

export function parseOfflineTarget(rawPath: string): OfflineTarget;
```

解析时使用 `new URL(path, window.location.origin)`，要求 `url.origin === window.location.origin`，并只映射白名单路径；未知或外部输入返回 `unsupported`。

- [ ] **Step 5: 实现离线视图**

- `OfflineRecipeList` 从快照派生卡片，不渲染网络图片。
- `OfflineRecipeDetail` 展示标题、份数、时间、食材、步骤和备注，图片位置使用固定比例占位。
- cooking 分支复用 `CookingScreen`，传入图片字段已为 `null` 的 `OfflineRecipeDetail`。
- `OfflineShoppingList` 只渲染 Checkbox 和只读信息；勾选成功后更新本地状态，显示“待同步”。
- 所有其他动作显示“联网后可用”，触控目标至少 44px，状态提示使用 `aria-live`。

- [ ] **Step 6: 创建公开页面并放行中间件**

`src/app/offline/app/page.tsx` 只返回 `<OfflineApp />`，不得调用 Supabase、读取 Cookie 或接收服务器用户数据。`isPwaPublicResource()` 精确放行 `/offline/app`。

- [ ] **Step 7: 运行离线壳、烹饪和路由测试**

Run:

```powershell
npm.cmd test -- src/features/offline/components/offline-app.test.tsx src/features/auth/route-access.test.ts src/features/cooking/components/cooking-screen.test.tsx src/features/cooking/hooks/use-cooking-session.test.tsx
npm.cmd run typecheck
```

Expected: 全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 8: 提交 Task 5**

```powershell
git add src/app/offline/app/page.tsx src/features/offline/components/offline-app.tsx src/features/offline/components/offline-recipe-list.tsx src/features/offline/components/offline-recipe-detail.tsx src/features/offline/components/offline-shopping-list.tsx src/features/offline/components/offline-app.test.tsx src/features/auth/route-access.ts src/features/auth/route-access.test.ts
git commit -m "feat(offline): add cold-start offline shell"
```

---

### Task 6: Service Worker 精确壳缓存与冷启动导航

**Files:**
- Modify: `src/features/pwa/service-worker-source.ts`
- Modify: `src/features/pwa/service-worker-source.test.ts`
- Modify: `src/app/sw.js/route.test.ts`

**Interfaces:**
- Consumes: `/offline/app` 公开 HTML、现有部署版本缓存名、现有 `SKIP_WAITING` 协议。
- Produces: `OFFLINE_APP_PATH`、`OFFLINE_PRIVATE_ROUTE_PATTERNS` 和更新后的 `buildServiceWorkerSource()`。

- [ ] **Step 1: 先扩展 Worker 源码失败测试**

断言生成源码包含：

```ts
expect(source).toContain('const OFFLINE_APP_PATH = "/offline/app"');
expect(source).toContain('pathname.startsWith("/_next/static/")');
expect(source).toContain("cache.match(OFFLINE_APP_PATH)");
expect(source).toContain("Response.redirect");
expect(source).toContain("encodeURIComponent");
```

同时断言源码没有 Supabase 域名、`/api/` 缓存、私人 HTML `cache.put(request` 或通用 runtime cache；现有 waiting、旧缓存清理和单次接管契约继续存在。

- [ ] **Step 2: 运行 Worker 测试并确认失败**

Run:

```powershell
npm.cmd test -- src/features/pwa/service-worker-source.test.ts src/app/sw.js/route.test.ts
```

Expected: FAIL，现有 Worker 只回退 `/offline.html`。

- [ ] **Step 3: 实现安装期精确资源发现**

Worker 安装时先 fetch `/offline/app`，读取 HTML 文本，通过 `src="..."` 和 `href="..."` 属性提取 URL；每个候选使用 `new URL(value, self.location.origin)` 规范化，只允许：

```js
candidate.origin === self.location.origin &&
candidate.pathname.startsWith("/_next/static/")
```

把离线壳 HTML 固定写到 `OFFLINE_APP_PATH` 键，再 `cache.addAll()` 精确静态依赖。安装任何一步失败时删除新版本缓存并重新抛错，让旧 Worker 保持活动。

- [ ] **Step 4: 实现离线导航分支**

- `/offline/app` 导航网络失败时从当前版本缓存返回壳 HTML，忽略查询参数。
- `/recipes`、菜谱详情、烹饪路径和 `/shopping` 网络失败时返回站内 302 到 `/offline/app?path=<编码后的原路径和查询>`。
- 登录、设置、编辑、新建和未知路径网络失败时继续返回 `/offline.html`。
- 非导航资源只对显式公共预缓存键使用 cache-first；不得新增任意 `cache.put(request, response)`。

- [ ] **Step 5: 运行完整 PWA 单元测试**

Run:

```powershell
npm.cmd test -- src/features/pwa src/app/manifest.test.ts src/app/sw.js/route.test.ts src/features/auth/route-access.test.ts
npm.cmd run typecheck
```

Expected: 全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 6: 提交 Task 6**

```powershell
git add src/features/pwa/service-worker-source.ts src/features/pwa/service-worker-source.test.ts src/app/sw.js/route.test.ts
git commit -m "feat(pwa): precache versioned offline app shell"
```

---

### Task 7: 清除离线数据与安全退出

**Files:**
- Create: `src/features/offline/components/offline-settings-controls.tsx`
- Create: `src/features/offline/components/offline-settings-controls.test.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `clearOfflineData()`、现有 `signOut()` Server Action。
- Produces: `<OfflineSettingsControls />`，提供“清除离线数据”和“退出登录”。

- [ ] **Step 1: 先写清理顺序失败测试**

Mock 两个函数并记录调用顺序：

```ts
await user.click(screen.getByRole("button", { name: "退出登录" }));
expect(clearOfflineData).toHaveBeenCalledTimes(1);
expect(signOut).toHaveBeenCalledTimes(1);
expect(clearOfflineData.mock.invocationCallOrder[0])
  .toBeLessThan(signOut.mock.invocationCallOrder[0]);
```

再验证服务端退出拒绝时本地清理仍已完成并显示错误；“清除离线数据”只清本地、不调用 `signOut()`。

- [ ] **Step 2: 运行设置组件测试并确认失败**

Run: `npm.cmd test -- src/features/offline/components/offline-settings-controls.test.tsx`

Expected: FAIL，组件尚不存在。

- [ ] **Step 3: 实现设置控件**

两个操作共用 pending 防重复点击：

```ts
async function handleSignOut() {
  setPending("sign-out");
  await clearOfflineData();
  await signOut();
}
```

清理成功提示“离线数据已清除”；失败时不声称成功。退出流程即使本地清理失败也不能继续调用服务器退出，以免私人副本遗留在设备上，并提示用户重试清理。

- [ ] **Step 4: 替换设置页表单**

保留邮箱展示，用 `<OfflineSettingsControls />` 替换直接提交 `signOut` 的表单；不把邮箱、用户 ID 或会话传给 IndexedDB 清理函数。

- [ ] **Step 5: 运行设置、认证与数据库测试**

Run:

```powershell
npm.cmd test -- src/features/offline/components/offline-settings-controls.test.tsx src/features/offline/database.test.ts src/features/auth
npm.cmd run typecheck
```

Expected: 全部 PASS，TypeScript 退出码为 0。

- [ ] **Step 6: 提交 Task 7**

```powershell
git add src/features/offline/components/offline-settings-controls.tsx src/features/offline/components/offline-settings-controls.test.tsx 'src/app/(app)/settings/page.tsx'
git commit -m "feat(offline): clear private data on sign out"
```

---

### Task 8: 完整工程验证、浏览器验收与推送

**Files:**
- Verify only: all files changed by Tasks 1-7

**Interfaces:**
- Consumes: 完整 Module 5B 实现。
- Produces: 可验收的功能分支、测试证据、浏览器检查记录和清晰交付报告。

- [ ] **Step 1: 运行格式、类型、Lint、相关测试和生产构建**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- src/features/offline src/features/pwa src/features/shopping src/features/auth src/features/cooking src/app/manifest.test.ts src/app/sw.js/route.test.ts
npm.cmd test
npm.cmd run build
```

Expected: 所有命令退出码为 0，没有失败测试、TypeScript 错误、ESLint 错误或构建错误。若完整 Vitest 在 Windows 出现已知的无输出残留进程，必须先确认所有测试结果已输出且无失败，再终止残留进程，并在交付报告中如实记录，不能把目标测试代替完整测试结论。

- [ ] **Step 2: 启动生产构建进行桌面验收**

Run: `npm.cmd run start -- -p 3106`

在桌面浏览器完成：在线打开两道菜谱和购物清单；检查 IndexedDB 仅含结构化快照；检查 Cache Storage 只有公开壳及其精确资源；控制台无错误和重复 Worker 注册。

- [ ] **Step 3: 验证断网冷启动和同步**

1. 安装 PWA并关闭全部窗口。
2. 浏览器切换 Offline 后从 `/recipes` 冷启动。
3. 验证最近菜谱列表、详情和烹饪步骤可用且没有网络图片请求。
4. 从 `/shopping` 对同一条目执行“勾选、取消、再勾选”，确认队列只有最后 `true`。
5. 恢复网络，确认只提交最后目标状态、队列清空、服务器与本地一致。
6. 同步中断网，确认未确认记录保留；再次联网后可重试。

- [ ] **Step 4: 验证 360px、390px 和 430px**

每个宽度检查菜谱列表、详情、烹饪、购物清单和设置：无横向溢出；Checkbox 与导航触控区至少 44px；键盘焦点可见；状态提示不遮挡底部导航；滚动、勾选和步骤切换无明显掉帧。

- [ ] **Step 5: 验证 PWA 更新一致性**

1. 保持旧 Worker 控制页面，安装一个使用不同 `PWA_CACHE_VERSION` 的本地构建。
2. 确认新 Worker 处于 waiting 且旧页面继续工作。
3. 点击“立即更新”，确认 `controllerchange` 后只刷新一次。
4. 确认旧缓存删除，新缓存中的离线壳 HTML、JS、CSS 属于同一版本。
5. 确认 Cache Storage 没有 `/recipes`、`/shopping`、`/api/`、Supabase 请求或用户响应。

- [ ] **Step 6: 验证退出与清理**

先制造菜谱快照、购物快照和待同步队列，再点击退出登录。确认 IndexedDB 数据库已删除、账号退出、重新断网打开时不显示之前用户数据。“清除离线数据”必须不删除服务器数据且不退出账号。

- [ ] **Step 7: 检查 Git 范围和敏感信息**

Run:

```powershell
git status --short
git diff --check origin/feat/recipe-app-shopping...HEAD
git diff --stat origin/feat/recipe-app-shopping...HEAD
git diff --name-only origin/feat/recipe-app-shopping...HEAD
```

检查所有新增内容，确认 `.env`、密钥、Token、密码、Supabase service-role key 和临时浏览器产物均未提交；保留现有 `.superpowers/sdd/2026-08-24-module-4-shopping-list/` 未跟踪目录，不得暂存。

- [ ] **Step 8: 推送当前功能分支并核对远程指针**

Run:

```powershell
git push origin feat/recipe-app-shopping
git rev-parse HEAD
git ls-remote origin refs/heads/feat/recipe-app-shopping
```

Expected: 推送成功，本地 HEAD 与远程分支 SHA 完全一致。不得推送 main/master，不创建或合并 Pull Request，不发布 Production。

- [ ] **Step 9: 按模块交付格式暂停**

交付报告必须包含：完成内容、文件、数据库/API/配置变化、自动化测试、桌面和三种手机宽度验收、PWA 缓存与更新结果、已知问题、分支、Commit 列表、远程链接，以及当前等待用户验收 Module 5B。
