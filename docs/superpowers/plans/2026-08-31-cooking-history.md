# 食序 ORDINE 烹饪历史与个人改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在完成引导烹饪时保存私有烹饪记录、可选评分、最多三张成品照片和“下次注意”，并与周菜单完成状态联动，在菜谱详情沉淀最近记录与统计。

**Architecture:** 新增规范化的 `cooking_records` 与 `cooking_record_photos`，通过 `SECURITY INVOKER` RPC 原子写入记录、照片元数据并完成可选周菜单项。浏览器先复用现有图片压缩与私有 `recipe-media` bucket 上传照片，再提交数据库事务；现有 `CookingSessionV1` 只在远程保存成功或用户明确跳过记录后清除。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、shadcn/ui、Zod 4、Supabase PostgreSQL/Auth/RLS/Storage、Vitest、Testing Library、PGlite、Vercel

**Spec:** `docs/superpowers/specs/2026-08-31-cooking-history-design.md`

## Global Constraints

- 本模块只服务个人用户，不增加家庭共享或多人权限。
- 所有代码使用 TypeScript；数据库变更只通过新的 Supabase migration 完成。
- 记录可选关联菜谱和周菜单项；永久删除菜谱或菜单项时只解除关联，不删除历史。
- `recipe_title_snapshot` 是唯一菜谱快照；不保存完整食材、步骤或菜谱版本树。
- 实际份数范围 0.25–1000；评分只允许空值或整数 1–5；“下次注意”最多 2000 字。
- 每次记录最多 3 张成品照片；继续使用私有 `recipe-media` bucket、WebP 压缩、最长边 1600px、上传后最大 5MB、`upsert: false`。
- 云端保存成功前不得清除本地烹饪会话；失败时必须保留重试能力。
- 第一版不增加全局历史页、记录编辑 UI、批量管理、离线写入队列或后台同步。
- 不增加新依赖、新服务商或付费能力。
- 新表启用并强制 RLS，撤销 `public`/`anon`，显式授权 `authenticated`，所有权使用 `(select auth.uid()) = user_id`。
- 新数据库函数使用 `SECURITY INVOKER`、`set search_path = ''`，撤销 `public`/`anon` 的执行权。
- 执行时由 LHNA 在当前工作区内使用 `superpowers:executing-plans`；未经用户明确要求不派生子任务或子代理。
- 不提交 `.env`、API Key、Token、密码或 Supabase 密钥。
- 不推送 `main`、不创建或合并 PR；只推送当前 `feat/recipe-app-shopping`。
- 正式 Supabase 迁移和 Production 发布必须分别获得用户明确确认。

---

## File Structure

### Create

- 通过 `npx.cmd supabase migration new cooking_history` 创建 CLI 实际输出的 `supabase/migrations/*_cooking_history.sql`：两张表、约束、索引、强制 RLS、授权、策略和两个 RPC。
- `src/test/database/cooking-history-migration.test.ts`：迁移结构、约束、索引、权限和函数属性测试。
- `src/test/database/cooking-history-security.test.ts`：RLS、越权、关联删除、原子菜单完成和回滚测试。
- `src/features/cooking-history/types.ts`：记录、照片、统计、菜单上下文和操作结果类型。
- `src/features/cooking-history/schemas.ts`：完成记录输入和页面查询参数校验。
- `src/features/cooking-history/schemas.test.ts`：份数、评分、备注、照片和 UUID 校验测试。
- `src/features/cooking-history/media.ts`：照片路径、压缩上传和安全清理。
- `src/features/cooking-history/media.test.ts`：路径隔离、三图上限、上传失败清理测试。
- `src/features/cooking-history/actions.ts`：认证后的完成记录 Server Action。
- `src/features/cooking-history/actions.test.ts`：RPC payload、失败返回、刷新路径测试。
- `src/features/cooking-history/queries.ts`：菜单入口验证、统计、最近记录和签名图片查询。
- `src/features/cooking-history/queries.test.ts`：所有权过滤、排序、统计映射和签名地址测试。
- `src/features/cooking-history/components/cooking-photo-picker.tsx`：最多三张照片的选择、预览和移除。
- `src/features/cooking-history/components/cooking-photo-picker.test.tsx`：图片选择与可访问性测试。
- `src/features/cooking-history/components/cooking-reflection-dialog.tsx`：完成复盘、上传、保存、重试和跳过。
- `src/features/cooking-history/components/cooking-reflection-dialog.test.tsx`：可选字段、失败恢复和重复提交测试。
- `src/features/cooking-history/components/cooking-history-section.tsx`：详情统计、最近三次记录和空状态。
- `src/features/cooking-history/components/cooking-history-section.test.tsx`：统计、备注、照片和空状态测试。
- `docs/testing/module-9-cooking-history-acceptance.md`：Preview 人工验收清单。

### Modify

- `src/test/database/load-migrations.ts`
- `src/lib/supabase/database.types.ts`
- `src/features/media/upload-recipe-media.ts`
- `src/features/media/upload-recipe-media.test.ts`
- `src/app/(app)/recipes/[recipeId]/cook/page.tsx`
- `src/features/cooking/components/cooking-screen.tsx`
- `src/features/cooking/components/cooking-screen.test.tsx`
- `src/features/meal-plans/components/meal-plan-page.tsx`
- `src/features/meal-plans/components/meal-plan-page.test.tsx`
- `src/app/(app)/recipes/[recipeId]/page.tsx`
- `src/features/recipes/components/recipe-detail.tsx`
- `src/features/recipes/components/recipe-detail.test.tsx`
- `package.json`
- `README.md`

---

### Task 1: 建立私有烹饪历史数据库边界

