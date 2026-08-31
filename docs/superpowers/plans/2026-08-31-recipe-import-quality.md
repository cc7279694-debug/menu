# AI Import Quality Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为食序 ORDINE 的菜谱来源导入增加字段级来源状态、保守值清理、用户审核确认门禁和可操作的失败恢复，同时保持 Qwen 3.8 Flash 默认模型与现有提供商选择不变。

**Architecture:** 模型输出 schema 与持久化草稿 schema 分离：AI 只返回菜谱内容、字段检查和警告，服务端 `quality-review.ts` 校验路径、补齐缺失检查、清除推断的关键数值并生成 `review`。审核元数据继续存入 `recipe_import_jobs.draft` JSON；导入编辑器在保存前调用用户所有权受保护的确认 Server Action，失败页面改为按稳定错误码展示并只允许显式单次重试。

**Tech Stack:** Next.js 15.5、React 19、TypeScript、Zod 4、React Hook Form、Supabase Auth/PostgREST、Vitest、Testing Library、原生 `fetch`

**Spec:** `docs/superpowers/specs/2026-08-31-recipe-import-quality-design.md`

## Global Constraints

- Qwen 3.8 Flash 保持默认模型；保留“自动推荐、只用 Qwen、只用 Gemini”，不新增服务商。
- 不新增 Supabase 表、列、函数、Storage bucket 或 migration；审核元数据只写入现有 `recipe_import_jobs.draft` 与 `warnings` JSON。
- 不修改普通菜谱的 `RecipeSaveInput` 数据模型，不影响非导入的新建与编辑流程。
- 关键数量、总时间、步骤计时和提前准备精确时间被标记为 `inferred` 时必须清空；来源未确认的火候和文字时间保持为空。
- `confirmedAt` 只能由认证后的 Server Action 写入，AI 输出和客户端输入不能设置它。
- 不记录 API 密钥、来源全文、模型原始响应、字段提示或用户私有内容。
- 不执行 Supabase 远程写入、Production 发布、`main` 推送或 PR 创建/合并。
- 使用现有依赖，不安装新的 npm 包。
- 每项业务修改先写失败测试，再完成最小实现；每个任务独立提交，最后统一推送 `feat/recipe-app-shopping`。

---

## File Responsibility Map

- `src/features/recipe-imports/schemas.ts`：声明模型草稿、持久化草稿、字段检查与审核状态类型。
- `src/features/recipe-imports/quality-review.ts`：路径白名单、检查项归一化、关键值清空、警告去重和旧草稿兼容。
- `src/features/recipe-imports/recipe-ai-shared.ts`：共享提示词、AI JSON 解析和质量归一化入口。
- `src/features/recipe-imports/process.ts`：提供商选择、任务状态和审核草稿持久化。
- `src/features/recipe-imports/queries.ts`：从 JSON 安全读取新旧草稿。
- `src/features/recipe-imports/actions.ts`：用户确认动作以及完成导入时的服务端确认校验。
- `src/features/recipe-imports/components/import-review-panel.tsx`：字段状态摘要、分组列表与确认复选框。
- `src/features/recipes/components/recipe-editor.tsx`：只在导入模式接入审核面板和保存前门禁。
- `src/features/recipe-imports/components/import-progress.tsx`：失败原因、显式重试和降级入口。
- `src/app/(app)/recipes/import/[importId]/page.tsx`：把持久化审核数据传给编辑器。

---

### Task 1: Define the quality metadata contract and deterministic normalizer

**Files:**
- Modify: `src/features/recipe-imports/schemas.ts`
- Create: `src/features/recipe-imports/quality-review.ts`
- Create: `src/features/recipe-imports/quality-review.test.ts`
- Modify: `src/features/recipe-imports/schemas.test.ts`
- Modify: `src/features/recipe-imports/queries.ts`
- Modify: `src/features/recipe-imports/actions.test.ts`

**Interfaces:**
- Produces: `RecipeImportFieldStatus = "explicit" | "inferred" | "missing"`.
- Produces: `RecipeImportFieldCheck`, `RecipeImportReview`, `RecipeImportModelDraft`, and `RecipeImportDraft`.
- Produces: `buildRecipeImportQualityDraft(model: RecipeImportModelDraft): RecipeImportDraft`.
- Produces: `parseStoredRecipeImportDraft(value: unknown): RecipeImportDraft | null`.
- Consumes: existing ingredient, step, preparation, warnings, category, and tag fields without changing their business meaning.

- [ ] **Step 1: Write failing schema tests for model and stored drafts**

Add assertions that the model schema accepts checks but cannot accept a server confirmation field, while the stored schema requires normalized review metadata:

```ts
const model = recipeImportDraftModelSchema.parse({
  ...validDraft,
  fieldChecks: [
    { path: "ingredients.0.quantity", status: "missing", label: "鱼片的用量", message: "来源没有给出重量" },
  ],
});

expect(model.fieldChecks[0]?.status).toBe("missing");
expect(recipeImportDraftModelSchema.safeParse({
  ...validDraft,
  confirmedAt: "2026-08-31T10:00:00.000Z",
}).success).toBe(false);

expect(recipeImportDraftSchema.parse({
  ...validDraft,
  review: {
    fieldChecks: model.fieldChecks,
    requiresConfirmation: true,
    confirmedAt: null,
  },
}).review.requiresConfirmation).toBe(true);
```

- [ ] **Step 2: Run the focused schema test and verify it fails**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/schemas.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because the new field status, check, model draft, and review schemas do not exist.

- [ ] **Step 3: Split the schemas into content, model output, and persisted review forms**

Define the contract in `schemas.ts`:

```ts
export const recipeImportFieldStatusSchema = z.enum(["explicit", "inferred", "missing"]);

export const recipeImportFieldCheckSchema = z.object({
  path: z.string().trim().min(1).max(120),
  status: recipeImportFieldStatusSchema,
  label: z.string().trim().min(1).max(120),
  message: modelNullableText(200),
});

const recipeImportDraftContentSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: modelNullableText(500),
  baseServings: z.number().positive().max(1000),
  prepMinutes: modelNullableInteger(0, 10080),
  cookMinutes: modelNullableInteger(0, 10080),
  personalNotes: modelNullableText(4000),
  suggestedCategoryName: modelNullableText(40),
  suggestedTagNames: z.array(z.string().trim().min(1).max(40)).max(12),
  ingredients: ingredientDraftSchema.array().min(1).max(100),
  steps: stepDraftSchema.array().min(1).max(100),
  preparations: preparationDraftSchema.array().max(30).default([]),
  warnings: z.array(z.string().trim().min(1).max(200)).max(20),
});

export const recipeImportDraftModelSchema = recipeImportDraftContentSchema.extend({
  fieldChecks: recipeImportFieldCheckSchema.array().max(300).default([]),
}).strict();

export const recipeImportReviewSchema = z.object({
  fieldChecks: recipeImportFieldCheckSchema.array().max(300),
  requiresConfirmation: z.boolean(),
  confirmedAt: z.string().datetime({ offset: true }).nullable(),
});

export const recipeImportDraftSchema = recipeImportDraftContentSchema.extend({
  review: recipeImportReviewSchema,
}).strict();
```

Keep `recipeImportJsonSchema = z.toJSONSchema(recipeImportDraftModelSchema)` so both Qwen and Gemini receive only the model-safe contract.

- [ ] **Step 4: Write failing normalizer tests for paths, status priority, critical values, and warnings**

Cover these exact cases in `quality-review.test.ts`:

```ts
const result = buildRecipeImportQualityDraft({
  ...modelDraft,
  prepMinutes: 20,
  ingredients: [{ ...modelDraft.ingredients[0]!, quantity: 500, quantityText: null, unit: "克" }],
  fieldChecks: [
    { path: "prepMinutes", status: "inferred", label: "准备时间", message: "根据步骤估算" },
    { path: "ingredients.0.quantity", status: "explicit", label: "鱼片的用量", message: null },
    { path: "ingredients.0.quantity", status: "missing", label: "鱼片的用量", message: "来源不清楚" },
    { path: "__proto__.polluted", status: "explicit", label: "非法字段", message: null },
  ],
});

expect(result.prepMinutes).toBeNull();
expect(result.ingredients[0]?.quantity).toBeNull();
expect(result.review.fieldChecks).not.toEqual(expect.arrayContaining([
  expect.objectContaining({ path: "__proto__.polluted" }),
]));
expect(result.review.fieldChecks).toEqual(expect.arrayContaining([
  expect.objectContaining({ path: "ingredients.0.quantity", status: "missing" }),
]));
expect(result.review.requiresConfirmation).toBe(true);
```

Also assert that `quantityText="少许"` survives, `suggestedTagNames` inferred values survive, empty heat/timer/preparation fields receive `missing`, and warning strings are de-duplicated with a maximum of 20.

- [ ] **Step 5: Run the normalizer test and verify it fails**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/quality-review.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because `quality-review.ts` and its exported functions do not exist.

- [ ] **Step 6: Implement controlled paths and conservative normalization**

Implement these public functions in `quality-review.ts`:

```ts
export function isRecipeImportFieldPath(path: string, draft: RecipeImportModelDraft): boolean;

export function buildRecipeImportQualityDraft(
  model: RecipeImportModelDraft,
): RecipeImportDraft;

export function parseStoredRecipeImportDraft(
  value: unknown,
): RecipeImportDraft | null;
```

Use explicit root fields plus index-aware path maps:

```ts
const rootPaths = new Set([
  "title",
  "baseServings",
  "prepMinutes",
  "cookMinutes",
  "suggestedCategoryName",
  "suggestedTagNames",
]);

const indexedFields = {
  ingredients: new Set(["quantity", "quantityText", "unit", "groupType", "preparationNote"]),
  steps: new Set(["instruction", "heatLevel", "timerSeconds", "ingredientNames"]),
  preparations: new Set(["instruction", "leadTimeMinutes", "timingText"]),
} as const;

const statusRank = { explicit: 0, inferred: 1, missing: 2 } as const;
```

Generate labels from current ingredient names and one-based step/preparation numbers. Clear `prepMinutes`, `cookMinutes`, ingredient `quantity`, step `timerSeconds`, and preparation `leadTimeMinutes` when their final status is `inferred` or `missing`. Empty `heatLevel`, `quantityText`, `timingText`, category, and tags stay empty and receive `missing` checks. Do not clear inferred category/tag strings; surface them for review.

`parseStoredRecipeImportDraft` must first parse the new stored schema. If that fails, parse the legacy/model shape and pass it through `buildRecipeImportQualityDraft`; this preserves old import tasks while making them require confirmation.

- [ ] **Step 7: Use the stored-draft parser in query mapping**

Replace direct schema parsing in `queries.ts`:

```ts
const draft = row.draft ? parseStoredRecipeImportDraft(row.draft) : null;

return {
  ...,
  draft,
};
```

Add a test proving a legacy row without `review` maps to a non-null draft with `requiresConfirmation=true`, while malformed JSON maps to `null`.

- [ ] **Step 8: Run Task 1 tests**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/schemas.test.ts src/features/recipe-imports/quality-review.test.ts src/features/recipe-imports/actions.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: all schema, normalizer, legacy mapping, and existing action tests pass.

- [ ] **Step 9: Commit Task 1**

```powershell
git add src/features/recipe-imports/schemas.ts src/features/recipe-imports/schemas.test.ts src/features/recipe-imports/quality-review.ts src/features/recipe-imports/quality-review.test.ts src/features/recipe-imports/queries.ts src/features/recipe-imports/actions.test.ts
git commit -m "feat(recipe-import): add field quality metadata"
```

Expected: commit contains only schema, quality normalization, mapping, and focused tests.

---

### Task 2: Enrich AI extraction and persist normalized reviews

**Files:**
- Modify: `src/features/recipe-imports/recipe-ai-shared.ts`
- Modify: `src/features/recipe-imports/recipe-ai-shared.test.ts`
- Modify: `src/features/recipe-imports/qianwen-extractor.test.ts`
- Modify: `src/features/recipe-imports/gemini-extractor.test.ts`
- Modify: `src/features/recipe-imports/recipe-ai-extractor.test.ts`
- Modify: `src/features/recipe-imports/process.ts`
- Modify: `src/features/recipe-imports/process.test.ts`

**Interfaces:**
- Consumes: `recipeImportDraftModelSchema` and `buildRecipeImportQualityDraft` from Task 1.
- Produces: `parseRecipeImportDraftOutput(outputText: string, sourceText?: string): RecipeImportDraft`.
- Preserves: `createRecipeDraftExtractorForProvider("auto" | "qwen" | "gemini")` behavior.

- [ ] **Step 1: Write failing parser tests for quality checks and conservative critical values**

Extend `recipe-ai-shared.test.ts` with a model response containing explicit, inferred, and missing checks:

```ts
const draft = parseRecipeImportDraftOutput(JSON.stringify({
  ...modelOutput,
  prepMinutes: 15,
  fieldChecks: [
    { path: "ingredients.0.quantity", status: "explicit", label: "牛肉的用量", message: null },
    { path: "prepMinutes", status: "inferred", label: "准备时间", message: "根据步骤估算" },
    { path: "steps.0.heatLevel", status: "missing", label: "第 1 步火候", message: "来源未说明" },
  ],
}), sourceText);

expect(draft.prepMinutes).toBeNull();
expect(draft.review.fieldChecks).toEqual(expect.arrayContaining([
  expect.objectContaining({ path: "ingredients.0.quantity", status: "explicit" }),
]));
expect(draft.review.confirmedAt).toBeNull();
```

Add regression inputs for `豆瓣酱2勺`, `干锅酱一包`, `盐少许`, `炸五分钟`, `腌制30分钟`, and `提前一晚浸泡`.

