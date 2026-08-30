# 食序 ORDINE 提前准备 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为个人菜谱增加结构化提前准备事项，使用户能在列表、详情和烹饪入口看到腌制、浸泡、解冻等前置任务，并让 AI 导入自动整理来源明确提到的准备要求。

**Architecture:** 新增私有规范化表 `recipe_preparations`，通过现有 `save_recipe(jsonb)` 原子保存菜谱聚合；应用层在 `RecipeSaveInput`、`RecipeDetail`、AI 草稿和离线快照中共享同一准备事项结构。UI 将编辑、展示与烹饪确认拆成聚焦组件，准备完成状态只保存在本地烹饪会话中。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、shadcn/ui、React Hook Form、Zod 4、Supabase PostgreSQL/Auth/RLS、Vitest、Testing Library、PGlite、IndexedDB

**Spec:** `docs/superpowers/specs/2026-08-30-recipe-preparations-design.md`

## Global Constraints

- 保持个人优先，不增加家庭空间、多人权限、周菜单或营养建议。
- 所有代码使用 TypeScript；数据库变更只通过新的 Supabase migration 完成。
- AI 只提取来源明确表达的准备事实，不凭常识补写时间。
- 精确提前时间统一存为整数分钟，范围 1–43200；非精确时间保存在不超过 60 字的 `timingText`。
- 现有 `preparationNote` 继续表达切块、切丝、洗净等即时食材处理。
- 不增加新后端服务；继续使用 Next.js Server Actions、Supabase 和现有 `save_recipe` RPC。
- 每个实现步骤遵循 TDD：先写失败测试、确认失败、最小实现、确认通过。
- 不提交 `.env`、API Key、Token、密码或 Supabase 密钥。
- 正式 Supabase 迁移和 Production 发布都需要用户分别明确确认。

---

## File Structure

### Create

- `supabase/migrations/20260830090000_recipe_preparations.sql`：新表、RLS、保存函数和列表摘要函数。
- `src/features/recipes/preparation-time.ts`：提前时间换算、格式化和稳定排序。
- `src/features/recipes/preparation-time.test.ts`：时间工具单元测试。
- `src/features/recipes/components/recipe-preparations-editor.tsx`：编辑器中的提前准备数组表单。
- `src/features/recipes/components/recipe-preparations-editor.test.tsx`：准备事项编辑交互测试。
- `src/features/recipes/components/recipe-preparation-list.tsx`：详情与离线详情复用的只读准备卡。
- `src/features/cooking/components/preparation-checklist.tsx`：烹饪前确认清单。
- `src/features/cooking/components/preparation-checklist.test.tsx`：确认、跳过与无障碍测试。
- `docs/testing/module-7-recipe-preparations-acceptance.md`：人工验收步骤。

### Modify

- `src/test/database/load-migrations.ts`
- `src/test/database/recipe-management-migration.test.ts`
- `src/test/database/recipe-management-security.test.ts`
- `src/lib/supabase/database.types.ts`
- `src/features/recipes/schemas.ts`
- `src/features/recipes/schemas.test.ts`
- `src/features/recipes/types.ts`
- `src/features/recipes/editor-value.ts`
- `src/features/recipes/actions.test.ts`
- `src/features/recipes/queries.ts`
- `src/features/recipes/queries.test.ts`
- `src/features/recipes/components/recipe-editor.tsx`
- `src/features/recipes/components/recipe-editor.test.tsx`
- `src/features/recipes/components/recipe-card.tsx`
- `src/features/recipes/components/recipe-list.test.tsx`
- `src/features/recipes/components/recipe-detail.tsx`
- `src/features/recipes/components/recipe-detail.test.tsx`
- `src/features/recipe-imports/schemas.ts`
- `src/features/recipe-imports/schemas.test.ts`
- `src/features/recipe-imports/recipe-ai-shared.ts`
- `src/features/recipe-imports/recipe-ai-shared.test.ts`
- `src/features/recipe-imports/qianwen-extractor.test.ts`
- `src/features/recipe-imports/gemini-extractor.test.ts`
- `src/features/recipe-imports/recipe-ai-extractor.test.ts`
- `src/features/recipe-imports/process.test.ts`
- `src/features/recipe-imports/draft-mapping.ts`
- `src/features/recipe-imports/draft-mapping.test.ts`
- `src/app/(app)/recipes/import/[importId]/page.tsx`
- `src/features/cooking/types.ts`
- `src/features/cooking/session-storage.ts`
- `src/features/cooking/session-storage.test.ts`
- `src/features/cooking/hooks/use-cooking-session.ts`
- `src/features/cooking/hooks/use-cooking-session.test.tsx`
- `src/features/cooking/components/cooking-entry.tsx`
- `src/features/cooking/components/cooking-entry.test.tsx`
- `src/features/cooking/components/cooking-screen.tsx`
- `src/features/cooking/components/cooking-screen.test.tsx`
- `src/features/offline/types.ts`
- `src/features/offline/database.ts`
- `src/features/offline/database.test.ts`
- `src/features/offline/recipe-snapshot.ts`
- `src/features/offline/recipe-snapshot.test.ts`
- `src/features/offline/components/offline-recipe-detail.tsx`
- `src/features/offline/components/offline-app.test.tsx`
- `README.md`

