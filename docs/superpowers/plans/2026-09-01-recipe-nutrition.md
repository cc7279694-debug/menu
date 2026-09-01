# 食序 ORDINE 营养与饮食目标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为个人菜谱增加每份热量和三大营养素的可编辑记录、AI 估算审核、饮食目标快捷标签与筛选，并让在线和离线菜谱一致展示。

**Architecture:** 新增受强制 RLS 保护的一对一 `recipe_nutrition` 表，并扩展现有 `save_recipe` RPC，以一个事务保存或清除营养数据。饮食目标继续复用已有 `tags`/`recipe_tags`；AI 导入扩展现有 draft 和 fieldChecks，所有 AI 营养数据强制标记为估算。

**Tech Stack:** Next.js 15 App Router、React、TypeScript、Tailwind CSS、shadcn/ui、Zod、Supabase PostgreSQL/Auth/RLS、Vitest、Testing Library、PGlite、Vercel

**Spec:** `docs/superpowers/specs/2026-09-01-recipe-nutrition-design.md`

## Global Constraints

- 只保存每份营养：`caloriesKcal`、`proteinGrams`、`fatGrams`、`carbsGrams` 和 `isEstimated`。
- 四项全部为空时数据库中不保留空营养行；部分字段和数值 0 合法。
- 热量范围 0–100000 kcal；蛋白质、脂肪、碳水范围 0–10000 g。
- AI 导入只要产生任一营养值，`isEstimated` 必须为 `true`，并进入现有审核确认门禁。
- 食材用量或份数不足时 AI 必须返回空营养值和 warning，不得静默编造。
- “减脂”“增肌”“高蛋白”继续使用现有标签，不新增饮食目标表，不自动依据营养阈值判定标签。
- Qwen 3.8 Flash 继续为默认模型；不增加或切换 AI 服务商。
- 不接入付费营养数据库，不提供医疗、疾病、减重承诺或个性化营养建议。
- 新表启用并强制 RLS，撤销 `public`/`anon`，显式授权 `authenticated`；UPDATE 同时使用 `USING` 与 `WITH CHECK`。
- 数据库函数使用 `SECURITY INVOKER` 和 `set search_path = ''`，不能用 `SECURITY DEFINER` 绕过 RLS。
- 新 migration 必须通过 `npx.cmd supabase migration new recipe_nutrition` 生成，不能手写时间戳。
- 正式执行 migration 前再次确认 Supabase 项目 `brmqydfrtbggkdxlcoln`；Production 发布另行确认。
- 不推送 `main`、不创建或合并 PR；只推送 `feat/recipe-app-shopping`。
- 不提交 `.env`、API Key、Token、密码、模型原始响应或用户来源全文。

---

## File Structure

### Create

- 通过 CLI 创建 `supabase/migrations/*_recipe_nutrition.sql`：一对一营养表、RLS、grants、策略、保存 RPC 与列表 RPC 更新。
- `src/test/database/recipe-nutrition-migration.test.ts`：结构、约束、权限、函数属性测试。
- `src/test/database/recipe-nutrition-security.test.ts`：RLS、越权、保存原子性和删除测试。
- `src/features/nutrition/constants.ts`：单位、范围、快捷饮食目标标签。
- `src/features/nutrition/types.ts`：营养领域类型。
- `src/features/nutrition/schemas.ts`：营养输入校验与全空归一化。
- `src/features/nutrition/schemas.test.ts`：空值、0、小数、上限和非法输入测试。
- `src/features/nutrition/format.ts`：数值、单位和估算前缀格式化。
- `src/features/nutrition/format.test.ts`：整数、小数、估算和空值格式测试。
- `src/features/nutrition/components/recipe-nutrition-editor.tsx`：营养表单。
- `src/features/nutrition/components/recipe-nutrition-editor.test.tsx`：输入与无障碍测试。
- `src/features/nutrition/components/recipe-nutrition-card.tsx`：在线/离线只读营养卡片。
- `src/features/nutrition/components/recipe-nutrition-card.test.tsx`：部分值、估算和免责声明测试。
- `src/features/nutrition/components/diet-goal-tags.tsx`：编辑器快捷标签。
- `src/features/nutrition/components/diet-goal-tags.test.tsx`：已有/新建标签和重复点击测试。
- `src/features/nutrition/components/diet-goal-filters.tsx`：列表快捷筛选。
- `src/features/nutrition/components/diet-goal-filters.test.tsx`：URL 参数和选中状态测试。
- `docs/testing/module-12-recipe-nutrition-acceptance.md`：Preview 验收清单。

### Modify