- [ ] **Step 2: Run the shared parser test and verify it fails**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/recipe-ai-shared.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because the current parser returns the old draft shape without `review`.

- [ ] **Step 3: Expand the shared system prompt**

Keep the current injection boundary and add explicit instructions equivalent to:

```ts
"为 title、份数、总准备/烹饪时间、每个食材用量/单位/分组、每个步骤火候/计时/关联食材、每项提前准备时间、分类和标签返回 fieldChecks。",
"status 只能是 explicit、inferred 或 missing。来源直接写出或画面明确显示时用 explicit；上下文归类用 inferred；无法确认用 missing。",
"关键数量、火候和时间无法确认时必须返回 null，不能按常识补写。",
"分类和标签可以推断，但必须标记 inferred；不要自动创造营养结论。",
```

Retain the existing amount examples and `source-content` prompt-injection boundary.

- [ ] **Step 4: Parse model output first, then build the stored review draft**

Change the parser tail to:

```ts
export function parseRecipeImportDraftOutput(outputText: string, sourceText = "") {
  const normalized = normalizeDraftModel(JSON.parse(outputText) as unknown, sourceText);
  const model = recipeImportDraftModelSchema.parse(normalized);
  return buildRecipeImportQualityDraft(model);
}
```

Ensure `normalizeDraftModel` forwards normalized `fieldChecks` as an array instead of dropping them. Provider extractors continue calling this shared function and require no API request change.

- [ ] **Step 5: Add provider regression assertions**

In both provider extractor test files, make the mocked JSON include one check and assert:

```ts
expect(result.review).toMatchObject({
  requiresConfirmation: expect.any(Boolean),
  confirmedAt: null,
});
```

Also assert Qwen request model remains `qwen3.8-flash`, Gemini-only still uses configured Gemini, and automatic routing tests still prove Gemini is not called when Qwen succeeds.

- [ ] **Step 6: Add process persistence tests**

Extend `process.test.ts` to assert the update entering review contains both normalized draft metadata and de-duplicated warnings:

```ts
expect(update).toHaveBeenCalledWith(expect.objectContaining({
  status: "review",
  draft: expect.objectContaining({
    review: expect.objectContaining({
      requiresConfirmation: true,
      confirmedAt: null,
    }),
  }),
  warnings: expect.arrayContaining([expect.any(String)]),
  error_code: null,
}));
```

Keep `createRecipeDraftExtractorForProvider` unchanged and continue validating extractor results with `recipeImportDraftSchema` before persistence.

- [ ] **Step 7: Run provider and lifecycle tests**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/recipe-ai-shared.test.ts src/features/recipe-imports/qianwen-extractor.test.ts src/features/recipe-imports/gemini-extractor.test.ts src/features/recipe-imports/recipe-ai-extractor.test.ts src/features/recipe-imports/process.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: all normalization, Qwen, Gemini, fallback, and job lifecycle tests pass.

- [ ] **Step 8: Commit Task 2**

```powershell
git add src/features/recipe-imports/recipe-ai-shared.ts src/features/recipe-imports/recipe-ai-shared.test.ts src/features/recipe-imports/qianwen-extractor.test.ts src/features/recipe-imports/gemini-extractor.test.ts src/features/recipe-imports/process.ts src/features/recipe-imports/process.test.ts
git commit -m "feat(recipe-import): enrich extraction quality checks"
```

Expected: commit does not change environment variables, provider endpoints, database files, or public API routes.

---

### Task 3: Add authenticated review confirmation and the editor save gate

**Files:**
- Modify: `src/features/recipe-imports/actions.ts`
- Modify: `src/features/recipe-imports/actions.test.ts`
- Create: `src/features/recipe-imports/components/import-review-panel.tsx`
- Create: `src/features/recipe-imports/components/import-review-panel.test.tsx`
- Modify: `src/features/recipes/components/recipe-editor.tsx`
- Modify: `src/features/recipes/components/recipe-editor.test.tsx`
- Modify: `src/app/(app)/recipes/import/[importId]/page.tsx`

**Interfaces:**
- Produces: `confirmRecipeImportReviewAction(importId: string): Promise<ActionResult<{ confirmedAt: string }>>`.
- Produces: `ImportReviewPanel` with `review`, `acknowledged`, `onAcknowledgedChange`, and `checkboxRef` props.
- Extends: `RecipeEditorProps` with `importReview?: RecipeImportReview` while keeping ordinary create/edit callers unchanged.
- Consumes: `parseStoredRecipeImportDraft` and existing `finalizeRecipeImportAction`.