---

### Task 1: 建立数据库表、RLS 与原子保存边界

**Files:**
- Create: `supabase/migrations/20260830090000_recipe_preparations.sql`
- Modify: `src/test/database/load-migrations.ts`
- Modify: `src/test/database/recipe-management-migration.test.ts`
- Modify: `src/test/database/recipe-management-security.test.ts`

**Interfaces:**
- Consumes: `public.recipes(user_id, id)`、`public.recipe_ingredients(user_id, recipe_id, id)`、`public.set_updated_at()`、`public.save_recipe(jsonb)`、`public.search_recipe_summaries(...)`。
- Produces: `public.recipe_preparations`、保存 payload 的 `preparations` 数组、列表 RPC 的 `preparation_count` 和 `max_lead_time_minutes`。

- [ ] **Step 1: 让测试加载新的迁移并写失败断言**

在 `loadRecipeMigrations()` 的 AI provider migration 之后，按文件名排序加载所有 `_recipe_preparations.sql` 文件。扩展 `expectedTables`，并在迁移测试中断言索引 `recipe_preparations_user_recipe_idx` 存在。

在安全测试 payload 中加入：

```ts
const preparationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

preparations: [{
  preparationId,
  recipeIngredientId: ingredientId,
  instruction: "加入调料抓匀腌制",
  leadTimeMinutes: 30,
  timingText: null,
  sortOrder: 0,
}],
```

新增测试覆盖：当前用户可读写、其他用户不可见、跨菜谱食材关联被拒绝、删除食材关联后说明保留且 `recipe_ingredient_id` 为空、无时间字段被拒绝、无效准备事项导致整次保存回滚、列表 RPC 返回 `{ preparation_count: 1, max_lead_time_minutes: 30 }`。

- [ ] **Step 2: 运行数据库测试确认失败**

Run:

```powershell
npm.cmd test -- src/test/database/recipe-management-migration.test.ts src/test/database/recipe-management-security.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL，至少包含 `recipe_preparations` 不存在或迁移数量断言失败。

- [ ] **Step 3: 新增迁移表、约束、索引、触发器和 RLS**

迁移的表边界使用：

```sql
create table public.recipe_preparations (
  id uuid primary key,
  user_id uuid not null,
  recipe_id uuid not null,
  recipe_ingredient_id uuid,
  instruction text not null,
  lead_time_minutes integer,
  timing_text text,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_preparations_user_id_id_unique unique (user_id, id),
  constraint recipe_preparations_user_recipe_id_unique unique (user_id, recipe_id, id),
  constraint recipe_preparations_recipe_sort_unique unique (recipe_id, sort_order),
  constraint recipe_preparations_instruction_length check (
    char_length(trim(instruction)) between 1 and 500
  ),
  constraint recipe_preparations_lead_time_range check (
    lead_time_minutes is null or lead_time_minutes between 1 and 43200
  ),
  constraint recipe_preparations_timing_text_length check (
    timing_text is null or char_length(trim(timing_text)) between 1 and 60
  ),
  constraint recipe_preparations_timing_required check (
    lead_time_minutes is not null or timing_text is not null
  ),
  constraint recipe_preparations_recipe_owner_fk
    foreign key (user_id, recipe_id)
    references public.recipes (user_id, id)
    on delete cascade,
  constraint recipe_preparations_ingredient_owner_fk
    foreign key (user_id, recipe_id, recipe_ingredient_id)
    references public.recipe_ingredients (user_id, recipe_id, id)
    on delete set null (recipe_ingredient_id)
);

create index recipe_preparations_user_recipe_idx
  on public.recipe_preparations (user_id, recipe_id, sort_order);

create trigger recipe_preparations_set_updated_at
before update on public.recipe_preparations
for each row execute function public.set_updated_at();

alter table public.recipe_preparations enable row level security;
alter table public.recipe_preparations force row level security;

create policy recipe_preparations_select on public.recipe_preparations
for select using ((select auth.uid()) = user_id);
create policy recipe_preparations_insert on public.recipe_preparations
for insert with check ((select auth.uid()) = user_id);
create policy recipe_preparations_update on public.recipe_preparations
for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recipe_preparations_delete on public.recipe_preparations
for delete using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.recipe_preparations to authenticated;
revoke all on public.recipe_preparations from anon;
```

替换 `save_recipe` 时新增 `v_preparation jsonb`，删除嵌套数据的顺序改为：`step_ingredients`、`recipe_preparations`、`recipe_tags`、`recipe_steps`、`recipe_ingredients`。食材循环完成后插入：

```sql
for v_preparation in
  select value from jsonb_array_elements(coalesce(p_payload->'preparations', '[]'::jsonb))
loop
  insert into public.recipe_preparations (
    id, user_id, recipe_id, recipe_ingredient_id, instruction,
    lead_time_minutes, timing_text, sort_order
  ) values (
    (v_preparation->>'preparationId')::uuid,
    v_user_id,
    v_recipe_id,
    nullif(v_preparation->>'recipeIngredientId', '')::uuid,
    trim(v_preparation->>'instruction'),
    nullif(v_preparation->>'leadTimeMinutes', '')::integer,
    nullif(v_preparation->>'timingText', ''),
    (v_preparation->>'sortOrder')::integer
  );