- `src/test/database/load-migrations.ts`
- `src/lib/supabase/database.types.ts`
- `src/features/recipes/types.ts`
- `src/features/recipes/schemas.ts`
- `src/features/recipes/schemas.test.ts`
- `src/features/recipes/editor-value.ts`
- `src/features/recipes/queries.ts`
- `src/features/recipes/queries.test.ts`
- `src/features/recipes/actions.test.ts`
- `src/features/recipes/components/recipe-editor.tsx`
- `src/features/recipes/components/recipe-editor.test.tsx`
- `src/features/recipes/components/recipe-detail.tsx`
- `src/features/recipes/components/recipe-detail.test.tsx`
- `src/features/recipes/components/recipe-card.tsx`
- `src/features/recipes/components/recipe-search-filters.tsx`
- `src/features/recipes/components/recipe-list-page.tsx`
- `src/features/recipes/components/recipe-pagination.tsx`
- `src/features/recipe-imports/schemas.ts`
- `src/features/recipe-imports/schemas.test.ts`
- `src/features/recipe-imports/recipe-ai-shared.ts`
- `src/features/recipe-imports/recipe-ai-shared.test.ts`
- `src/features/recipe-imports/quality-review.ts`
- `src/features/recipe-imports/quality-review.test.ts`
- `src/features/recipe-imports/draft-mapping.ts`
- `src/features/recipe-imports/draft-mapping.test.ts`
- `src/features/recipe-imports/qianwen-extractor.test.ts`
- `src/features/recipe-imports/gemini-extractor.test.ts`
- `src/features/recipe-imports/components/recipe-import-review.tsx`
- `src/features/recipe-imports/components/recipe-import-review.test.tsx`
- `src/features/offline/types.ts`
- `src/features/offline/database.ts`
- `src/features/offline/database.test.ts`
- `src/features/offline/recipe-snapshot.ts`
- `src/features/offline/recipe-snapshot.test.ts`
- `src/features/offline/components/offline-recipe-detail.tsx`
- `src/features/offline/components/offline-app.test.tsx`
- `package.json`
- `README.md`

---

### Task 1: 建立私有营养数据表和原子保存边界

**Files:**
- Create via CLI: `supabase/migrations/*_recipe_nutrition.sql`
- Create: `src/test/database/recipe-nutrition-migration.test.ts`
- Create: `src/test/database/recipe-nutrition-security.test.ts`
- Modify: `src/test/database/load-migrations.ts`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: `public.recipes(user_id, id)`、`public.set_updated_at()`、`public.save_recipe(jsonb)`、`public.search_recipe_summaries(...)`。
- Produces: `public.recipe_nutrition`；扩展后的 `save_recipe` payload `nutrition`；列表结果 `nutrition jsonb`。

- [ ] **Step 1: 使用 Supabase CLI 创建 migration**

```powershell
npx.cmd supabase --version
npx.cmd supabase migration --help
npx.cmd supabase migration new recipe_nutrition
```

Expected: CLI 只创建一个以 `_recipe_nutrition.sql` 结尾的文件。记录实际路径，后续只编辑该文件。

- [ ] **Step 2: 先写失败的迁移结构测试**

在 `load-migrations.ts` 增加加载函数：

```ts
export async function loadRecipeNutritionMigrations(database: PGlite) {
  await loadCookingHistoryMigrations(database);
  await loadSingleMigration(database, "_recipe_nutrition.sql", "recipe nutrition");
}
```

`recipe-nutrition-migration.test.ts` 至少断言：

```ts
expect(tableFlags.rows).toEqual([
  { relname: "recipe_nutrition", rowsecurity: true, force: true },
]);

expect(columns.rows).toEqual(expect.arrayContaining([
  expect.objectContaining({ column_name: "calories_kcal", data_type: "numeric" }),
  expect.objectContaining({ column_name: "protein_grams", data_type: "numeric" }),
  expect.objectContaining({ column_name: "fat_grams", data_type: "numeric" }),
  expect.objectContaining({ column_name: "carbs_grams", data_type: "numeric" }),
  expect.objectContaining({ column_name: "is_estimated", data_type: "boolean" }),
]));
```

继续断言所有权外键、至少一项非空约束、四个范围约束、更新时间触发器、显式 grants、四条 owner-only 策略和 `save_recipe` 仍为 `SECURITY INVOKER`。

- [ ] **Step 3: 先写失败的 RLS 和原子保存测试**

固定两个用户和两个菜谱，覆盖：

```ts
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const recipeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recipeB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
```

测试 owner 可写入和更新；userB 查询为空、更新 0 行、跨用户关联失败；anon 查询报权限错误；部分字段和 0 合法；四项全空、负数和超上限失败。

通过 `save_recipe` 测试：

```ts
nutrition: {
  caloriesKcal: 320,
  proteinGrams: 28,
  fatGrams: null,
  carbsGrams: null,
  isEstimated: true,
}
```

再次以 `nutrition: null` 保存同一菜谱后，断言营养行被删除。再构造非法营养值，断言菜谱标题和营养数据均未部分更新。

- [ ] **Step 4: 运行数据库测试并确认红灯**