- [ ] **Step 1: Write failing Server Action tests for ownership, state, expiry, confirmation, and finalization**

Add these behaviors to `actions.test.ts`:

```ts
await expect(confirmRecipeImportReviewAction(importId)).resolves.toEqual({
  ok: true,
  data: { confirmedAt: expect.any(String) },
});

expect(update).toHaveBeenCalledWith(expect.objectContaining({
  draft: expect.objectContaining({
    review: expect.objectContaining({ confirmedAt: expect.any(String) }),
  }),
}));
```

Also verify unauthenticated, wrong-owner, non-`review`, expired, and malformed-draft requests return `ok:false`; no update occurs in those cases. Add a finalization test where `requiresConfirmation=true` and `confirmedAt=null` returns “请先确认 AI 推断和缺失内容” before any source upsert.

- [ ] **Step 2: Run the action test and verify it fails**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/actions.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because the confirmation action and finalization guard do not exist.

- [ ] **Step 3: Implement the authenticated confirmation action**

Implement this flow in `actions.ts`:

```ts
export async function confirmRecipeImportReviewAction(
  importId: string,
): Promise<ActionResult<{ confirmedAt: string }>> {
  const parsedId = z.string().uuid().safeParse(importId);
  if (!parsedId.success) return { ok: false, message: "导入任务无效" };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, message: "请先登录后再确认" };

  const result = await supabase
    .from("recipe_import_jobs")
    .select("id, status, draft, expires_at")
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  const draft = result.data ? parseStoredRecipeImportDraft(result.data.draft) : null;
  if (result.error || !result.data || !draft) return { ok: false, message: "导入任务不存在" };
  if (result.data.status !== "review") return { ok: false, message: "导入任务当前不能确认" };
  if (new Date(result.data.expires_at).getTime() <= Date.now()) return { ok: false, message: "导入任务已过期" };

  const confirmedAt = new Date().toISOString();
  const nextDraft = { ...draft, review: { ...draft.review, confirmedAt } };
  const updated = await supabase
    .from("recipe_import_jobs")
    .update({ draft: nextDraft as unknown as Json })
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .eq("status", "review")
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) return { ok: false, message: "确认失败，请重试" };
  return { ok: true, data: { confirmedAt } };
}
```

If `requiresConfirmation=false`, still return success and write a server confirmation timestamp only when called; the editor normally skips this call.

- [ ] **Step 4: Guard finalization before writing source data**

Immediately after mapping the owned job in `finalizeRecipeImportAction`:

```ts
if (
  job.draft?.review.requiresConfirmation
  && !job.draft.review.confirmedAt
) {
  return { ok: false, message: "请先确认 AI 推断和缺失内容" };
}
```

Preserve the existing idempotent early return for a task already saved to the same recipe.

- [ ] **Step 5: Write failing review panel tests**

Create `import-review-panel.test.tsx` with assertions for grouped statuses and the optional checkbox:

```tsx
render(
  <ImportReviewPanel
    acknowledged={false}
    checkboxRef={{ current: null }}
    onAcknowledgedChange={onChange}
    review={review}
  />,
);

expect(screen.getByText("来源明确")).toBeInTheDocument();
expect(screen.getByText("AI 推断")).toBeInTheDocument();
expect(screen.getByText("缺失待确认")).toBeInTheDocument();
expect(screen.getByText("鱼片的用量")).toBeInTheDocument();
await user.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
expect(onChange).toHaveBeenCalledWith(true);
```

Add a no-uncertainty case that shows “未发现需要特别确认的字段” and renders no checkbox.

- [ ] **Step 6: Run the component test and verify it fails**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/components/import-review-panel.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because `ImportReviewPanel` does not exist.

- [ ] **Step 7: Implement the accessible review panel**

Implement a focused component with stable status configuration:

```ts
const statusCopy = {
  explicit: { label: "来源明确", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  inferred: { label: "AI 推断", className: "border-amber-200 bg-amber-50 text-amber-950" },
  missing: { label: "缺失待确认", className: "border-destructive/30 bg-destructive/10 text-destructive" },
} as const;
```

Group checks by path prefix into basic information, ingredients and seasoning, steps and heat, preparations, and taxonomy. Render inferred/missing groups open; put explicit checks in a `<details>` element. Use a native labeled checkbox, `aria-describedby`, and a focusable section `id="recipe-import-review"`.

- [ ] **Step 8: Write failing editor gate tests**

Extend `recipe-editor.test.tsx`:

```tsx
render(
  <RecipeEditor
    mode="create"
    userId={userId}
    categories={[]}
    tags={[]}
    initialValue={initialValue}
    importId={importId}
    importReview={review}
    onSaved={onSaved}
    saveRecipe={saveRecipe}
  />,
);

await user.click(screen.getByRole("button", { name: "保存菜谱" }));
expect(saveRecipe).not.toHaveBeenCalled();
expect(screen.getByText("请先确认 AI 推断和缺失内容")).toBeInTheDocument();

await user.click(screen.getByRole("checkbox", { name: "我已检查以上 AI 推断和缺失内容" }));
await user.click(screen.getByRole("button", { name: "保存菜谱" }));
await waitFor(() => expect(confirmRecipeImportReviewAction).toHaveBeenCalledWith(importId));
await waitFor(() => expect(saveRecipe).toHaveBeenCalledTimes(1));
```

Add regressions proving ordinary create/edit without `importReview` does not render the panel and saves exactly as before, and `requiresConfirmation=false` skips the confirmation action.

- [ ] **Step 9: Integrate the gate into RecipeEditor and the import detail page**

Add these optional props:

```ts
type RecipeEditorProps = {
  // existing props
  importId?: string;
  importReview?: RecipeImportReview;
};
```

At the start of `onSubmit`, before media upload and `saveRecipe`:

```ts
if (importReview?.requiresConfirmation && !reviewAcknowledged) {
  setServerMessage("请先确认 AI 推断和缺失内容");
  reviewCheckboxRef.current?.focus();
  return;
}

if (
  importId
  && importReview?.requiresConfirmation
  && !importReview.confirmedAt
) {
  const confirmed = await confirmRecipeImportReviewAction(importId);
  if (!confirmed.ok) {
    setServerMessage(confirmed.message);
    reviewCheckboxRef.current?.focus();
    return;
  }
}
```

Render `ImportReviewPanel` directly below the sticky save header only when `importReview` exists. Pass `job.draft.review` from `src/app/(app)/recipes/import/[importId]/page.tsx` into `RecipeEditorPage`.

- [ ] **Step 10: Run Task 3 tests**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/actions.test.ts src/features/recipe-imports/components/import-review-panel.test.tsx src/features/recipes/components/recipe-editor.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: ownership, server confirmation, finalization guard, review rendering, focus behavior, confirmed save, and ordinary editor regressions all pass.

- [ ] **Step 11: Commit Task 3**

```powershell
git add src/features/recipe-imports/actions.ts src/features/recipe-imports/actions.test.ts src/features/recipe-imports/components/import-review-panel.tsx src/features/recipe-imports/components/import-review-panel.test.tsx src/features/recipes/components/recipe-editor.tsx src/features/recipes/components/recipe-editor.test.tsx 'src/app/(app)/recipes/import/[importId]/page.tsx'
git commit -m "feat(recipe-import): require draft review confirmation"
```

Expected: commit contains only confirmation, review UI, editor integration, and tests.

---

### Task 4: Replace automatic failure retries with explicit recovery

**Files:**
- Modify: `src/features/recipe-imports/components/import-progress.tsx`
- Modify: `src/features/recipe-imports/components/import-progress.test.tsx`
- Modify: `src/app/api/recipe-imports/[importId]/process/route.test.ts`

**Interfaces:**
- Produces: exported `getRecipeImportFailureInfo(errorCode: string | null): { title: string; description: string; retryable: boolean }`.
- Preserves: queued jobs start processing once; fetching/extracting jobs poll; review/saved jobs stop polling.
- Changes: failed jobs never retry until the user clicks “重新尝试”.

- [ ] **Step 1: Write failing tests for every stable error code**

Add table-driven assertions:

```ts
it.each([
  ["unsafe_url", "该链接不符合安全访问要求", false],
  ["source_unreadable", "页面内容无法公开读取", true],
  ["source_too_large", "页面内容过大", false],
  ["ai_rate_limited", "AI 请求过于频繁", true],
  ["ai_unauthorized", "AI 服务配置不可用", true],
  ["ai_unavailable", "AI 服务暂时不可用", true],
  ["invalid_ai_output", "AI 返回内容不完整", true],
  ["processing_failed", "导入处理失败", true],
])("maps %s to actionable copy", (code, text, retryable) => {
  expect(getRecipeImportFailureInfo(code)).toMatchObject({ retryable });
  expect(getRecipeImportFailureInfo(code).description).toContain(text);
});
```

- [ ] **Step 2: Write failing interaction tests for manual retry**

Render a failed task and assert no POST occurs on mount:

```ts
render(<ImportProgress importId={importId} initialStatus="failed" initialErrorCode="ai_unavailable" />);
await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());

await user.click(screen.getByRole("button", { name: "重新尝试" }));
expect(fetchMock).toHaveBeenCalledTimes(1);
expect(fetchMock).toHaveBeenCalledWith(
  `/api/recipe-imports/${importId}/process`,
  { method: "POST" },
);
```