**Files:**
- Create via CLI: `supabase/migrations/*_cooking_history.sql`
- Create: `src/test/database/cooking-history-migration.test.ts`
- Create: `src/test/database/cooking-history-security.test.ts`
- Modify: `src/test/database/load-migrations.ts`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: `public.recipes(user_id, id)`、`public.meal_plan_entries(user_id, id)`、`public.set_updated_at()` 和当前 `auth.uid()` RLS 约定。
- Produces: `public.cooking_records`、`public.cooking_record_photos`、`public.complete_cooking_record(jsonb)`、`public.get_recipe_cooking_history_stats(uuid)` 及对应生成类型。

- [ ] **Step 1: 通过 Supabase CLI 创建迁移文件**

先检查当前 CLI 命令，再创建文件；不要手写时间戳：

```powershell
npx.cmd supabase --version
npx.cmd supabase migration --help
npx.cmd supabase migration new cooking_history
```

Expected: CLI 输出一个且仅一个以 `_cooking_history.sql` 结尾的新文件。记录这个实际路径，Task 1 后续只编辑该文件。

- [ ] **Step 2: 让 PGlite 加载器包含新迁移并写失败测试**

在 `load-migrations.ts` 增加：

```ts
export async function loadCookingHistoryMigrations(database: PGlite) {
  await loadMealPlanMigrations(database);
  await loadSingleMigration(database, "_cooking_history.sql", "cooking history");
}
```

`cooking-history-migration.test.ts` 至少断言：

```ts
expect(tableFlags.rows).toEqual([
  { table_name: "cooking_record_photos", rowsecurity: true, force: true },
  { table_name: "cooking_records", rowsecurity: true, force: true },
]);
expect(functions.rows).toEqual([
  { proname: "complete_cooking_record", prosecdef: false },
  { proname: "get_recipe_cooking_history_stats", prosecdef: false },
]);
```

再断言字段类型、`rating`/份数/备注/完成时间/照片顺序约束、两个 user-leading 索引、只有 `authenticated` 持有表 CRUD 与函数执行权限。

`cooking-history-security.test.ts` 固定使用两个用户、两个菜谱和两个菜单项，覆盖：

```ts
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const recipeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recordA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
```

测试 owner 正常保存、userB 看不到且不能修改、anon 查询报权限错误、跨用户菜谱/菜单关联失败、第四张照片失败、重复 `sort_order` 失败、非法评分失败。

- [ ] **Step 3: 运行数据库测试确认失败**

```powershell
npm.cmd test -- src/test/database/cooking-history-migration.test.ts src/test/database/cooking-history-security.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，原因是 `cooking_records` 或函数尚不存在；不得通过放宽断言消除失败。

- [ ] **Step 4: 在 CLI 生成的迁移中创建两张表**

迁移必须使用以下列和边界：

```sql
create table public.cooking_records (
  id uuid primary key,
  user_id uuid not null,
  recipe_id uuid,
  recipe_title_snapshot text not null,
  meal_plan_entry_id uuid,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  actual_servings numeric(6,2) not null,
  rating smallint,
  improvement_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cooking_records_user_id_id_unique unique (user_id, id),
  constraint cooking_records_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint cooking_records_recipe_owner_fk
    foreign key (user_id, recipe_id) references public.recipes(user_id, id)
    on delete set null (recipe_id),
  constraint cooking_records_meal_plan_owner_fk
    foreign key (user_id, meal_plan_entry_id) references public.meal_plan_entries(user_id, id)
    on delete set null (meal_plan_entry_id),
  constraint cooking_records_title_length
    check (char_length(trim(recipe_title_snapshot)) between 1 and 120),
  constraint cooking_records_servings_range
    check (actual_servings between 0.25 and 1000),
  constraint cooking_records_rating_range
    check (rating is null or rating between 1 and 5),
  constraint cooking_records_notes_length
    check (improvement_notes is null or char_length(trim(improvement_notes)) between 1 and 2000),
  constraint cooking_records_time_order
    check (completed_at >= started_at)
);

create table public.cooking_record_photos (
  id uuid primary key,
  user_id uuid not null,
  cooking_record_id uuid not null,
  storage_path text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  constraint cooking_record_photos_user_fk
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint cooking_record_photos_record_owner_fk
    foreign key (user_id, cooking_record_id)
    references public.cooking_records(user_id, id) on delete cascade,
  constraint cooking_record_photos_path_length
    check (char_length(storage_path) between 1 and 500),
  constraint cooking_record_photos_sort_range
    check (sort_order between 0 and 2),
  constraint cooking_record_photos_record_sort_unique
    unique (cooking_record_id, sort_order)
);
```

创建：

```sql
create index cooking_records_user_recipe_completed_idx
  on public.cooking_records (user_id, recipe_id, completed_at desc);
create index cooking_records_user_meal_plan_idx
  on public.cooking_records (user_id, meal_plan_entry_id);
create index cooking_record_photos_user_record_idx
  on public.cooking_record_photos (user_id, cooking_record_id);
```

为 `cooking_records` 复用 `public.set_updated_at()` 触发器。

- [ ] **Step 5: 实现原子完成函数**

`complete_cooking_record(jsonb)` 必须：

```sql
language plpgsql
security invoker
set search_path = ''
```

函数内部固定解析：

```sql
v_user_id uuid := (select auth.uid());
v_record_id uuid := (p_payload->>'cookingRecordId')::uuid;
v_recipe_id uuid := (p_payload->>'recipeId')::uuid;
v_meal_plan_entry_id uuid := nullif(p_payload->>'mealPlanEntryId', '')::uuid;
v_started_at timestamptz := (p_payload->>'startedAt')::timestamptz;
v_actual_servings numeric := (p_payload->>'actualServings')::numeric;
v_rating smallint := nullif(p_payload->>'rating', '')::smallint;
v_notes text := nullif(trim(p_payload->>'improvementNotes'), '');
```

先从 `public.recipes` 读取当前用户、未删除菜谱标题。存在菜单 ID 时使用 `for update` 读取当前用户菜单项，并在 `recipe_id <> v_recipe_id` 时抛出 `23503`。校验 `jsonb_array_length(coalesce(p_payload->'photos', '[]')) <= 3`，逐张验证：

```sql
v_photo->>'storagePath' like
  v_user_id::text || '/cooking-records/' || v_record_id::text || '/%'