```powershell
npm.cmd test -- src/test/database/recipe-nutrition-migration.test.ts src/test/database/recipe-nutrition-security.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，因为 `recipe_nutrition` 尚不存在；不能通过删断言让测试变绿。

- [ ] **Step 5: 实现表、约束、RLS 和 grants**

CLI 生成的 migration 使用以下核心结构：

```sql
create table public.recipe_nutrition (
  user_id uuid not null,
  recipe_id uuid not null,
  calories_kcal numeric(8,2),
  protein_grams numeric(8,2),
  fat_grams numeric(8,2),
  carbs_grams numeric(8,2),
  is_estimated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_nutrition_pkey primary key (user_id, recipe_id),
  constraint recipe_nutrition_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint recipe_nutrition_has_value check (
    calories_kcal is not null or protein_grams is not null
    or fat_grams is not null or carbs_grams is not null
  ),
  constraint recipe_nutrition_calories_range check (calories_kcal is null or calories_kcal between 0 and 100000),
  constraint recipe_nutrition_protein_range check (protein_grams is null or protein_grams between 0 and 10000),
  constraint recipe_nutrition_fat_range check (fat_grams is null or fat_grams between 0 and 10000),
  constraint recipe_nutrition_carbs_range check (carbs_grams is null or carbs_grams between 0 and 10000)
);
```

添加更新时间触发器、强制 RLS、显式 revoke/grant 和四条 owner-only 策略。策略使用 `to authenticated` 与 `(select auth.uid()) = user_id`，UPDATE 同时包含 `USING`、`WITH CHECK`。

- [ ] **Step 6: 扩展 `save_recipe` 和列表 RPC**

在 `save_recipe` 完成现有子资源保存后解析 `p_payload->'nutrition'`：

```sql
if p_payload->'nutrition' is null
  or p_payload->'nutrition' = 'null'::jsonb then
  delete from public.recipe_nutrition
  where recipe_id = v_recipe_id and user_id = v_user_id;
else
  insert into public.recipe_nutrition (...)
  values (...)
  on conflict (user_id, recipe_id) do update set
    calories_kcal = excluded.calories_kcal,
    protein_grams = excluded.protein_grams,
    fat_grams = excluded.fat_grams,
    carbs_grams = excluded.carbs_grams,
    is_estimated = excluded.is_estimated;
end if;
```

保持 `save_recipe` 现有函数签名和权限。扩展 `search_recipe_summaries` 返回列 `nutrition jsonb`，使用相关子查询构造 camelCase JSON；参数不变，饮食目标继续通过 `p_tag_id` 过滤。

由于 PostgreSQL 不允许 `CREATE OR REPLACE FUNCTION` 直接改变表返回列，migration 必须在同一事务内按以下顺序处理列表函数：

```sql
revoke all on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer)
from public, anon, authenticated;
drop function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer);
```

重新创建时完整保留当前七个参数、`params`/`filtered`/`paged` CTE、排序、分页和现有返回列，在 `tags` 后增加 `nutrition jsonb`。最终查询增加：

```sql
case when n.recipe_id is null then null else pg_catalog.jsonb_build_object(
  'caloriesKcal', n.calories_kcal,
  'proteinGrams', n.protein_grams,
  'fatGrams', n.fat_grams,
  'carbsGrams', n.carbs_grams,
  'isEstimated', n.is_estimated
) end as nutrition
```

并在最终 `from paged p` 后增加：

```sql
left join public.recipe_nutrition n
  on n.user_id = p.user_id and n.recipe_id = p.id
```

函数创建完成后恢复权限：

```sql
revoke all on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer)
from public, anon;
grant execute on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer)
to authenticated;
```

不得改参数顺序或新增必填参数；旧 Production 调用在 migration 后仍使用相同 payload，并忽略新增返回字段。迁移结构测试必须断言函数仍有七个参数并新增 `nutrition` 返回列。

- [ ] **Step 7: 更新本地 Supabase 类型并运行测试**

更新 `database.types.ts` 中 `recipe_nutrition` Row/Insert/Update/Relationships，以及 `search_recipe_summaries` 返回类型。不得使用 `any` 绕过类型。

```powershell
npm.cmd test -- src/test/database/recipe-nutrition-migration.test.ts src/test/database/recipe-nutrition-security.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: 结构、约束、权限、原子保存和越权测试全部通过。

- [ ] **Step 8: 提交数据库边界**

```powershell
git add supabase/migrations src/test/database src/lib/supabase/database.types.ts
git commit -m "feat(nutrition): add private recipe nutrition data"
```

Expected: 只提交 migration、数据库测试、加载器和生成类型；不执行远程 migration。

---

### Task 2: 建立营养领域类型、校验和查询映射

**Files:**
- Create: `src/features/nutrition/constants.ts`
- Create: `src/features/nutrition/types.ts`
- Create: `src/features/nutrition/schemas.ts`
- Create: `src/features/nutrition/schemas.test.ts`
- Create: `src/features/nutrition/format.ts`
- Create: `src/features/nutrition/format.test.ts`
- Modify: `src/features/recipes/types.ts`
- Modify: `src/features/recipes/schemas.ts`
- Modify: `src/features/recipes/schemas.test.ts`
- Modify: `src/features/recipes/editor-value.ts`
- Modify: `src/features/recipes/queries.ts`
- Modify: `src/features/recipes/queries.test.ts`
- Modify: `src/features/recipes/actions.test.ts`