end loop;
```

因为列表函数返回列会变化，先按完整参数签名 `drop function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer)`，再重建函数并在 `tags` 后返回：

```sql
preparation_count bigint,
max_lead_time_minutes integer,
```

查询列使用：

```sql
(select count(*) from public.recipe_preparations rp
  where rp.user_id = p.user_id and rp.recipe_id = p.id) as preparation_count,
(select max(rp.lead_time_minutes) from public.recipe_preparations rp
  where rp.user_id = p.user_id and rp.recipe_id = p.id) as max_lead_time_minutes,
```

重建后执行：

```sql
revoke all on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer) from public, anon;
grant execute on function public.search_recipe_summaries(text, uuid, uuid, boolean, boolean, integer, integer) to authenticated;
```

- [ ] **Step 4: 运行数据库测试确认通过**

Run:

```powershell
npm.cmd test -- src/test/database/recipe-management-migration.test.ts src/test/database/recipe-management-security.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 5: 提交数据库边界**

```powershell
git add supabase/migrations/20260830090000_recipe_preparations.sql src/test/database/load-migrations.ts src/test/database/recipe-management-migration.test.ts src/test/database/recipe-management-security.test.ts
git commit -m "feat(recipe): add preparation persistence"
```

---

### Task 2: 建立共享类型、校验与时间工具

**Files:**
- Create: `src/features/recipes/preparation-time.ts`
- Create: `src/features/recipes/preparation-time.test.ts`
- Modify: `src/features/recipes/schemas.ts`
- Modify: `src/features/recipes/schemas.test.ts`
- Modify: `src/features/recipes/types.ts`
- Modify: `src/lib/supabase/database.types.ts`
- Modify: `src/features/recipes/actions.test.ts`

**Interfaces:**
- Consumes: `recipeSaveInputSchema`、Supabase 生成类型的当前手写结构。
- Produces: `RecipePreparationInput`、`RecipeDetail["preparations"]`、`preparationCount`、`maxLeadTimeMinutes`、`formatPreparationLeadTime()`、`sortRecipePreparations()`、`toLeadTimeMinutes()`。

- [ ] **Step 1: 写 schema 与时间工具失败测试**

使用固定数据断言：

```ts
expect(toLeadTimeMinutes(30, "minute")).toBe(30);
expect(toLeadTimeMinutes(1.5, "hour")).toBe(90);
expect(toLeadTimeMinutes(2, "day")).toBe(2880);
expect(formatPreparationLeadTime(30, null)).toBe("提前 30 分钟");
expect(formatPreparationLeadTime(240, null)).toBe("提前 4 小时");
expect(formatPreparationLeadTime(1500, null)).toBe("提前 1 天 1 小时");
expect(formatPreparationLeadTime(null, "提前一晚")).toBe("提前一晚");
```

Schema 测试必须接受精确时间、文字时间和两者并存，拒绝两者都空、0 分钟、43201 分钟、空说明和跨数组重复 ID。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm.cmd test -- src/features/recipes/preparation-time.test.ts src/features/recipes/schemas.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL，时间工具不存在且 schema 尚无 `preparations`。

- [ ] **Step 3: 实现共享类型和纯函数**

在 `schemas.ts` 增加并导出：

```ts
export const recipePreparationSchema = z.object({
  preparationId: uuidSchema,
  recipeIngredientId: nullableUuid,
  instruction: z.string().trim().min(1).max(500),
  leadTimeMinutes: nullableNumber(z.number().int().min(1).max(43200)),
  timingText: nullableText(60),
  sortOrder: z.number().int().nonnegative(),
}).superRefine((value, context) => {
  if (value.leadTimeMinutes === null && value.timingText === null) {
    context.addIssue({ code: "custom", path: ["leadTimeMinutes"], message: "请填写提前时间或文字时间" });
  }
});
```

将 `preparations: z.array(recipePreparationSchema).max(30)` 加入 `recipeSaveInputBaseSchema`，在聚合校验中验证准备事项 ID 不重复、关联 ID 来自当前 `ingredients`，并在 transform 中重排 `sortOrder`。

`preparation-time.ts` 使用以下公开接口：

```ts
export type PreparationTimeUnit = "minute" | "hour" | "day";
export function toLeadTimeMinutes(value: number, unit: PreparationTimeUnit): number | null;
export function toPreparationTimeParts(minutes: number | null): { value: number | null; unit: PreparationTimeUnit };
export function formatPreparationLeadTime(minutes: number | null, timingText: string | null): string;
export function sortRecipePreparations<T extends { leadTimeMinutes: number | null; sortOrder: number; id?: string; preparationId?: string }>(items: T[]): T[];
```

规则为有限正数才换算，结果四舍五入为整数分钟；整天优先显示天，整小时优先显示小时，其余显示天/小时/分钟组合；排序为精确时间降序、文字时间其次、最后按 `sortOrder` 和 ID 稳定排序。