```

插入记录和照片后执行：

```sql
update public.meal_plan_entries
set status = 'completed'
where id = v_meal_plan_entry_id and user_id = v_user_id;
```

返回 `v_record_id`。重复 ID 必须由主键冲突失败，不能 `on conflict do nothing`。

- [ ] **Step 6: 实现只读统计函数**

`get_recipe_cooking_history_stats(uuid)` 返回一行：

```sql
returns table (
  total_count bigint,
  rated_count bigint,
  average_rating numeric,
  latest_improvement_notes text
)
language sql
stable
security invoker
set search_path = ''
```

统计查询必须显式限制：

```sql
where cr.user_id = (select auth.uid())
  and cr.recipe_id = p_recipe_id
```

平均分使用 `avg(rating)::numeric(3,2)`；最新备注通过按 `completed_at desc, id desc` 排序、过滤 `improvement_notes is not null` 取得一条。

- [ ] **Step 7: 配置 RLS、授权和函数执行权**

两表执行 `enable row level security` 和 `force row level security`。每表建立四条逐操作策略：

```sql
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

其中 insert 只写 `with check`，select/delete 只写 `using`。执行：

```sql
revoke all on table public.cooking_records from public, anon, authenticated;
revoke all on table public.cooking_record_photos from public, anon, authenticated;
grant select, insert, update, delete on table public.cooking_records to authenticated;
grant select, insert, update, delete on table public.cooking_record_photos to authenticated;
revoke all on function public.complete_cooking_record(jsonb) from public, anon;
revoke all on function public.get_recipe_cooking_history_stats(uuid) from public, anon;
grant execute on function public.complete_cooking_record(jsonb) to authenticated;
grant execute on function public.get_recipe_cooking_history_stats(uuid) to authenticated;
```

- [ ] **Step 8: 补齐关系删除和事务安全测试**

测试必须证明：

1. RPC 成功后记录存在，关联菜单状态为 `completed`。
2. 错误菜单菜谱导致 RPC 失败，记录、照片均不存在，菜单状态仍为 `planned`。
3. 永久删除菜谱后 `cooking_records.recipe_id is null`，`recipe_title_snapshot` 保留。
4. 删除菜单项后 `meal_plan_entry_id is null`，记录保留。
5. 删除记录后照片元数据级联删除。
6. 删除历史记录不会把菜单状态改回 `planned`。

- [ ] **Step 9: 更新 Supabase TypeScript 类型并运行测试**

在 `Database["public"]["Tables"]` 增加两张表的 `Row`、`Insert`、`Update`、`Relationships`；在 `Functions` 增加两个 RPC 的参数和返回类型。字段名必须保持 snake_case，与 SQL 完全一致。

```powershell
npm.cmd test -- src/test/database/cooking-history-migration.test.ts src/test/database/cooking-history-security.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
npm.cmd run typecheck
```

Expected: 两个数据库测试文件全部 PASS；TypeScript 不再报告新表或 RPC 未定义。

- [ ] **Step 10: 提交数据库边界**

```powershell
git add -- supabase/migrations src/test/database/load-migrations.ts src/test/database/cooking-history-migration.test.ts src/test/database/cooking-history-security.test.ts src/lib/supabase/database.types.ts
git commit -m "feat(cooking-history): add private history schema"
```

---

### Task 2: 定义烹饪记录领域类型和校验

**Files:**
- Create: `src/features/cooking-history/types.ts`
- Create: `src/features/cooking-history/schemas.ts`
- Create: `src/features/cooking-history/schemas.test.ts`

**Interfaces:**
- Consumes: Task 1 的 RPC payload 字段和现有 `ActionResult<T>`。
- Produces: `CompleteCookingRecordInput`、`CookingRecordSummary`、`CookingHistoryStats`、`RecipeCookingHistory`、`MealPlanCookingContext`、`completeCookingRecordInputSchema` 和 `mealPlanCookingQuerySchema`。

- [ ] **Step 1: 写 Zod 失败测试**

有效输入固定为：

```ts
const validInput = {
  cookingRecordId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  mealPlanEntryId: null,
  startedAt: "2026-08-31T10:00:00.000Z",
  actualServings: 2,
  rating: 5,
  improvementNotes: "下次少放盐",
  photos: [{
    photoId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    storagePath: "11111111-1111-4111-8111-111111111111/cooking-records/cccccccc-cccc-4ccc-8ccc-cccccccccccc/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp",
    sortOrder: 0,
  }],
};
```

测试接受 rating/notes/photos 为空，拒绝 0 或 6 星、0 份、1000.01 份、2001 字备注、4 张照片、重复照片 ID、重复 `sortOrder`、无效 UUID 和无效 ISO 时间。

- [ ] **Step 2: 运行 schema 测试确认失败**

```powershell
npm.cmd test -- src/features/cooking-history/schemas.test.ts
```

Expected: FAIL，模块尚不存在。

- [ ] **Step 3: 实现精确类型**

`types.ts` 公开：