**Interfaces:**
- Produces: `RecipeNutrition`、`RecipeNutritionInput`、`normalizeRecipeNutrition()`、`formatNutritionValue()`、`DIET_GOAL_TAG_NAMES`。
- Changes: `RecipeSaveInput.nutrition`、`RecipeSummary.nutrition`、`RecipeDetail.nutrition`。

- [ ] **Step 1: 写失败的 schema 与格式化测试**

固定接口：

```ts
export type RecipeNutrition = {
  caloriesKcal: number | null;
  proteinGrams: number | null;
  fatGrams: number | null;
  carbsGrams: number | null;
  isEstimated: boolean;
};

export const DIET_GOAL_TAG_NAMES = ["减脂", "增肌", "高蛋白"] as const;
```

测试 `normalizeRecipeNutrition()`：

- 四项空字符串/`NaN`/`null` 归一为 `null` 整体。
- `{ caloriesKcal: 0 }` 保留为合法营养对象。
- 小数最多保存两位数据库精度，不在客户端擅自截断输入。
- 负数、无穷大和超过上限返回 Zod 错误。

测试格式化：整数显示 `320`，`28.50` 显示 `28.5`，估算显示 `约 320 千卡`，缺失返回 `null`。

- [ ] **Step 2: 运行测试确认红灯**

```powershell
npm.cmd test -- src/features/nutrition/schemas.test.ts src/features/nutrition/format.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，因为营养模块尚不存在。

- [ ] **Step 3: 实现领域类型与校验**

`schemas.ts` 使用可复用的空值预处理：

```ts
const optionalNutritionNumber = (max: number) => z.preprocess(
  (value) => value === "" || value === undefined || Number.isNaN(value) ? null : value,
  z.number().finite().min(0).max(max).nullable(),
);

export const recipeNutritionInputSchema = z.object({
  caloriesKcal: optionalNutritionNumber(100000),
  proteinGrams: optionalNutritionNumber(10000),
  fatGrams: optionalNutritionNumber(10000),
  carbsGrams: optionalNutritionNumber(10000),
  isEstimated: z.boolean().default(true),
});
```

`normalizeRecipeNutrition()` 在四项全空时返回 `null`，否则返回解析后的对象。不要把 `0` 当成空值。

- [ ] **Step 4: 扩展菜谱 schema、默认值和类型**

`recipeSaveInputSchema` 增加：

```ts
nutrition: recipeNutritionInputSchema.nullable().default(null),
```

普通新建默认 `nutrition: null`；`recipeDetailToSaveInput()` 原样带入详情营养数据。确保所有测试 fixture 同步增加 `nutrition: null` 或具体对象。

- [ ] **Step 5: 扩展查询映射**

新增安全映射函数：

```ts
export function mapRecipeNutrition(value: unknown): RecipeNutrition | null;
```

它必须用 Zod 验证 RPC JSON 或表行，安全转换 Supabase numeric 字符串为 number；任何非法结构抛出当前查询层可处理的错误，不能把任意 JSON 暴露给 UI。

列表映射读取 RPC 的 `nutrition`。详情查询并行读取：

```ts
supabase
  .from("recipe_nutrition")
  .select("calories_kcal, protein_grams, fat_grams, carbs_grams, is_estimated")
  .eq("recipe_id", recipeId)
  .eq("user_id", user.id)
  .maybeSingle();
```

不存在记录映射为 `null`；查询错误沿用“菜谱详情暂时无法加载”，不能误当作空数据。

- [ ] **Step 6: 运行领域与菜谱回归测试**

```powershell
npm.cmd test -- src/features/nutrition src/features/recipes/schemas.test.ts src/features/recipes/queries.test.ts src/features/recipes/actions.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: 营养校验、查询映射、普通菜谱保存和旧菜谱无营养回归全部通过。

- [ ] **Step 7: 提交领域边界**

```powershell
git add src/features/nutrition src/features/recipes/types.ts src/features/recipes/schemas.ts src/features/recipes/schemas.test.ts src/features/recipes/editor-value.ts src/features/recipes/queries.ts src/features/recipes/queries.test.ts src/features/recipes/actions.test.ts
git commit -m "feat(nutrition): model per-serving nutrition"
```

---

### Task 3: 集成营养编辑、详情和菜谱卡片