在 `types.ts` 给 `RecipeSummary` 增加：

```ts
preparationCount: number;
maxLeadTimeMinutes: number | null;
```

给 `RecipeDetail` 增加：

```ts
preparations: Array<{
  id: string;
  recipeIngredientId: string | null;
  ingredientName: string | null;
  instruction: string;
  leadTimeMinutes: number | null;
  timingText: string | null;
  sortOrder: number;
}>;
```

在 `database.types.ts` 增加 `recipe_preparations` 表类型，并给 `search_recipe_summaries.Returns` 增加 `preparation_count` 和 `max_lead_time_minutes`。

- [ ] **Step 4: 更新动作测试 payload 并运行通过**

所有手写 `RecipeSaveInput` 测试对象加入 `preparations: []`。动作测试再断言 RPC payload 保留准备事项。

```powershell
npm.cmd test -- src/features/recipes/preparation-time.test.ts src/features/recipes/schemas.test.ts src/features/recipes/actions.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 5: 提交共享模型**

```powershell
git add src/features/recipes/preparation-time.ts src/features/recipes/preparation-time.test.ts src/features/recipes/schemas.ts src/features/recipes/schemas.test.ts src/features/recipes/types.ts src/lib/supabase/database.types.ts src/features/recipes/actions.test.ts
git commit -m "feat(recipe): model advance preparations"
```

---

### Task 3: 读取详情与列表准备摘要

**Files:**
- Modify: `src/features/recipes/queries.ts`
- Modify: `src/features/recipes/queries.test.ts`
- Modify: `src/features/recipes/editor-value.ts`

**Interfaces:**
- Consumes: Task 1 的数据库返回列和 Task 2 的共享类型。
- Produces: `getRecipeDetail()` 中已排序的 `preparations`，以及列表摘要映射。

- [ ] **Step 1: 写查询映射失败测试**

给 `mapRecipeSearchRow()` 固定 row 加入：

```ts
preparation_count: 2,
max_lead_time_minutes: 240,
```

并断言：

```ts
expect(summary).toMatchObject({ preparationCount: 2, maxLeadTimeMinutes: 240 });
```

为 `getRecipeDetail()` 的 Supabase mock 增加两条准备记录，断言关联食材名称、未关联项和时间降序都正确。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm.cmd test -- src/features/recipes/queries.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL，摘要字段与详情准备数组尚未映射。

- [ ] **Step 3: 实现查询和编辑值映射**

`mapRecipeSearchRow()` 映射：

```ts
preparationCount: Number(row.preparation_count ?? 0),
maxLeadTimeMinutes: row.max_lead_time_minutes,
```

`getRecipeDetail()` 第一批并行查询增加：

```ts
supabase
  .from("recipe_preparations")
  .select("id, recipe_ingredient_id, instruction, lead_time_minutes, timing_text, sort_order")
  .eq("recipe_id", recipeId)
  .eq("user_id", user.id),
```

使用 `recipeIngredientsResult.data` 建立 `recipeIngredientNameById`，将结果映射成 `RecipeDetail.preparations` 后调用 `sortRecipePreparations()`。

`recipeDetailToSaveInput()` 增加：

```ts
preparations: detail.preparations.map((item) => ({
  preparationId: item.id,
  recipeIngredientId: item.recipeIngredientId,
  instruction: item.instruction,
  leadTimeMinutes: item.leadTimeMinutes,
  timingText: item.timingText,
  sortOrder: item.sortOrder,
})),
```

- [ ] **Step 4: 运行查询和编辑值测试**

```powershell
npm.cmd test -- src/features/recipes/queries.test.ts src/features/recipes/schemas.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 5: 提交读取链路**

```powershell
git add src/features/recipes/queries.ts src/features/recipes/queries.test.ts src/features/recipes/editor-value.ts
git commit -m "feat(recipe): load preparation summaries"
```

---

### Task 4: 增加提前准备编辑器

**Files:**
- Create: `src/features/recipes/components/recipe-preparations-editor.tsx`
- Create: `src/features/recipes/components/recipe-preparations-editor.test.tsx`
- Modify: `src/features/recipes/components/recipe-editor.tsx`
- Modify: `src/features/recipes/components/recipe-editor.test.tsx`

**Interfaces:**
- Consumes: `RecipeSaveInput`、`toLeadTimeMinutes()`、`toPreparationTimeParts()`、当前表单食材数组。
- Produces: 已验证、已排序的 `preparations` 表单值。

- [ ] **Step 1: 写编辑交互失败测试**

测试必须覆盖：

```ts
await user.click(screen.getByRole("button", { name: "添加提前准备" }));
await user.selectOptions(screen.getByLabelText("关联食材 1"), ingredientId);
await user.type(screen.getByLabelText("准备说明 1"), "加入调料抓匀腌制");
await user.type(screen.getByLabelText("提前时间 1"), "1.5");
await user.selectOptions(screen.getByLabelText("时间单位 1"), "hour");
expect(onChangePayload.preparations[0].leadTimeMinutes).toBe(90);
```