```ts
export type CookingRecordPhoto = {
  id: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type CookingRecordSummary = {
  id: string;
  recipeId: string | null;
  recipeTitleSnapshot: string;
  mealPlanEntryId: string | null;
  startedAt: string;
  completedAt: string;
  actualServings: number;
  rating: number | null;
  improvementNotes: string | null;
  photos: CookingRecordPhoto[];
};

export type CookingHistoryStats = {
  totalCount: number;
  ratedCount: number;
  averageRating: number | null;
  latestImprovementNotes: string | null;
};

export type RecipeCookingHistory = {
  stats: CookingHistoryStats;
  recentRecords: CookingRecordSummary[];
};

export type MealPlanCookingContext = {
  mealPlanEntryId: string;
  targetServings: number;
};

export type CompleteCookingRecordInput = {
  cookingRecordId: string;
  recipeId: string;
  mealPlanEntryId: string | null;
  startedAt: string;
  actualServings: number;
  rating: number | null;
  improvementNotes: string | null;
  photos: Array<{
    photoId: string;
    storagePath: string;
    sortOrder: number;
  }>;
};
```

操作结果复用 `ActionResult<{ cookingRecordId: string }>`。不得给输入增加客户端 `userId` 或 `recipeTitleSnapshot`；这两个值必须由认证会话和数据库菜谱行决定。

- [ ] **Step 4: 实现 Zod schema**

使用：

```ts
const uuid = z.string().uuid();
const nullableTrimmedText = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().min(1).max(2000).nullable(),
);
```

照片数组 `.max(3)`，并使用 `.superRefine()` 同时拒绝重复 `photoId` 和重复 `sortOrder`。`sortOrder` 只允许 0–2。`startedAt` 使用 `z.string().datetime({ offset: true })`。

查询参数 schema 只接受可选 UUID `mealPlanEntryId`；无效值返回 `null`，不向数据库传递未验证字符串。

- [ ] **Step 5: 运行测试并提交领域层**

```powershell
npm.cmd test -- src/features/cooking-history/schemas.test.ts
npm.cmd run typecheck
git add src/features/cooking-history/types.ts src/features/cooking-history/schemas.ts src/features/cooking-history/schemas.test.ts
git commit -m "feat(cooking-history): define record contracts"
```

Expected: schema 测试 PASS；无类型错误。

---

### Task 3: 复用图片压缩并实现成品照片上传

**Files:**
- Create: `src/features/cooking-history/media.ts`
- Create: `src/features/cooking-history/media.test.ts`
- Modify: `src/features/media/upload-recipe-media.ts`
- Modify: `src/features/media/upload-recipe-media.test.ts`

**Interfaces:**
- Consumes: `validateImageFile()`、`TARGET_IMAGE_BYTES`、`MAX_IMAGE_DIMENSION` 和 `recipe-media` bucket 的 `upload/remove` 接口。
- Produces: `buildCookingRecordPhotoPath()`、`uploadCookingRecordPhotos()`、`removeCookingRecordPhotoPaths()` 和 `UploadedCookingPhoto`。

- [ ] **Step 1: 为共享压缩和成品照片写失败测试**

在原媒体测试中增加对导出函数的断言：

```ts
const output = await compressRecipeImage(source, compress);
expect(output.type).toBe("image/webp");
```

新媒体测试断言：

```ts
expect(buildCookingRecordPhotoPath(userId, recordId, photoId)).toBe(
  `${userId}/cooking-records/${recordId}/${photoId}.webp`,
);
```

并覆盖无效 UUID、4 张图片拒绝、上传顺序稳定、第二张失败时清理第一张、清理函数忽略不在当前用户/记录前缀下的路径。

- [ ] **Step 2: 运行媒体测试确认失败**

```powershell
npm.cmd test -- src/features/media/upload-recipe-media.test.ts src/features/cooking-history/media.test.ts
```

Expected: FAIL，`compressRecipeImage` 和 cooking-history media 尚不存在。

- [ ] **Step 3: 导出现有压缩能力**

在 `upload-recipe-media.ts` 把私有 `compressImage` 重命名并导出为：

```ts
export async function compressRecipeImage(
  file: File,
  compress?: UploadRecipeMediaInput["compress"],
): Promise<File>
```

现有 `uploadRecipeMedia()` 改为调用该导出函数，行为、大小限制和错误文案保持不变。

- [ ] **Step 4: 实现成品照片媒体模块**

`media.ts` 定义：

```ts
export type UploadedCookingPhoto = {
  photoId: string;
  storagePath: string;
  sortOrder: number;
};

export type UploadCookingRecordPhotosInput = {
  userId: string;
  cookingRecordId: string;
  files: Array<{ photoId: string; file: File }>;
  bucket: RecipeMediaBucket;
  compress?: Parameters<typeof compressRecipeImage>[1];
};

export type UploadCookingRecordPhotosResult = {
  photos: UploadedCookingPhoto[];
  uploadedPaths: string[];
};
```

`uploadCookingRecordPhotos(input): Promise<UploadCookingRecordPhotosResult>` 在开始前拒绝超过三张，按数组顺序写 `sortOrder`，上传选项固定为：

```ts
{
  cacheControl: "31536000",
  upsert: false,
  contentType: "image/webp",
}
```

捕获任一失败时调用安全清理并抛出“成品照片上传失败，请重试或移除照片”。

- [ ] **Step 5: 运行测试并提交媒体能力**

```powershell
npm.cmd test -- src/features/media/upload-recipe-media.test.ts src/features/cooking-history/media.test.ts
git add src/features/media/upload-recipe-media.ts src/features/media/upload-recipe-media.test.ts src/features/cooking-history/media.ts src/features/cooking-history/media.test.ts
git commit -m "feat(cooking-history): upload private result photos"
```

Expected: 两个测试文件 PASS，现有菜谱图片上传测试无回归。