Assert a second click is disabled while the first request is pending. For `unsafe_url` and `source_too_large`, assert no retry button exists. In every failure case assert links for `/recipes/import?mode=text`, `/recipes/import?mode=images`, and `/recipes/import` are present.

- [ ] **Step 3: Run the progress tests and verify they fail**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/components/import-progress.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because failed tasks currently auto-POST and do not expose code-specific retry controls.

- [ ] **Step 4: Implement local status and one-shot manual retry**

Use local state initialized from props:

```ts
const [status, setStatus] = useState<ImportStatus>(initialStatus);
const [retrying, setRetrying] = useState(false);
const [retryError, setRetryError] = useState<string | null>(null);
```

Only queued tasks auto-POST. Failed tasks remain terminal until the button calls:

```ts
async function retry() {
  if (retrying) return;
  setRetrying(true);
  setRetryError(null);
  try {
    const response = await fetch(`/api/recipe-imports/${importId}/process`, { method: "POST" });
    if (!response.ok) throw new Error("retry failed");
    setStatus("extracting");
    router.refresh();
  } catch {
    setRetryError("重新尝试失败，请稍后再试");
    setStatus("failed");
  } finally {
    setRetrying(false);
  }
}
```

Continue polling only for `fetching` and `extracting`. Render failure copy from `getRecipeImportFailureInfo(initialErrorCode)` and expose retry only when `retryable=true`.

- [ ] **Step 5: Verify the API route keeps stable codes and sanitized messages**

Extend the route test with `invalid_ai_output` and `ai_unavailable` process errors. Assert the response contains `{ ok:false, code, message }` with status 422 and does not contain provider bodies, source text, or API keys.

- [ ] **Step 6: Run Task 4 tests**

Run:

```powershell
npm.cmd test -- src/features/recipe-imports/components/import-progress.test.tsx 'src/app/api/recipe-imports/[importId]/process/route.test.ts' --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: copy mapping, no automatic failure retry, one-shot manual retry, non-retryable errors, fallback links, and API sanitization pass.

- [ ] **Step 7: Commit Task 4**

```powershell
git add src/features/recipe-imports/components/import-progress.tsx src/features/recipe-imports/components/import-progress.test.tsx 'src/app/api/recipe-imports/[importId]/process/route.test.ts'
git commit -m "fix(recipe-import): add explicit failure recovery"
```

Expected: commit contains no provider configuration or database changes.

---

### Task 5: Complete focused regression coverage and project documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `src/features/recipe-imports/draft-mapping.test.ts`

**Interfaces:**
- Produces: `npm.cmd run test:imports` as the repeatable module gate.
- Documents: field statuses, confirmation meaning, model defaults, and fallback input methods.

- [ ] **Step 1: Add a focused test script**

Add to `package.json`:

```json
"test:imports": "vitest run src/features/recipe-imports src/app/api/recipe-imports --pool=threads --maxWorkers=1 --no-file-parallelism"
```

- [ ] **Step 2: Update imported draft mapping fixtures to the stored draft shape**

In both `draft-mapping.test.ts` inputs that construct `RecipeImportDraft` directly, add this deterministic review fixture:

```ts
review: {
  fieldChecks: [],
  requiresConfirmation: false,
  confirmedAt: null,
},
```

Provider model JSON fixtures are updated in Task 2 with `fieldChecks: []` and must not include `confirmedAt`.

- [ ] **Step 3: Document the review behavior without exposing internals**

Add a short README section covering:

```md
### AI 导入审核

- 默认使用 Qwen 3.8 Flash；自动模式仅在可恢复失败时尝试已配置的 Gemini。
- “来源明确”表示 AI 在输入内容中识别到明确依据，不代表人工核验。
- 数量、火候或时间无法确认时保持为空，并在保存前要求用户检查。
- 链接无法公开读取时，可改用粘贴文案或上传截图。
```

Do not add environment values, API keys, copied source text, or provider response examples.

- [ ] **Step 4: Run the focused import gate**

Run:

```powershell
npm.cmd run test:imports
```

Expected: all recipe import schemas, providers, process lifecycle, actions, mapping, UI, uploads, URL safety, web extraction, and API route tests pass.

- [ ] **Step 5: Run recipe editor regressions**

Run:

```powershell
npm.cmd test -- src/features/recipes/components/recipe-editor.test.tsx src/features/recipe-imports/draft-mapping.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: ordinary recipe create/edit, imported draft mapping, timer units, media cleanup, and import confirmation behavior pass.

- [ ] **Step 6: Commit Task 5**