另测文字时间、上移/下移、删除食材后准备事项解除关联、两种时间都空时显示“请填写提前时间或文字时间”。

- [ ] **Step 2: 运行测试确认失败**

```powershell
npm.cmd test -- src/features/recipes/components/recipe-preparations-editor.test.tsx src/features/recipes/components/recipe-editor.test.tsx --pool=forks --maxWorkers=1
```

Expected: FAIL，组件和“添加提前准备”入口不存在。

- [ ] **Step 3: 实现聚焦的准备事项表单组件**

组件公开 props：

```ts
type RecipePreparationsEditorProps = {
  control: Control<RecipeSaveInput>;
  register: UseFormRegister<RecipeSaveInput>;
  setValue: UseFormSetValue<RecipeSaveInput>;
  errors: FieldErrors<RecipeSaveInput>;
};
```

组件内部使用 `useFieldArray({ control, name: "preparations", keyName: "fieldKey" })` 和 `useWatch({ control, name: "ingredients" })`。新增事项默认值：

```ts
{
  preparationId: crypto.randomUUID(),
  recipeIngredientId: null,
  instruction: "",
  leadTimeMinutes: null,
  timingText: null,
  sortOrder: fields.length,
}
```

每行包含关联食材 select、准备说明、数值时间、分钟/小时/天单位、文字时间、上下移动和删除按钮。时间数值变化时调用 `toLeadTimeMinutes()` 写回 canonical 分钟。

在 `RecipeEditor` 默认值加入 `preparations: initialValue?.preparations ?? []`，在食材与步骤之间渲染新组件。`removeIngredient()` 删除食材前遍历准备事项，将匹配的 `recipeIngredientId` 设为 `null`，不删除准备说明。

- [ ] **Step 4: 运行编辑器测试**

```powershell
npm.cmd test -- src/features/recipes/components/recipe-preparations-editor.test.tsx src/features/recipes/components/recipe-editor.test.tsx --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 5: 提交编辑器**

```powershell
git add src/features/recipes/components/recipe-preparations-editor.tsx src/features/recipes/components/recipe-preparations-editor.test.tsx src/features/recipes/components/recipe-editor.tsx src/features/recipes/components/recipe-editor.test.tsx
git commit -m "feat(recipe): edit advance preparations"
```

---

### Task 5: 在列表与详情展示准备信息

**Files:**
- Create: `src/features/recipes/components/recipe-preparation-list.tsx`
- Modify: `src/features/recipes/components/recipe-card.tsx`
- Modify: `src/features/recipes/components/recipe-list.test.tsx`
- Modify: `src/features/recipes/components/recipe-detail.tsx`
- Modify: `src/features/recipes/components/recipe-detail.test.tsx`

**Interfaces:**
- Consumes: `RecipeSummary.preparationCount`、`RecipeDetail.preparations`、`formatPreparationLeadTime()`。
- Produces: 复用的“提前准备”卡和列表摘要徽标。

- [ ] **Step 1: 写渲染失败测试**

列表测试断言：

```ts
expect(screen.getByText("需提前 4 小时准备")).toBeInTheDocument();
```

当 `preparationCount > 0` 且 `maxLeadTimeMinutes === null` 时断言“有提前准备事项”，数量为 0 时不出现准备文案。

详情测试加入 4 小时、30 分钟和“提前一晚”三项，断言标题“提前准备”、关联食材名称、说明和顺序；空数组时不显示该区块。

- [ ] **Step 2: 运行组件测试确认失败**

```powershell
npm.cmd test -- src/features/recipes/components/recipe-list.test.tsx src/features/recipes/components/recipe-detail.test.tsx --pool=forks --maxWorkers=1
```

Expected: FAIL，准备摘要与卡片尚未渲染。

- [ ] **Step 3: 实现只读准备卡与摘要**

`RecipePreparationList` 接口：

```ts
type RecipePreparationListProps = {
  preparations: RecipeDetail["preparations"];
  className?: string;
};
```

组件自行调用 `sortRecipePreparations()`，使用 `<section aria-labelledby="recipe-preparations-heading">` 和语义化列表。时间标签由 `formatPreparationLeadTime()` 生成，关联食材缺失时只显示说明。

`RecipeCard` 在份数/总时间下方渲染：

```tsx
{recipe.preparationCount > 0 && (
  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
    {recipe.maxLeadTimeMinutes
      ? `${formatPreparationLeadTime(recipe.maxLeadTimeMinutes, null).replace("提前 ", "需提前 ")}准备`
      : "有提前准备事项"}
  </p>
)}
```

`RecipeDetailView` 在基础信息后、食材前渲染 `<RecipePreparationList preparations={recipe.preparations} />`。

- [ ] **Step 4: 运行列表与详情测试**

```powershell
npm.cmd test -- src/features/recipes/components/recipe-list.test.tsx src/features/recipes/components/recipe-detail.test.tsx src/features/recipes/queries.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 5: 提交展示层**

```powershell
git add src/features/recipes/components/recipe-preparation-list.tsx src/features/recipes/components/recipe-card.tsx src/features/recipes/components/recipe-list.test.tsx src/features/recipes/components/recipe-detail.tsx src/features/recipes/components/recipe-detail.test.tsx
git commit -m "feat(recipe): show advance preparation cards"
```