---

### Task 4: 实现完成记录 Server Action 与历史查询

**Files:**
- Create: `src/features/cooking-history/actions.ts`
- Create: `src/features/cooking-history/actions.test.ts`
- Create: `src/features/cooking-history/queries.ts`
- Create: `src/features/cooking-history/queries.test.ts`

**Interfaces:**
- Consumes: Task 1 的 Supabase 表/RPC、Task 2 schemas/types、现有 `createServerSupabaseClient()`、`getServerAuthContext()` 和签名 URL 工具。
- Produces: `completeCookingRecordAction()`、`resolveMealPlanCookingContext()` 和 `getRecipeCookingHistory()`。

- [ ] **Step 1: 写 Server Action 失败测试**

Mock `createServerSupabaseClient()` 和 `revalidatePath()`，覆盖：

1. 非法输入返回 `{ ok: false, message: "请检查本次烹饪记录" }`，不调用 RPC。
2. 未登录返回“请先登录后再保存烹饪记录”。
3. RPC 调用名为 `complete_cooking_record`，参数为 `{ p_payload: parsed.data }`。
4. RPC 失败返回“烹饪记录保存失败，请稍后重试”。
5. 成功时刷新 `/recipes/{recipeId}` 与 `/plan`，返回记录 ID。

核心断言：

```ts
expect(rpc).toHaveBeenCalledWith("complete_cooking_record", {
  p_payload: validInput,
});
expect(revalidatePath).toHaveBeenCalledWith(`/recipes/${validInput.recipeId}`);
expect(revalidatePath).toHaveBeenCalledWith("/plan");
```

- [ ] **Step 2: 写查询失败测试**

`resolveMealPlanCookingContext(recipeId, mealPlanEntryId)` 测试：空 ID 返回 null 且不查询；合法 owned row 返回 ID/份数；查不到、菜谱不匹配或 Supabase 错误返回 null。

`getRecipeCookingHistory(recipeId)` 测试：

- RPC 统计数字映射为 number。
- 最近记录查询限制 `.limit(3)`，按 `completed_at desc` 再按 `id desc`。
- 照片按 `sort_order` 排序。
- 收集全部 `storage_path`，一次调用 `createSignedImageUrlMap(storage.from("recipe-media"), paths)`。
- 无记录返回零统计和空数组。

- [ ] **Step 3: 运行 action/query 测试确认失败**

```powershell
npm.cmd test -- src/features/cooking-history/actions.test.ts src/features/cooking-history/queries.test.ts
```

Expected: FAIL，模块尚不存在。

- [ ] **Step 4: 实现认证与完成 Action**

`completeCookingRecordAction(input: unknown)`：

```ts
export async function completeCookingRecordAction(
  input: unknown,
): Promise<ActionResult<{ cookingRecordId: string }>>
```

先 `safeParse`，再通过 `supabase.auth.getUser()` 获取可信用户；不要接受客户端 user ID。RPC 成功后 revalidate 两个路径。服务端日志只记录 `error.code`、`error.message`、`error.hint`，不记录 payload。

- [ ] **Step 5: 实现菜单上下文与历史查询**

菜单上下文只查询：

```ts
.from("meal_plan_entries")
.select("id, recipe_id, target_servings")
.eq("id", mealPlanEntryId)
.eq("recipe_id", recipeId)
.eq("user_id", user.id)
.maybeSingle()
```

历史查询并行获取统计 RPC 和最近记录。最近记录 select 包括嵌套照片：

```ts
"id, recipe_id, recipe_title_snapshot, meal_plan_entry_id, started_at, completed_at, actual_servings, rating, improvement_notes, cooking_record_photos(id, storage_path, sort_order)"
```

映射后只暴露签名 URL，不把 `storage_path` 传给 UI 类型。

- [ ] **Step 6: 运行测试并提交服务边界**

```powershell
npm.cmd test -- src/features/cooking-history/actions.test.ts src/features/cooking-history/queries.test.ts
npm.cmd run typecheck
git add src/features/cooking-history/actions.ts src/features/cooking-history/actions.test.ts src/features/cooking-history/queries.ts src/features/cooking-history/queries.test.ts
git commit -m "feat(cooking-history): save and query cooking records"
```

Expected: action/query 测试 PASS；类型检查通过。

---

### Task 5: 增加完成复盘、照片选择和失败恢复

**Files:**
- Create: `src/features/cooking-history/components/cooking-photo-picker.tsx`
- Create: `src/features/cooking-history/components/cooking-photo-picker.test.tsx`
- Create: `src/features/cooking-history/components/cooking-reflection-dialog.tsx`
- Create: `src/features/cooking-history/components/cooking-reflection-dialog.test.tsx`
- Modify: `src/features/cooking/components/cooking-screen.tsx`
- Modify: `src/features/cooking/components/cooking-screen.test.tsx`

**Interfaces:**
- Consumes: `completeCookingRecordAction()`、`uploadCookingRecordPhotos()`、当前用户 ID、菜谱、可选菜单 ID 和 `CookingSessionV1.startedAt`。
- Produces: 可恢复的完成复盘流程；只在 `onCompleted()` 或明确 `onSkip()` 后清理本地会话。

- [ ] **Step 1: 写照片选择器失败测试**

测试选择两张合法图片后出现两个预览和两个“移除成品照片”按钮；再选两张时只保留最多三张并显示“每次最多上传 3 张成品照片”。测试 input 具有：

```tsx
accept="image/jpeg,image/png,image/webp"
multiple
```

并验证每张预览都有 `alt="成品照片预览 1"` 等可访问名称，卸载或移除时调用 `URL.revokeObjectURL()`。

- [ ] **Step 2: 写复盘对话框失败测试**