**Files:**
- Create: `src/features/nutrition/components/recipe-nutrition-editor.tsx`
- Create: `src/features/nutrition/components/recipe-nutrition-editor.test.tsx`
- Create: `src/features/nutrition/components/recipe-nutrition-card.tsx`
- Create: `src/features/nutrition/components/recipe-nutrition-card.test.tsx`
- Modify: `src/features/recipes/components/recipe-editor.tsx`
- Modify: `src/features/recipes/components/recipe-editor.test.tsx`
- Modify: `src/features/recipes/components/recipe-detail.tsx`
- Modify: `src/features/recipes/components/recipe-detail.test.tsx`
- Modify: `src/features/recipes/components/recipe-card.tsx`

**Interfaces:**
- Consumes: React Hook Form `RecipeSaveInput`、`RecipeNutrition`、`formatNutritionValue()`。
- Produces: `RecipeNutritionEditor` 与 `RecipeNutritionCard`。

- [ ] **Step 1: 写失败的编辑器测试**

断言：

```tsx
expect(screen.getByRole("heading", { name: "每份营养" })).toBeInTheDocument();
expect(screen.getByLabelText("热量（千卡）")).toHaveValue(320);
expect(screen.getByLabelText("这些数值是估算值")).toBeChecked();
```

覆盖普通新建四项为空、编辑加载部分值、输入 0、非法负数、全部清空提交为 `nutrition:null`、保存时不重复提交。估算说明必须通过 `aria-describedby` 关联。

- [ ] **Step 2: 写失败的只读卡片测试**

覆盖：

- `nutrition=null` 返回 `null`，详情不显示空卡片。
- 只有热量和蛋白质时只显示两项。
- 估算数据显示“估算”“约 320 千卡”和免责声明。
- 非估算数据显示“320 千卡”，不加“约”。
- 定义列表包含可访问的项目名称和值。

- [ ] **Step 3: 运行组件测试确认红灯**

```powershell
npm.cmd test -- src/features/nutrition/components/recipe-nutrition-editor.test.tsx src/features/nutrition/components/recipe-nutrition-card.test.tsx src/features/recipes/components/recipe-editor.test.tsx src/features/recipes/components/recipe-detail.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，因为营养 UI 尚未实现。

- [ ] **Step 4: 实现营养编辑器**

`RecipeNutritionEditor` 接收 `control`、`register`、`errors`、`watch` 和 `setValue`，使用两列手机/四列桌面网格。任何营养字段第一次获得值时，如果估算标记未被用户主动修改，保持 `true`。

表单提交前调用 `normalizeRecipeNutrition()`，不能把四个 `NaN` 传给 Server Action。

- [ ] **Step 5: 实现只读卡片并接入详情**

在 `RecipePreparationList` 后、食材与步骤区域前渲染：

```tsx
<RecipeNutritionCard nutrition={recipe.nutrition} />
```

使用统一展示配置，不在详情组件重复单位或格式化逻辑。

- [ ] **Step 6: 在菜谱卡片显示紧凑摘要**

只显示可用的热量和蛋白质：

```tsx
{nutritionSummary && (
  <p className="text-sm text-muted-foreground">{nutritionSummary}</p>
)}
```

卡片不展示脂肪和碳水，不新增图表，保证手机列表密度。

- [ ] **Step 7: 运行 UI 回归测试**

```powershell
npm.cmd test -- src/features/nutrition/components src/features/recipes/components/recipe-editor.test.tsx src/features/recipes/components/recipe-detail.test.tsx src/features/recipes/components/recipe-list.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: 创建、编辑、清空、详情、列表和无营养回归全部通过。

- [ ] **Step 8: 提交 UI 集成**

```powershell
git add src/features/nutrition/components src/features/recipes/components
git commit -m "feat(nutrition): add recipe nutrition interface"
```

---

### Task 4: 增加饮食目标快捷标签和筛选

**Files:**
- Create: `src/features/nutrition/components/diet-goal-tags.tsx`
- Create: `src/features/nutrition/components/diet-goal-tags.test.tsx`
- Create: `src/features/nutrition/components/diet-goal-filters.tsx`
- Create: `src/features/nutrition/components/diet-goal-filters.test.tsx`
- Modify: `src/features/recipes/components/recipe-editor.tsx`
- Modify: `src/features/recipes/components/recipe-editor.test.tsx`
- Modify: `src/features/recipes/components/recipe-search-filters.tsx`
- Modify: `src/features/recipes/components/recipe-list-page.tsx`
- Modify: `src/features/recipes/components/recipe-pagination.tsx`
- Modify: `src/features/recipes/query-params.test.ts`

**Interfaces:**
- Consumes: `DIET_GOAL_TAG_NAMES`、现有 `createTagAction()`、`tagIds`、`RecipeListQuery.tagId`。
- Produces: 快捷选择和筛选组件；不增加数据库表或 URL 参数。

- [ ] **Step 1: 写失败的快捷标签测试**

覆盖三种状态：

1. 标签已存在且未选中：点击后只把现有 ID 加入 `tagIds`。
2. 标签已存在且已选中：点击后只移除该 ID。
3. 标签不存在：按钮显示“创建并选择高蛋白”，点击只调用一次 `createTagAction("高蛋白")`，成功后加入返回 ID，失败时显示错误且不改变选择。