---

### Task 6: 让 AI 导入提取和映射准备事项

**Files:**
- Modify: `src/features/recipe-imports/schemas.ts`
- Modify: `src/features/recipe-imports/schemas.test.ts`
- Modify: `src/features/recipe-imports/recipe-ai-shared.ts`
- Modify: `src/features/recipe-imports/recipe-ai-shared.test.ts`
- Modify: `src/features/recipe-imports/qianwen-extractor.test.ts`
- Modify: `src/features/recipe-imports/gemini-extractor.test.ts`
- Modify: `src/features/recipe-imports/recipe-ai-extractor.test.ts`
- Modify: `src/features/recipe-imports/process.test.ts`
- Modify: `src/features/recipe-imports/draft-mapping.ts`
- Modify: `src/features/recipe-imports/draft-mapping.test.ts`
- Modify: `src/app/(app)/recipes/import/[importId]/page.tsx`

**Interfaces:**
- Consumes: AI JSON Schema、现有来源正文、Task 2 的 `RecipeSaveInput`。
- Produces: `RecipeImportDraft.preparations`，名称到 `recipeIngredientId` 的安全映射。

- [ ] **Step 1: 写 AI schema、规范化与映射失败测试**

固定草稿加入：

```ts
preparations: [
  {
    ingredientName: "牛肉",
    instruction: "加入生抽和淀粉抓匀腌制",
    leadTimeMinutes: 30,
    timingText: null,
  },
  {
    ingredientName: "绿豆",
    instruction: "加足量清水浸泡",
    leadTimeMinutes: null,
    timingText: "提前一晚",
  },
],
```

断言 Qwen/Gemini 解析保留两项；别名输入 `prepTasks`、`ingredient`、`durationMinutes`、`timeText` 能规范化；缺失 `preparations` 的旧式模型输出被规范化为空数组。

映射测试断言“牛肉”关联到正确 `recipeIngredientId`，未知食材保留为 `null`，每项生成独立 `preparationId`，顺序稳定。

- [ ] **Step 2: 运行导入测试确认失败**

```powershell
npm.cmd test -- src/features/recipe-imports/schemas.test.ts src/features/recipe-imports/recipe-ai-shared.test.ts src/features/recipe-imports/draft-mapping.test.ts src/features/recipe-imports/qianwen-extractor.test.ts src/features/recipe-imports/gemini-extractor.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL，草稿 schema 和映射尚无 `preparations`。

- [ ] **Step 3: 扩展 AI JSON Schema 和提示词**

在 `recipeImportDraftModelSchema` 增加：

```ts
preparations: z.array(z.object({
  ingredientName: modelNullableText(80),
  instruction: z.string().trim().min(1).max(500),
  leadTimeMinutes: modelNullableInteger(1, 43200),
  timingText: modelNullableText(60),
}).refine(
  (item) => item.leadTimeMinutes !== null || item.timingText !== null,
  { message: "提前准备必须包含精确时间或文字时间" },
)).max(30),
```

在系统提示词加入：

```ts
"把来源明确提到的腌制、浸泡、解冻、醒发、静置、回温等做饭前任务放入 preparations。精确时间统一换算为分钟；提前一晚、泡至变软等保留在 timingText。来源未说明的时间不要凭常识补写，并在 warnings 中提醒用户确认。切片、切块、洗净等即时处理仍放在食材 preparationNote。",
```

`normalizeDraftModel()` 将 `draft.preparations ?? draft.prepTasks ?? []` 规范化为正式字段；`ingredientName` 接受 `ingredient` 别名，`leadTimeMinutes` 接受 `durationMinutes`，`timingText` 接受 `timeText`。最终返回对象始终包含 `preparations`。

- [ ] **Step 4: 映射到可编辑保存值**

在 `mapImportDraftToRecipeSaveInput()` 中，食材 ID map 建立后加入：

```ts
preparations: input.draft.preparations.map((item, index) => ({
  preparationId: createId(),
  recipeIngredientId: item.ingredientName
    ? ingredientByName.get(normalize(item.ingredientName)) ?? null
    : null,
  instruction: item.instruction,
  leadTimeMinutes: item.leadTimeMinutes,
  timingText: asNullable(item.timingText),
  sortOrder: index,
})),
```

导入审核页提示改为“请检查食材、提前准备、火候和时间后再保存”。所有既有 AI 测试 fixture 明确加入 `preparations: []` 或准备事项样例。

- [ ] **Step 5: 运行完整导入测试**

```powershell
npm.cmd test -- src/features/recipe-imports --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 6: 提交 AI 导入链路**

```powershell
git add -- src/features/recipe-imports 'src/app/(app)/recipes/import/[importId]/page.tsx'
git commit -m "feat(recipe-import): extract advance preparations"
```

---

### Task 7: 增加烹饪前确认清单并保持会话兼容