Mock 上传与 action，覆盖：

- 默认份数显示 `2`。
- 不填评分、照片、备注也提交 `rating: null`、`photos: []`。
- 五星按钮带有 `aria-label="5 星"` 且键盘可选。
- 双击保存只调用一次 action。
- 上传失败保留对话框和字段，出现“重试保存”。
- RPC 失败调用 `removeCookingRecordPhotoPaths()`，保留本地会话，不调用 `onCompleted`。
- 发生错误后出现“本次不保存记录并退出”，点击才调用 `onSkip`。
- “返回继续烹饪”关闭对话框但不清理会话。

- [ ] **Step 3: 更新 CookingScreen 现有完成测试为失败预期**

将原“点击完成立即清理”测试改为：

```ts
fireEvent.click(screen.getByRole("button", { name: "完成烹饪" }));
expect(screen.getByRole("dialog", { name: "记录这次烹饪" })).toBeInTheDocument();
expect(localStorage.getItem(cookingSessionKey(recipe.id))).not.toBeNull();
```

Mock 成功保存后再断言 localStorage 被清除并出现“烹饪完成”。另测 action 失败时 localStorage 保留。

- [ ] **Step 4: 运行组件测试确认失败**

```powershell
npm.cmd test -- src/features/cooking-history/components/cooking-photo-picker.test.tsx src/features/cooking-history/components/cooking-reflection-dialog.test.tsx src/features/cooking/components/cooking-screen.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，复盘组件不存在且 CookingScreen 仍会立即完成。

- [ ] **Step 5: 实现聚焦照片选择器**

公开接口：

```ts
export type CookingPhotoDraft = {
  photoId: string;
  file: File;
  previewUrl: string;
};

type CookingPhotoPickerProps = {
  photos: CookingPhotoDraft[];
  onChange(photos: CookingPhotoDraft[]): void;
  disabled?: boolean;
};
```

选择时先执行 `validateImageFile(file)`；对合法文件生成 UUID 与 object URL。失败文件不加入数组，并用 `role="alert"` 显示具体校验消息。

- [ ] **Step 6: 实现完成复盘对话框**

公开接口：

```ts
type CookingReflectionDialogProps = {
  open: boolean;
  userId: string;
  recipeId: string;
  mealPlanEntryId: string | null;
  startedAt: number;
  defaultServings: number;
  onOpenChange(open: boolean): void;
  onCompleted(cookingRecordId: string): void;
  onSkip(): void;
};
```

组件内部提交顺序固定为：

```ts
const cookingRecordId = crypto.randomUUID();
const uploaded = await uploadCookingRecordPhotos({
  userId,
  cookingRecordId,
  files: photos.map(({ photoId, file }) => ({ photoId, file })),
  bucket: getBrowserSupabaseClient().storage.from("recipe-media"),
});
const result = await completeCookingRecordAction({
  cookingRecordId,
  recipeId,
  mealPlanEntryId,
  startedAt: new Date(startedAt).toISOString(),
  actualServings,
  rating,
  improvementNotes,
  photos: uploaded.photos,
});
```

RPC 失败时清理 `uploaded.uploadedPaths`。`isSaving` 为 true 时禁用关闭、照片修改与保存按钮。成功只调用 `onCompleted`，不直接操作 localStorage。

- [ ] **Step 7: 把复盘接入 CookingScreen**

`CookingScreenProps` 增加：

```ts
userId: string;
mealPlanEntryId: string | null;
```

增加 `reflectionOpen` 状态。最后一步按钮只执行 `setReflectionOpen(true)`。成功或明确跳过共用：

```ts
const finishCooking = () => {
  cooking.complete();
  setReflectionOpen(false);
  setCompleted(true);
};
```

成功完成页文案区分“烹饪记录已保存”和“本次未保存记录”，但两个状态都保留“查看菜谱”入口。

- [ ] **Step 8: 运行测试并提交复盘流程**

```powershell
npm.cmd test -- src/features/cooking-history/components src/features/cooking/components/cooking-screen.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
npm.cmd run typecheck
git add src/features/cooking-history/components src/features/cooking/components/cooking-screen.tsx src/features/cooking/components/cooking-screen.test.tsx
git commit -m "feat(cooking): add completion reflection"
```

Expected: 组件测试 PASS；现有计时器、准备确认和 Wake Lock 测试继续通过。

---

### Task 6: 从周菜单安全进入烹饪并预填份数

**Files:**
- Modify: `src/app/(app)/recipes/[recipeId]/cook/page.tsx`
- Modify: `src/features/meal-plans/components/meal-plan-page.tsx`
- Modify: `src/features/meal-plans/components/meal-plan-page.test.tsx`
- Test: `src/features/cooking-history/queries.test.ts`

**Interfaces:**
- Consumes: `resolveMealPlanCookingContext()`、Task 5 扩展后的 `CookingScreen` props 和 `MealPlanEntry`。
- Produces: `/recipes/{recipeId}/cook?servings={n}&mealPlanEntryId={id}` 安全入口。

- [ ] **Step 1: 写周菜单入口失败测试**

在 `meal-plan-page.test.tsx` 固定一条 `planned` 菜单项，断言：

```ts
expect(await screen.findByRole("link", { name: "开始烹饪：番茄炒蛋" }))
  .toHaveAttribute(
    "href",
    "/recipes/recipe-a/cook?servings=4&mealPlanEntryId=entry-a",
  );