重复点击和请求进行中不得创建重复标签。

- [ ] **Step 2: 写失败的筛选测试**

给定当前 tags 包含“高蛋白”和“快手”，只渲染固定目标中的“高蛋白”快捷筛选；链接复用：

```text
/recipes?tag=<existing-tag-id>
```

当前 `tagId` 相同时提供“清除饮食目标筛选”，并保留 `q`、`category`、`favorite`、`view`，重置 `page` 为 1。

- [ ] **Step 3: 运行测试确认红灯**

```powershell
npm.cmd test -- src/features/nutrition/components/diet-goal-tags.test.tsx src/features/nutrition/components/diet-goal-filters.test.tsx src/features/recipes/components/recipe-editor.test.tsx src/features/recipes/query-params.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，因为快捷组件尚不存在。

- [ ] **Step 4: 实现并接入编辑器**

`DietGoalTags` 使用 `aria-pressed` 按钮和现有创建动作。成功创建后，把新 tag 加入编辑器本地 options，并更新 `tagIds`；不在页面加载时自动创建任何标签。

普通标签复选框和“新建标签”输入保持不变，快捷标签只是同一 `tagIds` 的更友好入口。

- [ ] **Step 5: 实现列表快捷筛选**

`DietGoalFilters` 从 `tags` 按名称匹配固定目标。链接生成复用一个纯函数，确保分页、收藏页和回收站状态正确。现有标签 `<select name="tag">` 保持可用，两者选中状态一致。

- [ ] **Step 6: 运行快捷标签与列表回归**

```powershell
npm.cmd test -- src/features/nutrition/components/diet-goal-tags.test.tsx src/features/nutrition/components/diet-goal-filters.test.tsx src/features/recipes/components/recipe-editor.test.tsx src/features/recipes/query-params.test.ts src/features/recipes/components/recipe-list.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: 创建/复用标签、快捷筛选、普通标签筛选和分页状态全部通过。

- [ ] **Step 7: 提交饮食目标体验**

```powershell
git add src/features/nutrition/components/diet-goal-* src/features/recipes/components src/features/recipes/query-params.test.ts
git commit -m "feat(nutrition): add diet goal shortcuts"
```

---

### Task 5: 将营养估算接入 AI 导入审核

**Files:**
- Modify: `src/features/recipe-imports/schemas.ts`
- Modify: `src/features/recipe-imports/schemas.test.ts`
- Modify: `src/features/recipe-imports/recipe-ai-shared.ts`
- Modify: `src/features/recipe-imports/recipe-ai-shared.test.ts`
- Modify: `src/features/recipe-imports/quality-review.ts`
- Modify: `src/features/recipe-imports/quality-review.test.ts`
- Modify: `src/features/recipe-imports/draft-mapping.ts`
- Modify: `src/features/recipe-imports/draft-mapping.test.ts`
- Modify: `src/features/recipe-imports/qianwen-extractor.test.ts`
- Modify: `src/features/recipe-imports/gemini-extractor.test.ts`
- Modify: `src/features/recipe-imports/components/recipe-import-review.tsx`
- Modify: `src/features/recipe-imports/components/recipe-import-review.test.tsx`

**Interfaces:**
- Produces: `RecipeImportModelDraft.nutrition`、`RecipeImportDraft.nutrition`、四条合法 fieldCheck 路径。
- Maps to: `RecipeSaveInput.nutrition`，有任一值时强制 `isEstimated:true`。

- [ ] **Step 1: 写失败的导入 schema 测试**

模型和持久化草稿都增加：

```ts
nutrition: z.object({
  caloriesKcal: modelNullableNumber(0, 100000),
  proteinGrams: modelNullableNumber(0, 10000),
  fatGrams: modelNullableNumber(0, 10000),
  carbsGrams: modelNullableNumber(0, 10000),
}).nullable().default(null),
```

测试部分值、全空对象归一为 `null`、负数和过大值拒绝、旧草稿没有 nutrition 时仍能解析为 `nutrition:null`。

- [ ] **Step 2: 写失败的 fieldChecks 测试**

合法路径固定为：

```text
nutrition.caloriesKcal
nutrition.proteinGrams
nutrition.fatGrams
nutrition.carbsGrams
```

断言 `inferred` 数值被保留且要求确认，`missing` 数值清空；非法 `nutrition.healthScore` 被过滤。营养 checks 在审核面板归入“每份营养”。

- [ ] **Step 3: 写失败的 provider 契约与 mapping 测试**

Qwen 和 Gemini fixture 同时增加营养对象和四条检查。断言共享解析器接受数字 JSON，不接受带单位字符串。

`draft-mapping.test.ts` 断言：

```ts
expect(result.initialValue.nutrition).toEqual({
  caloriesKcal: 320,
  proteinGrams: 28,
  fatGrams: null,
  carbsGrams: 20,
  isEstimated: true,
});
```