**Files:**
- Create: `src/features/cooking/components/preparation-checklist.tsx`
- Create: `src/features/cooking/components/preparation-checklist.test.tsx`
- Modify: `src/features/cooking/types.ts`
- Modify: `src/features/cooking/session-storage.ts`
- Modify: `src/features/cooking/session-storage.test.ts`
- Modify: `src/features/cooking/hooks/use-cooking-session.ts`
- Modify: `src/features/cooking/hooks/use-cooking-session.test.tsx`
- Modify: `src/features/cooking/components/cooking-entry.tsx`
- Modify: `src/features/cooking/components/cooking-entry.test.tsx`
- Modify: `src/features/cooking/components/cooking-screen.tsx`
- Modify: `src/features/cooking/components/cooking-screen.test.tsx`

**Interfaces:**
- Consumes: `RecipeDetail.preparations` 和现有本地 `CookingSessionV1`。
- Produces: `completedPreparationIds`、`preparationsConfirmedAt`、确认/跳过动作和步骤前准备页面。

- [ ] **Step 1: 写会话与清单失败测试**

扩展会话期望：

```ts
completedPreparationIds: [],
preparationsConfirmedAt: null,
```

新增断言：旧的 version 1 存储值缺少这两个字段时可以加载并补为空值；不存在于当前菜谱的准备 ID 会被过滤；切换勾选会持久化；全部完成或“仍然开始”后设置确认时间；重新开始和完成烹饪会清除状态。

组件测试断言有准备事项时先显示“开始前请确认”、复选框、“准备完成，开始烹饪”和“仍然开始烹饪”；无准备事项时直接显示第一步。

- [ ] **Step 2: 运行烹饪测试确认失败**

```powershell
npm.cmd test -- src/features/cooking/session-storage.test.ts src/features/cooking/hooks/use-cooking-session.test.tsx src/features/cooking/components/preparation-checklist.test.tsx src/features/cooking/components/cooking-screen.test.tsx --pool=forks --maxWorkers=1
```

Expected: FAIL，会话字段和准备清单不存在。

- [ ] **Step 3: 扩展兼容的本地会话**

`CookingSessionV1` 增加：

```ts
completedPreparationIds: string[];
preparationsConfirmedAt: number | null;
```

同时给 `CookingRecipe` / `CookingSessionRecipe` 增加最小准备事项身份数组：

```ts
preparations: Array<{ id: string }>;
```

`cookingSessionSchema` 对旧记录使用默认值：

```ts
completedPreparationIds: z.array(z.string()).default([]),
preparationsConfirmedAt: z.number().finite().nullable().default(null),
```

`loadCookingSession()` 只保留当前 `recipe.preparations` 存在的 ID。`createCookingSession()` 初始化空完成列表和 `null` 确认时间。

Hook controller 增加：

```ts
togglePreparation(preparationId: string): void;
confirmPreparations(): void;
preparationsComplete: boolean;
```

`togglePreparation` 使用集合去重；`confirmPreparations` 写入 `Date.now()`；`preparationsComplete` 仅在每个准备事项都已勾选时为真。

- [ ] **Step 4: 实现准备清单和烹饪入口提示**

`PreparationChecklist` props：

```ts
type PreparationChecklistProps = {
  preparations: RecipeDetail["preparations"];
  completedIds: string[];
  allCompleted: boolean;
  onToggle(preparationId: string): void;
  onConfirm(): void;
  onSkip(): void;
};
```

使用 `RecipePreparationList` 相同的排序规则，但每项增加原生 checkbox。主按钮在未全部完成时禁用；次按钮始终允许跳过并明确标注“仍然开始烹饪”。

`CookingScreen` 在 `recipe.preparations.length > 0 && session.preparationsConfirmedAt === null` 时只渲染准备清单和返回菜谱链接；确认后才运行正式步骤 UI。计时器和通知授权仍只在用户点击步骤计时时触发。

`CookingEntry` 有准备事项时补充“这道菜有 N 项提前准备，请先确认”的说明。

- [ ] **Step 5: 运行完整烹饪测试**