```

`completed` 和 `skipped` 菜单项不显示开始入口。保留现有“完成”“跳过”“编辑”“删除”能力。

- [ ] **Step 2: 写烹饪路由上下文测试**

扩展 query 测试：合法 owned entry 返回 `{ mealPlanEntryId, targetServings }`；无效 UUID、其他用户、其他菜谱、已删除菜谱返回 null。若菜单上下文有效，份数必须采用菜单 `targetServings`，而不是可篡改的 `servings` 查询参数。

- [ ] **Step 3: 运行测试确认失败**

```powershell
npm.cmd test -- src/features/meal-plans/components/meal-plan-page.test.tsx src/features/cooking-history/queries.test.ts
```

Expected: FAIL，周菜单没有开始链接，cook page 尚未解析菜单上下文。

- [ ] **Step 4: 实现周菜单开始入口**

在 `MealPlanPage` 的每个 planned item 操作区加入 `Link`，使用 `URLSearchParams` 生成查询字符串，避免手工编码：

```ts
const params = new URLSearchParams({
  servings: String(entry.targetServings),
  mealPlanEntryId: entry.id,
});
const href = `/recipes/${entry.recipeId}/cook?${params.toString()}`;
```

链接使用至少 44px 点击高度和唯一 `aria-label`。

- [ ] **Step 5: 在服务端解析可信菜单上下文**

`searchParams` 类型增加 `mealPlanEntryId`。页面先加载 recipe 和 auth，再调用：

```ts
const mealPlanContext = user && typeof query.mealPlanEntryId === "string"
  ? await resolveMealPlanCookingContext(recipe.id, query.mealPlanEntryId)
  : null;
```

传给屏幕：

```tsx
<CookingScreen
  userId={user.id}
  recipe={recipe}
  requestedServings={mealPlanContext?.targetServings ?? parseTargetServings(servings, recipe.baseServings)}
  mealPlanEntryId={mealPlanContext?.mealPlanEntryId ?? null}
  restart={query.restart === "1"}
/>
```

未登录沿用现有认证边界，不使用空 user ID 渲染。

- [ ] **Step 6: 运行测试并提交菜单联动入口**

```powershell
npm.cmd test -- src/features/meal-plans src/features/cooking-history/queries.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
npm.cmd run typecheck
git add -- 'src/app/(app)/recipes/[recipeId]/cook/page.tsx' src/features/meal-plans src/features/cooking-history/queries.test.ts
git commit -m "feat(meal-plan): start linked cooking sessions"
```

Expected: 周菜单和查询测试 PASS；非法 ID 不影响普通烹饪入口。

---

### Task 7: 在菜谱详情展示统计和最近记录

**Files:**
- Create: `src/features/cooking-history/components/cooking-history-section.tsx`
- Create: `src/features/cooking-history/components/cooking-history-section.test.tsx`
- Modify: `src/app/(app)/recipes/[recipeId]/page.tsx`
- Modify: `src/features/recipes/components/recipe-detail.tsx`
- Modify: `src/features/recipes/components/recipe-detail.test.tsx`

**Interfaces:**
- Consumes: `getRecipeCookingHistory()` 和 `RecipeCookingHistory`。
- Produces: 菜谱详情的空状态、累计次数、平均分、最近三次记录、签名照片与最近“下次注意”。

- [ ] **Step 1: 写历史区块失败测试**

空状态断言：

```ts
expect(screen.getByRole("heading", { name: "烹饪记录" })).toBeInTheDocument();
expect(screen.getByText("完成一次引导烹饪后，这里会留下你的经验")).toBeInTheDocument();
```

有数据时 fixture 包含 2 次记录、1 次评分、2 张照片，断言：

- “已做 2 次”
- “平均 5.0 星”
- “下次注意：少放盐”
- 实际份数与本地化完成日期
- 每张照片有 `alt="番茄炒蛋第 1 次成品照片 1"`
- 记录按传入顺序渲染且不超过 3 条

- [ ] **Step 2: 更新 RecipeDetailView 失败测试接口**

把 props 改为：

```ts
type RecipeDetailViewProps = {
  recipe: RecipeDetailValue;
  cookingHistory: RecipeCookingHistory;
};
```

现有测试传入空历史，新增测试传入统计和记录，并断言历史区块位于个人备注之前。

- [ ] **Step 3: 运行详情测试确认失败**

```powershell
npm.cmd test -- src/features/cooking-history/components/cooking-history-section.test.tsx src/features/recipes/components/recipe-detail.test.tsx
```

Expected: FAIL，组件与新 props 尚不存在。

- [ ] **Step 4: 实现只读历史区块**

组件 props：

```ts
type CookingHistorySectionProps = {
  recipeTitle: string;
  history: RecipeCookingHistory;
};
```

日期使用 `Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })`。评分使用文本星级和 `aria-label`，不只依赖图标。照片使用当前项目相同的私有签名 URL `<img>` 方式，并保留现有性能 warning 说明；本模块不同时重构全部历史图片为 Next Image。

- [ ] **Step 5: 并行加载菜谱与历史**

详情 page 先解析 `recipeId`，并行调用：

```ts
const [recipe, cookingHistory, { user }] = await Promise.all([
  getRecipeDetail(recipeId),
  getRecipeCookingHistory(recipeId),
  getServerAuthContext(),
]);
```

如果菜谱不存在仍 `notFound()`。把 `cookingHistory` 传给 `RecipeDetailView`，再由其渲染 `CookingHistorySection`。

- [ ] **Step 6: 运行测试并提交详情展示**

```powershell
npm.cmd test -- src/features/cooking-history/components/cooking-history-section.test.tsx src/features/recipes/components/recipe-detail.test.tsx src/features/cooking-history/queries.test.ts
npm.cmd run typecheck
git add -- 'src/app/(app)/recipes/[recipeId]/page.tsx' src/features/recipes/components/recipe-detail.tsx src/features/recipes/components/recipe-detail.test.tsx src/features/cooking-history/components/cooking-history-section.tsx src/features/cooking-history/components/cooking-history-section.test.tsx
git commit -m "feat(recipe): show cooking history insights"
```

Expected: 详情与查询测试 PASS；现有菜谱内容继续显示。

---

### Task 8: 模块级文档、全量验证、推送和验收门禁

**Files:**
- Create: `docs/testing/module-9-cooking-history-acceptance.md`
- Modify: `package.json`
- Modify: `README.md`
- Review: all files changed since `55748bd`

**Interfaces:**
- Consumes: Tasks 1–7 的完整模块。
- Produces: 可安全执行 Supabase 迁移并进行 Vercel Preview 验收的功能分支；不自动发布 Production。

- [ ] **Step 1: 增加模块测试脚本**

`package.json` 增加：

```json
"test:history": "vitest run src/features/cooking-history src/features/cooking/components/cooking-screen.test.tsx src/features/meal-plans src/features/recipes/components/recipe-detail.test.tsx src/test/database/cooking-history-migration.test.ts src/test/database/cooking-history-security.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism"
```

不改变现有脚本和依赖版本。

- [ ] **Step 2: 编写人工验收文档**

`module-9-cooking-history-acceptance.md` 使用以下固定场景：

1. 普通菜谱完成，不填可选字段。
2. 同一菜谱第二次完成，5 星、2 张照片、“下次少放盐”。
3. 周菜单四人份入口，验证默认份数和菜单状态完成。
4. 上传失败与数据库失败，验证本地会话保留。
5. 菜谱/菜单物理删除后的历史关系。
6. 第二用户越权隔离。
7. 手机和桌面视口、键盘星级、图片移除和错误恢复。

每项写明前置条件、操作步骤、预期结果和通过记录位置。

- [ ] **Step 3: 更新 README 功能说明**

加入“烹饪完成复盘、私有成品照片、平均评分、下次注意和周菜单联动”。明确完整历史中心、记录编辑和离线同步尚未提供。

- [ ] **Step 4: 运行针对性测试**

```powershell
npm.cmd run test:history
```

Expected: cooking-history、cooking、meal-plans、recipe detail 和两份数据库测试全部 PASS。

- [ ] **Step 5: 运行完整质量门禁**

依次运行并记录退出码：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism
npm.cmd run build
```