```powershell
git add package.json README.md src/features/recipe-imports src/features/recipes/components/recipe-editor.test.tsx
git commit -m "test(recipe-import): cover quality review workflow"
```

Expected: commit contains the focused script, README guidance, fixture updates, and regression tests only.

---

### Task 6: Run full quality gates, audit scope, and push the feature branch

**Files:**
- Verify all files changed in Tasks 1–5.
- Do not create or modify a Supabase migration.
- Do not modify Vercel environment variables or deployments.

**Interfaces:**
- Produces: a clean, pushed `feat/recipe-app-shopping` branch ready for Preview acceptance.
- Consumes: the repository scripts and existing GitHub remote.

- [ ] **Step 1: Run the focused module gate from a clean process**

Run:

```powershell
npm.cmd run test:imports
```

Expected: exit 0 with every recipe import and API route test passing.

- [ ] **Step 2: Run full TypeScript and ESLint checks**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
```

Expected: typecheck exits 0; lint exits 0 with no new warnings. Existing image optimization warnings may remain only if they predate this module.

- [ ] **Step 3: Run the complete Vitest suite**

Run:

```powershell
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism
```

Expected: all project tests pass, including meal plans, cooking history, recipes, shopping, offline sync, migrations, and security tests.

- [ ] **Step 4: Run the Production build**

Run:

```powershell
npm.cmd run build
```

Expected: Next.js Production build exits 0 and all import routes compile.

- [ ] **Step 5: Audit the working tree and sensitive information**

Run:

```powershell
git status --short
git diff --check
git diff origin/feat/recipe-app-shopping...HEAD --stat
git diff origin/feat/recipe-app-shopping...HEAD -- . ':!package-lock.json'
git diff origin/feat/recipe-app-shopping...HEAD | rg -n -i "(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|dashscope[_-]?api[_-]?key\s*[:=]\s*[^$])"
```

Expected: no uncommitted files, whitespace errors, unrelated changes, secrets, tokens, passwords, `.env.local`, user source text, or model response payloads. The last command should produce no credential match.

- [ ] **Step 6: Confirm the branch and commit history before push**

Run:

```powershell
git branch --show-current
git log --oneline --decorate -8
git status --short --branch
```

Expected: current branch is exactly `feat/recipe-app-shopping`; the module commits are present; the branch is ahead of `origin/feat/recipe-app-shopping`; the worktree is clean.

- [ ] **Step 7: Push only the current feature branch**

Run:

```powershell
git push origin feat/recipe-app-shopping
```

Expected: push succeeds without touching `main`, creating a PR, applying a Supabase migration, or promoting Production.

- [ ] **Step 8: Perform Preview acceptance and stop**

Verify in the Vercel Preview attached to `feat/recipe-app-shopping`:

1. Paste text with numeric and textual amounts; review states and values are correct.
2. Import a public link; missing quantity, heat, or time is empty and highlighted.
3. Import one screenshot; review panel remains usable on 360 px mobile width.
4. Choose auto, Qwen-only, and configured Gemini-only; all produce the same review contract.
5. Attempt save without confirmation; save is blocked and focus moves to the checkbox.
6. Confirm and save; recipe and source are stored once.
7. Trigger a failed URL import; no automatic retry occurs and fallback links work.
8. Confirm ordinary recipe create/edit does not show the AI review panel.

After these checks, report the branch, all module commit IDs, changed files, tests, known limitations, Preview URL, and the fact that no database or Production mutation occurred. Pause for user acceptance before module 11.

---

## Plan Self-Review

- **Spec coverage:** Task 1 covers schema, controlled paths, legacy drafts and conservative clearing; Task 2 covers prompts, Qwen/Gemini parity and persistence; Task 3 covers ownership, confirmation, UI and finalization; Task 4 covers precise errors and explicit retry; Task 5 covers fixtures and documentation; Task 6 covers full gates and Preview acceptance.
- **Placeholder scan:** The plan contains no unresolved placeholder, deferred implementation, generic “add tests” step, or undefined neighboring interface.
- **Type consistency:** AI providers return `RecipeImportDraft`; model JSON uses `RecipeImportModelDraft`; only `RecipeImportReview.confirmedAt` is server-written; `RecipeEditor` receives `RecipeImportReview` without modifying `RecipeSaveInput`.
- **Scope control:** No migration, dependency, provider, environment variable, ordinary recipe schema, Production deployment, PR, or `main` operation is included.
- **Security:** Task ownership is checked with `id + user_id`; finalization repeats the confirmation guard; controlled paths prevent arbitrary model strings from driving UI or database access; secret and private-content scanning is part of the final gate.