```powershell
npm.cmd test -- src/features/cooking --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 6: 提交烹饪确认**

```powershell
git add src/features/cooking
git commit -m "feat(cooking): confirm advance preparations"
```

---

### Task 8: 扩展离线快照和离线详情

**Files:**
- Modify: `src/features/offline/types.ts`
- Modify: `src/features/offline/database.ts`
- Modify: `src/features/offline/database.test.ts`
- Modify: `src/features/offline/recipe-snapshot.ts`
- Modify: `src/features/offline/recipe-snapshot.test.ts`
- Modify: `src/features/offline/components/offline-recipe-detail.tsx`
- Modify: `src/features/offline/components/offline-app.test.tsx`

**Interfaces:**
- Consumes: `RecipeDetail.preparations` 和 `RecipePreparationList`。
- Produces: `dataVersion: 2` 的菜谱快照；购物离线数据仍保持 `dataVersion: 1`。

- [ ] **Step 1: 写离线失败测试**

菜谱 fixture 加入一条 240 分钟准备事项。断言 `toOfflineRecipeSnapshot()` 深拷贝 `preparations`，离线详情显示“提前 4 小时”，离线烹饪接收准备数组。

数据库测试写入旧版 `dataVersion: 1` 菜谱快照后，断言读取时删除并返回空；购物快照 `dataVersion: 1` 继续可用。

- [ ] **Step 2: 运行离线测试确认失败**

```powershell
npm.cmd test -- src/features/offline --pool=forks --maxWorkers=1
```

Expected: FAIL，菜谱快照版本和准备字段尚未更新。

- [ ] **Step 3: 实现独立版本兼容规则**

`OfflineRecipeSnapshot.dataVersion` 改为字面量 `2`，`OfflineShoppingSnapshot.dataVersion` 保持 `1`。将共享 `compatible()` 拆为：

```ts
const compatibleRecipe = (value: { dataVersion?: number }) => value.dataVersion === 2;
const compatibleShopping = (value: { dataVersion?: number }) => value.dataVersion === 1;
```

只在菜谱 object store 的读取和列表清理中使用 `compatibleRecipe`；购物逻辑使用 `compatibleShopping`。IndexedDB `DB_VERSION` 保持 1，因为 object store 结构没有变化。

`toOfflineRecipeSnapshot()` 增加：

```ts
dataVersion: 2,
preparations: recipe.preparations.map((item) => ({ ...item })),
```

离线详情在基础信息后渲染 `<RecipePreparationList preparations={recipe.preparations} />`。

- [ ] **Step 4: 运行完整离线测试**

```powershell
npm.cmd test -- src/features/offline --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 5: 提交离线支持**

```powershell
git add src/features/offline
git commit -m "feat(offline): cache recipe preparations"
```

---

### Task 9: 文档、全量验证、Git 整理与预发布门禁

**Files:**
- Create: `docs/testing/module-7-recipe-preparations-acceptance.md`
- Modify: `README.md`
- Review: all files changed since `9812984`

**Interfaces:**
- Consumes: Tasks 1–8 的完整模块。
- Produces: 可供 Supabase 迁移和 Vercel Preview 验收的功能分支，不直接变更 Production。

- [ ] **Step 1: 写人工验收文档**

文档必须包含以下固定样例：

```text
牛肉：加入生抽和淀粉抓匀腌制，提前 30 分钟
绿豆：加足量清水浸泡，提前 4 小时
面团：覆盖静置，提前一晚
```

检查新建、编辑、AI 文字导入、菜谱卡摘要、详情排序、删除关联食材、烹饪前确认、离线详情和现有步骤计时回归。

- [ ] **Step 2: 更新 README**

在功能说明中加入“结构化提前准备、AI 提取和烹饪前确认”；明确系统定时提醒仍属于后续计划，不宣称已经支持。

- [ ] **Step 3: 运行针对性测试**

```powershell
npm.cmd test -- src/test/database/recipe-management-migration.test.ts src/test/database/recipe-management-security.test.ts src/features/recipes src/features/recipe-imports src/features/cooking src/features/offline --pool=forks --maxWorkers=1
```

Expected: PASS。

- [ ] **Step 4: 运行项目级质量门禁**

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --pool=forks --maxWorkers=1
npm.cmd run build
```

Expected: 全部命令退出码为 0；允许记录但不得隐藏现有 Next.js workspace root 和 `<img>` 优化 warning。

- [ ] **Step 5: 检查变更与敏感信息**

```powershell
git diff --check 9812984..HEAD
git status --short
git diff --stat 9812984..HEAD
git diff --name-only 9812984..HEAD
rg -n "sk-[A-Za-z0-9]|AIza[A-Za-z0-9_-]{20,}|service_role|DASHSCOPE_API_KEY=.*" . --glob '!node_modules/**' --glob '!.next/**' --glob '!docs/superpowers/plans/**'
```

Expected: 无空白错误、无临时文件、无真实密钥；变更只覆盖本计划列出的文件。

- [ ] **Step 6: 提交文档并推送功能分支**

```powershell
git add README.md docs/testing/module-7-recipe-preparations-acceptance.md
git commit -m "docs(recipe): add preparation acceptance guide"
git push origin feat/recipe-app-shopping
```

Expected: 推送成功到 `feat/recipe-app-shopping`，不创建或合并 PR，不推送 `main`。

- [ ] **Step 7: 暂停并请求 Supabase 迁移授权**

汇报迁移文件、目标项目 ref、dry-run 或差异结果、分支、所有 commits 和测试证据。没有用户对当前 Supabase 项目和 `20260830090000_recipe_preparations.sql` 的明确执行确认，不运行远程迁移。

- [ ] **Step 8: 获得迁移授权后执行只读核验和 Preview 验收**

应用前再次核对 `supabase/.temp/project-ref` 为用户确认的项目；执行迁移后只读验证表、约束、RLS、函数签名和准备事项保存。随后验证 Vercel Preview 的新建、导入、列表、详情、烹饪和离线流程。

Expected: Preview READY；固定样例全部通过；正式域名不发生变化。

- [ ] **Step 9: 按模块交付格式暂停**

汇报：完成的功能、修改文件、数据库/API/配置变更、测试证据、已知注意项、下一模块“AI 智能分类与标签”。Production 发布必须等待新的明确确认。