Expected: 所有命令退出码为 0。可以记录现有 `<img>` 与 workspace root warning，但不得隐藏新错误。

- [ ] **Step 6: 检查差异和敏感信息**

```powershell
git diff --check 55748bd..HEAD
git status --short
git diff --stat 55748bd..HEAD
git diff --name-only 55748bd..HEAD
rg -n "sk-[A-Za-z0-9]|AIza[A-Za-z0-9_-]{20,}|service_role|DASHSCOPE_API_KEY=.*|GEMINI_API_KEY=.*" . --glob '!node_modules/**' --glob '!.next/**' --glob '!docs/superpowers/plans/**'
```

Expected: 无空白错误、无真实密钥、无 `.env`、无临时截图或调试文件；变更只覆盖本计划范围。

- [ ] **Step 7: 提交文档和脚本**

```powershell
git add package.json README.md docs/testing/module-9-cooking-history-acceptance.md
git commit -m "docs(cooking-history): add acceptance guide"
```

- [ ] **Step 8: 检查完整模块提交并推送功能分支**

```powershell
git status --short --branch
git log --oneline 55748bd..HEAD
git push origin feat/recipe-app-shopping
```

Expected: 工作树干净，推送成功到 `feat/recipe-app-shopping`；不创建 PR，不推送 main。

- [ ] **Step 9: 暂停并请求正式 Supabase 迁移确认**

汇报：

- CLI 实际生成的 `_cooking_history.sql` 完整文件名。
- 当前 `supabase/.temp/project-ref` 与准备执行的项目 ref。
- 迁移是否包含 drop/truncate/delete；预期应为否。
- 新表、函数、RLS、授权和测试证据。
- 当前分支、全部 commits、GitHub 分支链接和 Preview 部署状态。

没有用户对该 SQL 文件和当前项目 ref 的明确确认，不执行远程迁移。

- [ ] **Step 10: 获得确认后执行迁移与数据库只读核验**

先通过 `npx.cmd supabase db --help` 和对应子命令 `--help` 核对当前 CLI 语法。再次验证链接项目 ref 与用户确认值一致，再执行唯一已确认的 migration。完成后只读检查：

- 两表存在且 forced RLS 为 true。
- authenticated grants 与 anon revoke 正确。
- 两个函数为 security invoker 且仅 authenticated 可执行。
- 菜谱与菜单 `ON DELETE SET NULL` 行为正确。
- 插入测试记录后只有当前用户可见；清理所有验收测试数据。

- [ ] **Step 11: Preview 回归验收并暂停**

在 Vercel Preview 使用手机和桌面视口执行验收文档，至少验证普通完成、带照片评分完成、周菜单联动、失败恢复、详情统计和用户隔离。记录 Preview URL、部署 commit、结果与任何 warning。

Preview 验收通过后按照模块交付格式汇报并暂停。Production 发布必须等待新的明确确认；不得因为 Preview 通过自动发布正式站。

---

## Completion Report Template

实现完成后按以下格式汇报：

1. 本模块完成的功能；
2. 修改或新增的文件；
3. 数据库、API、Storage 或配置变更；
4. 已完成的测试和验证；
5. 当前已知问题或需要注意的地方；
6. 可以继续开发的下一个模块：模块 10“AI 导入质量增强”；
7. Git 分支、Commit ID、Commit 信息、推送结果和 GitHub 分支链接；
8. 当前等待确认的事项：Supabase 迁移、Preview 验收或 Production 发布。