草稿 nutrition 全空时映射为 `null`。

- [ ] **Step 4: 运行导入测试确认红灯**

```powershell
npm.cmd test -- src/features/recipe-imports/schemas.test.ts src/features/recipe-imports/recipe-ai-shared.test.ts src/features/recipe-imports/quality-review.test.ts src/features/recipe-imports/draft-mapping.test.ts src/features/recipe-imports/qianwen-extractor.test.ts src/features/recipe-imports/gemini-extractor.test.ts src/features/recipe-imports/components/recipe-import-review.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，因为 draft、提示和审核路径尚未支持营养。

- [ ] **Step 5: 扩展共享 AI 指令和 JSON schema**

共享提示必须明确：

```text
营养值按基础份数换算为每份。只有食材用量和份数足以支持估算时才填写；无法可靠估算的项目返回 null 并写入 warnings。不要输出减肥、增肌效果或医疗建议。为四个营养字段分别返回 fieldChecks。
```

保持 Qwen 3.8 Flash 模型名、路由和超时逻辑不变。不得记录原始模型响应。

- [ ] **Step 6: 扩展质量审核**

`rootPaths` 加入四个营养路径；`fieldLabel()` 返回“每份热量”“每份蛋白质”等。`createMissingChecks()` 在 nutrition 存在时补齐四条检查。

归一化规则：

- `missing` 对应字段清空。
- `explicit` 与 `inferred` 数值均保留。
- 四项最终全空时 nutrition 归一为 `null`。
- `inferred`/`missing` 继续触发 `requiresConfirmation`。

- [ ] **Step 7: 扩展 draft mapping 和审核 UI**

将有效营养对象映射到编辑器并强制 `isEstimated:true`。审核面板增加“每份营养”分组，不新增第二个确认复选框。

普通新建/编辑和旧导入任务不显示营养审核项，现有保存门禁行为不变。

- [ ] **Step 8: 运行完整导入门禁**

```powershell
npm.cmd run test:imports
npm.cmd test -- src/features/recipes/components/recipe-editor.test.tsx src/features/recipe-imports/draft-mapping.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: Qwen、Gemini、自动模式、旧草稿、fieldChecks、确认门禁和营养映射全部通过。

- [ ] **Step 9: 提交 AI 营养估算**

```powershell
git add src/features/recipe-imports src/features/recipes/components/recipe-editor.test.tsx
git commit -m "feat(recipe-import): review nutrition estimates"
```

---

### Task 6: 同步离线快照与离线详情

**Files:**
- Modify: `src/features/offline/types.ts`
- Modify: `src/features/offline/database.ts`
- Modify: `src/features/offline/database.test.ts`
- Modify: `src/features/offline/recipe-snapshot.ts`
- Modify: `src/features/offline/recipe-snapshot.test.ts`
- Modify: `src/features/offline/components/offline-recipe-detail.tsx`
- Modify: `src/features/offline/components/offline-app.test.tsx`

**Interfaces:**
- Changes: `OfflineRecipeSnapshot.dataVersion` 从 2 升到 3。
- Reuses: `RecipeNutritionCard`，离线不请求任何营养接口。

- [ ] **Step 1: 写失败的快照版本与显示测试**

断言新版快照：

```ts
expect(snapshot.dataVersion).toBe(3);
expect(snapshot.recipe.nutrition).toEqual(recipe.nutrition);
```

数据库兼容测试断言 version 2 返回不兼容并被忽略，version 3 可读取。离线详情存在营养时显示同一“每份营养”卡片，无营养时不显示。

- [ ] **Step 2: 运行离线测试确认红灯**

```powershell
npm.cmd test -- src/features/offline/database.test.ts src/features/offline/recipe-snapshot.test.ts src/features/offline/components/offline-app.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL，因为当前只接受 dataVersion 2 且离线详情未显示营养。

- [ ] **Step 3: 升级快照并复用营养卡片**

将类型、构建函数和兼容判断统一改为 3；保持旧快照忽略策略，不写 IndexedDB 迁移。`sanitizeOfflineRecipe()` 保留营养数值，不允许未知字段穿透。

离线详情直接渲染 `RecipeNutritionCard`，不复制格式化逻辑。

- [ ] **Step 4: 运行离线与 PWA 回归**

```powershell
npm.cmd test -- src/features/offline --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: 新快照、旧版本清理、离线详情、购物离线队列均通过。

- [ ] **Step 5: 提交离线同步**

```powershell
git add src/features/offline
git commit -m "feat(offline): cache recipe nutrition"
```

---

### Task 7: 补齐文档、完整验证并推送 Preview

**Files:**
- Create: `docs/testing/module-12-recipe-nutrition-acceptance.md`
- Modify: `package.json`
- Modify: `README.md`
- Verify: Task 1–6 所有文件

**Interfaces:**
- Produces: `npm.cmd run test:nutrition` 模块门禁。
- Produces: 干净且已推送的 `feat/recipe-app-shopping`，等待 Preview 验收。

- [ ] **Step 1: 添加专项测试命令**

在 `package.json` 增加：

```json
"test:nutrition": "vitest run src/features/nutrition src/test/database/recipe-nutrition-migration.test.ts src/test/database/recipe-nutrition-security.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism"
```

- [ ] **Step 2: 更新 README 和人工验收清单**

README 只记录：每份营养、估算标记、饮食目标标签复用、无付费数据库和免责声明。不得写 API Key、模型响应或用户来源内容。

`module-12-recipe-nutrition-acceptance.md` 使用设计规格第 10 节的 10 个场景，补充手机 360px、桌面、键盘操作和错误恢复检查。

- [ ] **Step 3: 运行专项门禁**

```powershell
npm.cmd run test:nutrition
npm.cmd run test:imports
npm.cmd test -- src/features/recipes src/features/offline --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: 营养、导入、菜谱和离线专项全部通过。

- [ ] **Step 4: 运行完整质量门禁**

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism
npm.cmd run build
```

Expected: 类型检查、Lint、全量 Vitest 和 Production build 退出码均为 0；不得新增图片性能 warning。

- [ ] **Step 5: 检查范围和敏感信息**

```powershell
git status --short
git diff --check
git diff origin/feat/recipe-app-shopping...HEAD --stat
git diff origin/feat/recipe-app-shopping...HEAD | rg -n -i "(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|dashscope[_-]?api[_-]?key\s*[:=]\s*[^$]|service[_-]?role)"
```

Expected: 没有临时文件、无关修改、空白错误、密钥、Token、密码、用户来源正文或模型原始响应。

- [ ] **Step 6: 确认分支和提交历史**

```powershell
git branch --show-current
git log --oneline --decorate -10
git status --short --branch
```

Expected: 当前分支严格为 `feat/recipe-app-shopping`，工作区干净，模块提交只在该功能分支。

- [ ] **Step 7: 推送功能分支**

```powershell
git push origin feat/recipe-app-shopping
```

Expected: 推送成功；不触碰 `main`，不创建 PR，不执行 Production 发布。

- [ ] **Step 8: 在执行远程 migration 前暂停确认**

汇报 CLI 生成的 migration 文件名、当前 Supabase 项目 ref 和本地数据库测试结果，明确询问是否执行到 `brmqydfrtbggkdxlcoln`。未确认不得执行。

- [ ] **Step 9: 获得确认后执行 migration 并验证**

先发现当前 CLI 命令：

```powershell
npx.cmd supabase db --help
npx.cmd supabase migration list --help
```

再使用该版本支持的正式命令执行 migration。执行后查询 `recipe_nutrition` 的 RLS、grants、策略和函数返回列；用当前用户会话完成 owner CRUD，并验证匿名/其他用户不可访问。遇到项目 ref 不一致立即停止。

- [ ] **Step 10: 完成 Preview 人工验收并暂停**

在 Vercel Preview 验证：

1. 手工填写部分营养并保存。
2. 清空全部营养并保存删除。
3. 估算与非估算展示。
4. 快捷创建/选择“高蛋白”并筛选。
5. Qwen 3.8 Flash 导入可估算文案。
6. Qwen 3.8 Flash 导入用量不足文案。
7. 手机 360px 编辑和详情无横向滚动。
8. 离线详情显示营养。
9. 普通菜谱、购物、周菜单和烹饪历史无回归。
10. Preview 控制台和 Vercel 运行日志无新增错误。

通过后按项目模块交付格式汇报全部功能、文件、migration、测试、分支、commit、Preview URL、已知限制，并暂停等待用户验收。Production 发布必须单独明确确认。

---

## Plan Self-Review

- **Spec coverage:** Task 1 覆盖数据库、RLS、grants 与原子保存；Task 2 覆盖领域类型、校验和查询；Task 3 覆盖编辑/详情/卡片；Task 4 覆盖饮食目标标签与筛选；Task 5 覆盖 AI 估算和审核；Task 6 覆盖离线；Task 7 覆盖文档、完整门禁、远程确认和 Preview。
- **Placeholder scan:** migration 文件的 `*` 是 Supabase CLI 必须生成的时间戳路径，不是未决设计项；除此之外没有 TBD、TODO、未定义步骤或“以后实现”。
- **Type consistency:** `RecipeNutrition`、`RecipeSaveInput.nutrition`、`RecipeSummary.nutrition`、AI draft nutrition 和离线 snapshot 使用相同 camelCase 字段；数据库只在映射层使用 snake_case。
- **Scope control:** 不增加付费数据源、AI 服务商、健康评分、每日目标、营养图表、第二套饮食目标表、家庭共享或 Production 自动发布。
- **Security:** 新表显式 grants + 强制 RLS；复合外键保证菜谱所有权；保存使用现有 invoker RPC；远程 migration 和 Production 各自保留明确确认门禁。
