# 食序模块 2：菜谱管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for each behavior change, supabase:supabase for every database/Auth/Storage task, and superpowers:verification-before-completion before reporting completion.

**Goal:** 在已完成的登录与导航基础上，交付只属于当前用户的菜谱 CRUD、分类标签、收藏搜索、食材步骤、步骤关联食材、私有图片和软删除恢复能力。

**Architecture:** 页面只消费 `recipes` 模块提供的类型化查询和 Server Actions。所有写入都由 Zod 校验；菜谱主体、标签、食材、步骤和步骤食材通过一个 `security invoker` PostgreSQL 函数在单个事务中保存。每张私人表都保留明确的 `user_id`，RLS 使用 `(select auth.uid()) = user_id`，并用复合外键阻止跨用户关联。图片在提交时由浏览器压缩后直传私有 Storage；全部上传成功后才提交数据库，数据库失败时清理本次新文件。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、shadcn/ui、Zod 4、React Hook Form、Supabase PostgreSQL/RLS/Storage、Vitest、Testing Library、PGlite。

**Base branch:** `feat/recipe-app-foundation-auth` at `a56794e`

**Implementation branch:** `feat/recipe-app-recipes`

**Primary references:**

- `docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md`
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Postgres extensions](https://supabase.com/docs/guides/database/extensions)
- [Supabase Next.js server-side auth](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## 1. Confirmed scope and non-goals

This module includes:

1. `profiles`, `categories`, `tags`, `recipes`, `recipe_tags`, `ingredients`, `recipe_ingredients`, `recipe_steps`, and `step_ingredients`.
2. Recipe list, search, category/tag filters, favorites view, trash view, create, detail, edit, soft delete, and restore.
3. Base servings, prep/cook time, personal notes, ordered ingredients, ordered steps, and step-to-ingredient links.
4. One private cover image and at most one private image per step.
5. Local migration/RLS/Storage contract tests and optional authorized non-production acceptance.

This module does not include:

- serving scaling or guided cooking;
- shopping lists;
- offline/PWA caching;
- AI or link/photo recipe import;
- family sharing or public recipes;
- permanent deletion UI;
- category/tag rename or deletion management.

Internal delivery checkpoints are commits, not user acceptance pauses. Finish the whole module, push it, then stop for user acceptance.

---

## 2. Database contract

Use `uuid` primary keys with `gen_random_uuid()` for Supabase portability. Every time column uses `timestamptz`. Every private table has a leading ownership index on `user_id`. Child tables duplicate the tenant key intentionally so RLS stays direct and fast; composite foreign keys guarantee the duplicated key cannot disagree with the parent.

### Tables and exact constraints

`profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text null check (display_name is null or char_length(trim(display_name)) between 1 and 80)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

`categories`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null check (char_length(trim(name)) between 1 and 40)`
- `sort_order integer not null default 0 check (sort_order >= 0)`
- timestamps
- `unique (user_id, id)` and case-insensitive unique index on `(user_id, lower(trim(name)))`

`tags`

- same ownership/timestamps as categories
- `name text not null check (char_length(trim(name)) between 1 and 30)`
- `unique (user_id, id)` and case-insensitive unique index on `(user_id, lower(trim(name)))`

`recipes`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `category_id uuid null`
- `title text not null check (char_length(trim(title)) between 1 and 100)`
- `description text null check (description is null or char_length(description) <= 500)`
- `cover_path text null`
- `base_servings numeric(8,2) not null check (base_servings > 0 and base_servings <= 1000)`
- `prep_minutes integer null check (prep_minutes between 0 and 10080)`
- `cook_minutes integer null check (cook_minutes between 0 and 10080)`
- `personal_notes text null check (personal_notes is null or char_length(personal_notes) <= 4000)`
- `is_favorite boolean not null default false`
- `deleted_at timestamptz null`
- timestamps
- `unique (user_id, id)`
- composite FK `(user_id, category_id) -> categories(user_id, id) on delete set null (category_id)` so deleting a category never clears the recipe owner.

`recipe_tags`

- `user_id uuid not null`
- `recipe_id uuid not null`
- `tag_id uuid not null`
- `created_at timestamptz not null default now()`
- primary key `(recipe_id, tag_id)`
- FK `(user_id, recipe_id) -> recipes(user_id, id) on delete cascade`
- FK `(user_id, tag_id) -> tags(user_id, id) on delete cascade`
- index `(user_id, recipe_id)` and `(user_id, tag_id)`

`ingredients`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `display_name text not null check (char_length(trim(display_name)) between 1 and 80)`
- `normalized_name text not null check (char_length(normalized_name) between 1 and 80)`
- `default_aisle text null check (default_aisle is null or char_length(default_aisle) <= 40)`
- timestamps
- `unique (user_id, id)` and `unique (user_id, normalized_name)`

`recipe_ingredients`

- `id uuid primary key`
- `user_id uuid not null`
- `recipe_id uuid not null`
- `ingredient_id uuid not null`
- `quantity numeric(12,3) null check (quantity is null or quantity > 0)`
- `quantity_text text null check (quantity_text is null or char_length(trim(quantity_text)) between 1 and 40)`
- `unit text null check (unit is null or char_length(trim(unit)) <= 20)`
- `preparation_note text null check (preparation_note is null or char_length(preparation_note) <= 120)`
- `sort_order integer not null check (sort_order >= 0)`
- timestamps
- `unique (user_id, id)`, `unique (user_id, recipe_id, id)`, and `unique (recipe_id, sort_order)`
- same-owner composite FKs to `recipes` and `ingredients`, both cascading on delete
- allow both quantity fields to be null for expressions such as “香菜，装饰用”

`recipe_steps`

- `id uuid primary key`
- `user_id uuid not null`
- `recipe_id uuid not null`
- `instruction text not null check (char_length(trim(instruction)) between 1 and 2000)`
- `image_path text null`
- `timer_seconds integer null check (timer_seconds between 1 and 86400)`
- `sort_order integer not null check (sort_order >= 0)`
- timestamps
- `unique (user_id, id)`, `unique (user_id, recipe_id, id)`, and `unique (recipe_id, sort_order)`
- same-owner composite FK to recipes, cascading on delete

`step_ingredients`

- `user_id uuid not null`
- `recipe_id uuid not null`
- `step_id uuid not null`
- `recipe_ingredient_id uuid not null`
- `quantity_override numeric(12,3) null check (quantity_override is null or quantity_override > 0)`
- `quantity_text_override text null check (quantity_text_override is null or char_length(trim(quantity_text_override)) between 1 and 40)`
- `note text null check (note is null or char_length(note) <= 120)`
- `created_at timestamptz not null default now()`
- primary key `(step_id, recipe_ingredient_id)`
- FK `(user_id, recipe_id, step_id) -> recipe_steps(user_id, recipe_id, id) on delete cascade`
- FK `(user_id, recipe_id, recipe_ingredient_id) -> recipe_ingredients(user_id, recipe_id, id) on delete cascade`
- these constraints reject cross-recipe links even for direct Data API writes that bypass `save_recipe`

### RLS and grants

- Enable and force RLS on all nine public tables.
- Revoke all table privileges from `anon`.
- Grant only `select, insert, update, delete` needed by `authenticated`; policies remain the ownership gate.
- `profiles` checks `(select auth.uid()) = id`.
- Every other table uses `to authenticated` plus `(select auth.uid()) = user_id` in `using` and `with check` as appropriate.
- UPDATE gets both SELECT and UPDATE policies.
- Index every ownership/FK column used by a policy or join.
- Application queries still add `.eq("user_id", user.id)`; RLS is the security boundary, not the only filter.

### Search

- Enable `pg_trgm` in the `extensions` schema.
- Add trigram GIN indexes for recipe title, ingredient `normalized_name`, and tag name.
- Create `search_recipe_summaries(p_query text, p_category_id uuid, p_tag_id uuid, p_favorite_only boolean, p_deleted_only boolean, p_limit integer, p_offset integer)`.
- Function is `stable security invoker set search_path = ''`, limits `p_limit` to `1..100`, requires an authenticated user, filters `r.user_id = (select auth.uid())`, and matches query text against title, associated ingredient names, or associated tag names.
- Empty query means no keyword filter. Normal list uses `p_deleted_only = false`; trash uses `true`.
- Return columns are `recipe_id`, `title`, `description`, `cover_path`, `base_servings`, `prep_minutes`, `cook_minutes`, `is_favorite`, `category_id`, `category_name`, `tags jsonb`, `updated_at`, and `total_count`; sort by `updated_at desc, recipe_id desc` for stable pagination.
- Revoke function execution from `public` and `anon`; grant only to `authenticated`.

### Atomic aggregate save

Create `save_recipe(p_payload jsonb) returns uuid` as `security invoker set search_path = ''`. It must:

1. Require `(select auth.uid())` and reject missing authentication.
2. Validate the recipe ID is either new or owned by the caller; never restore a deleted recipe implicitly.
3. Validate category/tag ownership.
4. Upsert normalized ingredients only within the caller's tenant.
5. Upsert the recipe root, replace recipe-tag links, recipe ingredients, steps, and step links inside one PostgreSQL transaction.
6. Preserve client-generated `recipeIngredientId` and `stepId` values.
7. Reject duplicate sort orders, duplicate IDs, and cross-recipe step links.
8. Return the recipe UUID.

The JSON payload is exactly:

```ts
export type RecipeSaveInput = {
  recipeId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  tagIds: string[];
  coverPath: string | null;
  baseServings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  personalNotes: string | null;
  ingredients: Array<{
    recipeIngredientId: string;
    name: string;
    quantity: number | null;
    quantityText: string | null;
    unit: string | null;
    preparationNote: string | null;
    sortOrder: number;
  }>;
  steps: Array<{
    stepId: string;
    instruction: string;
    imagePath: string | null;
    timerSeconds: number | null;
    sortOrder: number;
    ingredientLinks: Array<{
      recipeIngredientId: string;
      quantityOverride: number | null;
      quantityTextOverride: string | null;
      note: string | null;
    }>;
  }>;
};
```

### Storage

- Private bucket ID: `recipe-media`.
- `public = false`, `file_size_limit = 5242880`, allowed MIME types `image/jpeg`, `image/png`, `image/webp`.
- Object paths:
  - `{userId}/recipes/{recipeId}/cover/{assetId}.webp`
  - `{userId}/recipes/{recipeId}/steps/{stepId}/{assetId}.webp`
- `storage.objects` policies permit authenticated SELECT, INSERT, and DELETE only when `bucket_id = 'recipe-media'` and the first folder equals `(select auth.uid())::text`.
- Do not grant UPDATE because uploads use unique paths with `upsert: false`; replacement is upload-new, save-new-path, delete-old.
- Database rows store only object paths, never public URLs or signed URLs.

---

## 3. Typed application interfaces

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  baseServings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  isFavorite: boolean;
  category: { id: string; name: string } | null;
  tags: Array<{ id: string; name: string }>;
  updatedAt: string;
};

export type RecipeListResult = {
  items: RecipeSummary[];
  totalCount: number;
};

export type RecipeDetail = RecipeSummary & {
  personalNotes: string | null;
  coverPath: string | null;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number | null;
    quantityText: string | null;
    unit: string | null;
    preparationNote: string | null;
    sortOrder: number;
  }>;
  steps: Array<{
    id: string;
    instruction: string;
    imagePath: string | null;
    imageUrl: string | null;
    timerSeconds: number | null;
    sortOrder: number;
    ingredientLinks: Array<{
      recipeIngredientId: string;
      quantityOverride: number | null;
      quantityTextOverride: string | null;
      note: string | null;
    }>;
  }>;
};
```

All Supabase clients become `SupabaseClient<Database>` by passing the checked-in `Database` schema contract to `createServerClient` and `createBrowserClient`. This hand-maintained contract is replaced by `supabase gen types` after an authorized non-production project is linked; until then, a test must keep its table/function names aligned with the migration.

---

## 4. Implementation tasks

### Task 1: Add bounded dependencies and Supabase migration scaffolding

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create through CLI: `supabase/config.toml`
- Create through CLI: generated migration file for `recipe_management`
- Create: `src/test/database/bootstrap.ts`
- Create: `src/test/database/load-migrations.ts`

**Steps:**

1. Run the current test suite before changes and record the 11-test baseline.
2. Install exact versions:

```powershell
npm.cmd install --save-exact react-hook-form@7.86.0 @hookform/resolvers@5.9.1 browser-image-compression@2.0.2
npm.cmd install --save-dev --save-exact supabase@2.115.0 @electric-sql/pglite@0.5.6
```

3. Use `npm.cmd exec supabase -- init` only if `supabase/config.toml` is absent.
4. Use `npm.cmd exec supabase -- migration new recipe_management`; use the exact filename printed by the CLI for all subsequent edits. Never invent or rename the timestamp.
5. Add `test:db` and `test:recipes` scripts. `test:db` runs only database contract tests; `test:recipes` runs recipe unit/component tests.
6. Add PGlite bootstrap that creates minimal `auth` and `storage` schemas, `anon`/`authenticated` roles, `auth.users`, `auth.uid()`, `storage.buckets`, `storage.objects`, and `storage.foldername(text)` before loading the generated migration.
7. Run existing tests, typecheck, lint, and `git diff --check`.
8. Commit: `chore(recipes): add database test foundation`.

Do not start Docker, link a Supabase project, run `db push`, or touch a remote database in this task.

---

### Task 2: Implement schema, ownership constraints, RLS, RPCs, and private Storage

**Files:**

- Modify: CLI-generated `supabase/migrations/*_recipe_management.sql`
- Create: `src/test/database/recipe-management-migration.test.ts`

**Test-first cases:**

1. All nine tables and the private `recipe-media` bucket exist.
2. Every public table has RLS enabled and forced.
3. `anon` has no table/function privileges.
4. User A can insert/select/update/delete only rows whose `user_id` is A; User B cannot read or mutate them.
5. Composite FKs reject a category, tag, ingredient, step, or link owned by another user.
6. `save_recipe` inserts a complete aggregate and replaces nested rows atomically on edit.
7. Invalid nested payload rolls the whole save back.
8. `search_recipe_summaries` matches title, ingredient, and tag independently; filters category/favorite/trash; never returns another user's recipe.
9. Storage permits A's SELECT/INSERT/DELETE path, rejects B's path, and has no UPDATE policy.
10. Active recipe, favorite, ownership, FK, sort, and trigram indexes exist.

**Steps:**

1. Write the migration tests and confirm failure against the empty generated migration.
2. Implement the exact database contract in Sections 2 and 3.
3. Add one `set_updated_at()` trigger function and attach it to mutable tables.
4. Add `handle_new_user()` for future Auth signups and a safe backfill for existing `auth.users` profiles. The trigger function is `security definer set search_path = ''`; revoke direct execution from `public`, `anon`, and `authenticated`.
5. Add the search and atomic-save RPCs with explicit empty `search_path`, revoked public execution, and authenticated-only grants.
6. Insert/update the private bucket idempotently, but do not alter unrelated buckets.
7. Run `npm.cmd run test:db`, then full test/typecheck/lint and `git diff --check`.
8. Inspect SQL for `service_role`, permissive `using (true)`, unqualified security-sensitive objects, or anon grants.
9. Commit: `feat(db): add private recipe data model`.

---

### Task 3: Add typed Supabase contract and recipe validation

**Files:**

- Create: `src/lib/supabase/database.types.ts`
- Modify: `src/lib/supabase/server.ts`
- Modify: `src/lib/supabase/browser.ts`
- Modify: `src/lib/supabase/middleware.ts`
- Create: `src/features/recipes/types.ts`
- Create: `src/features/recipes/schemas.ts`
- Create: `src/features/recipes/normalization.ts`
- Create: `src/features/recipes/schemas.test.ts`
- Create: `src/features/recipes/normalization.test.ts`

**Required validation:**

- UUIDs for recipe, step, recipe-ingredient, category, and tag IDs.
- Title 1–100 trimmed characters; description max 500; notes max 4000.
- Base servings `> 0` and `<= 1000`.
- Minutes are integers `0..10080`; timer seconds integer `1..86400`.
- At least one ingredient and at least one step.
- Ingredient name 1–80; quantity either null or positive; text quantity max 40; unit max 20; note max 120.
- Step instructions 1–2000.
- Sort orders are rewritten to contiguous zero-based values before submission.
- Every step ingredient link references an ingredient in the same payload; duplicate links and IDs are rejected.
- Empty optional text becomes `null`, never an empty database string.
- `normalizeIngredientName` applies Unicode NFKC, trim, lower-case, and collapses internal whitespace; it does not translate or guess aliases.

**Steps:**

1. Write failing schema/normalization tests including Chinese names, `少许`, blank optional fields, duplicate IDs, and cross-reference failures.
2. Implement the interfaces from Section 3 and the Zod schema matching `RecipeSaveInput` exactly.
3. Add the `Database` interface for all nine tables, both RPCs, and Storage-safe scalar types.
4. Pass `Database` to all three Supabase client factories without changing their cookie behavior.
5. Run focused tests, typecheck, lint, and `git diff --check`.
6. Commit: `feat(recipes): add typed recipe contracts`.

---

### Task 4: Build the read repository and signed-image mapping

**Files:**

- Create: `src/features/recipes/queries.ts`
- Create: `src/features/recipes/query-params.ts`
- Create: `src/features/recipes/query-params.test.ts`
- Create: `src/features/media/signed-urls.ts`
- Create: `src/features/media/signed-urls.test.ts`

**Interfaces:**

```ts
export type RecipeListQuery = {
  query: string;
  categoryId: string | null;
  tagId: string | null;
  favoriteOnly: boolean;
  deletedOnly: boolean;
  page: number;
};

export async function listRecipeSummaries(input: RecipeListQuery): Promise<RecipeListResult>;
export async function getRecipeDetail(recipeId: string): Promise<RecipeDetail | null>;
export async function listRecipeTaxonomy(): Promise<{
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}>;
```

**Behavior:**

- Parse URL parameters through Zod; invalid UUID/filter/page values fall back safely.
- Use the search RPC with a page size of 24.
- Always get the authenticated user via `auth.getUser()` and add explicit `user_id` filters to child detail queries.
- Return `null` for missing, foreign-owned, or soft-deleted detail rows; do not reveal which case occurred.
- Batch all non-null object paths into one `createSignedUrls(paths, 3600)` call.
- Deduplicate paths and map failures to `null`; never persist signed URLs.

**Steps:**

1. Write failing pure tests for query parsing and signed-path deduplication/mapping.
2. Implement query parameter parsing.
3. Implement signed URL helper behind an injected Storage client so it is unit-testable.
4. Implement list/taxonomy/detail queries and map database rows to the exact view models.
5. Run focused tests, typecheck, lint, and `git diff --check`.
6. Commit: `feat(recipes): add private recipe queries`.

---

### Task 5: Implement category/tag, save, favorite, delete, and restore actions

**Files:**

- Create: `src/features/recipes/actions.ts`
- Create: `src/features/recipes/actions.test.ts`
- Create: `src/features/recipes/cache.ts`

**Interfaces:**

```ts
export async function saveRecipeAction(input: unknown): Promise<ActionResult<{ recipeId: string }>>;
export async function createCategoryAction(name: string): Promise<ActionResult<{ id: string; name: string }>>;
export async function createTagAction(name: string): Promise<ActionResult<{ id: string; name: string }>>;
export async function setRecipeFavoriteAction(recipeId: string, favorite: boolean): Promise<ActionResult<null>>;
export async function moveRecipeToTrashAction(recipeId: string): Promise<ActionResult<null>>;
export async function restoreRecipeAction(recipeId: string): Promise<ActionResult<null>>;
```

**Behavior:**

- Every action starts with `auth.getUser()`; never accepts `user_id`.
- Save parses the full Zod schema, calls `save_recipe`, revalidates `/recipes`, `/favorites`, `/recipes/{id}`, and redirects only in the page orchestration layer.
- Category/tag create trims names and treats same-user case-insensitive conflicts as “already exists”, returning the existing row.
- Favorite/delete/restore use `.eq("user_id", user.id)` plus the ID and correct deleted-state predicate.
- All user-facing failures are generic Chinese messages; server logs contain operation name and Supabase error code, never payload contents, tokens, or paths beyond the current user's object key.
- Tests mock the Supabase boundary and prove user IDs cannot be supplied or used from input.

**Steps:**

1. Write failing tests for unauthenticated calls, validation errors, ownership filters, RPC errors, revalidation, favorite, trash, and restore.
2. Implement a shared authenticated client guard and cache revalidation helper.
3. Implement the actions without service-role access or elevated keys.
4. Run focused tests, typecheck, lint, and `git diff --check`.
5. Commit: `feat(recipes): add recipe mutations`.

---

### Task 6: Implement safe client-side image preparation and upload orchestration

**Files:**

- Create: `src/features/media/constants.ts`
- Create: `src/features/media/image-validation.ts`
- Create: `src/features/media/image-validation.test.ts`
- Create: `src/features/media/upload-recipe-media.ts`
- Create: `src/features/media/upload-recipe-media.test.ts`

**Exact rules:**

- Input types: JPEG, PNG, WebP only.
- Reject an original file above 15 MiB before compression.
- Compress in the browser to WebP, max dimension 1600 px, target max 2 MiB.
- Reject compressed output above the bucket's 5 MiB limit.
- Create asset IDs with `crypto.randomUUID()` and upload using `upsert: false`.
- Cover and step paths exactly follow Section 2.
- Upload only during final form submission, not when a file is selected.
- If any upload fails, delete every object uploaded by that attempt.
- If database save fails, delete every new object from that attempt.
- After a successful save, delete replaced old object paths best-effort; failure must be logged and must not roll back the valid recipe.
- Validate that every path scheduled for deletion starts with the current user's expected recipe prefix.

**Steps:**

1. Write failing unit tests for MIME/size rejection, safe path building, multi-upload cleanup, database-failure cleanup, and refusal to delete an unrelated prefix.
2. Implement image validation/compression adapter and keep the compression library behind an injected function for tests.
3. Implement upload orchestration against the browser Supabase client.
4. Revoke object URLs in the consuming component on replacement/unmount; cover this in the editor tests.
5. Run focused tests, typecheck, lint, and `git diff --check`.
6. Commit: `feat(media): add private recipe image uploads`.

---

### Task 7: Build the recipe editor in small components

**Files:**

- Add through shadcn CLI: `src/components/ui/textarea.tsx`
- Add through shadcn CLI: `src/components/ui/select.tsx`
- Add through shadcn CLI: `src/components/ui/checkbox.tsx`
- Add through shadcn CLI: `src/components/ui/badge.tsx`
- Add through shadcn CLI: `src/components/ui/dialog.tsx`
- Create: `src/features/recipes/components/recipe-editor.tsx`
- Create: `src/features/recipes/components/recipe-basics-fields.tsx`
- Create: `src/features/recipes/components/ingredient-fields.tsx`
- Create: `src/features/recipes/components/step-fields.tsx`
- Create: `src/features/recipes/components/image-picker.tsx`
- Create: `src/features/recipes/components/recipe-editor.test.tsx`
- Create: `src/app/(app)/recipes/new/page.tsx`
- Create: `src/app/(app)/recipes/[recipeId]/edit/page.tsx`

**Editor behavior:**

- Use React Hook Form and `useFieldArray`; do not create a global state store.
- New form starts with one blank ingredient and one blank step, each with a stable `crypto.randomUUID()` ID.
- Add/remove and explicit up/down buttons provide accessible ordering; drag-and-drop is deferred.
- Step ingredient links select only ingredients currently in the same form. Removing an ingredient removes its links after a confirmation when links exist.
- Category and tags can be selected; “新建分类/标签” calls focused actions and updates options without losing form content.
- Image picker shows local preview, alt text, type/size error, replace, and remove.
- Submit order: client schema validation → compress/upload all changed images → call `saveRecipeAction` → cleanup based on result → navigate to detail.
- Disable duplicate submit and show the current phase: “正在处理图片” or “正在保存菜谱”.
- Warn before leaving with unsaved changes using browser `beforeunload`; in-app link interception is not added in this module.
- The form is one column on mobile and uses a wider two-column basic-information section on desktop.

**Test-first cases:**

1. New editor renders one ingredient/step and labels all controls.
2. Add/remove/reorder rewrites sort order.
3. Step links update when an ingredient is removed.
4. Validation keeps entered values and focuses the first error.
5. Submit calls media upload before save and navigates only on success.
6. Failed save cleans new uploads and leaves the form usable.
7. Object preview URLs are revoked.

**Steps:**

1. Add only the listed shadcn components with `npx.cmd shadcn@4.19.0 add`.
2. Write failing component tests with upload/action adapters mocked.
3. Implement the editor components one at a time; keep each file focused.
4. New/edit pages load taxonomy; edit also loads detail and calls `notFound()` for inaccessible/deleted recipes.
5. Run focused tests, typecheck, lint, and `git diff --check`.
6. Commit: `feat(recipes): build recipe editor`.

---

### Task 8: Build recipe list, search, filters, favorites, and trash

**Files:**

- Create: `src/features/recipes/components/recipe-card.tsx`
- Create: `src/features/recipes/components/recipe-grid.tsx`
- Create: `src/features/recipes/components/recipe-search-filters.tsx`
- Create: `src/features/recipes/components/favorite-button.tsx`
- Create: `src/features/recipes/components/recipe-list-empty.tsx`
- Create: `src/features/recipes/components/recipe-list.test.tsx`
- Modify: `src/app/(app)/recipes/page.tsx`
- Modify: `src/app/(app)/favorites/page.tsx`

**Behavior:**

- `/recipes` reads `q`, `category`, `tag`, `view`, and `page` search params; `view=trash` is the only trash mode.
- Search submits as GET so filtered URLs are shareable within the user's own session.
- Cards show signed cover or a neutral placeholder, title, category, tags, servings, total time, and favorite control.
- Search input has a visible label; filters are keyboard accessible; active filters can be cleared individually.
- Normal empty state offers “新建菜谱”. Filtered empty state offers “清除筛选”. Trash empty state has no destructive action.
- `/favorites` reuses the same list with `favoriteOnly=true`; it does not duplicate query/component logic.
- Favorite mutation uses optimistic UI with rollback and an accessible pending state.
- Pagination preserves all filters and caps page size at 24.

**Steps:**

1. Write failing component tests for normal/filtered/trash empty states, card semantics, filter URLs, and favorite rollback.
2. Implement shared components.
3. Replace both placeholders with server-rendered list pages.
4. Verify 360 px and desktop structure through component assertions; browser visual acceptance happens in Task 10.
5. Run focused tests, full tests, typecheck, lint, build, and `git diff --check`.
6. Commit: `feat(recipes): add recipe discovery views`.

---

### Task 9: Build detail, soft-delete confirmation, and restore flow

**Files:**

- Create: `src/features/recipes/components/recipe-detail.tsx`
- Create: `src/features/recipes/components/recipe-actions.tsx`
- Create: `src/features/recipes/components/recipe-delete-dialog.tsx`
- Create: `src/features/recipes/components/recipe-detail.test.tsx`
- Create: `src/app/(app)/recipes/[recipeId]/page.tsx`
- Create: `src/app/(app)/recipes/[recipeId]/loading.tsx`
- Create: `src/app/(app)/recipes/[recipeId]/not-found.tsx`
- Modify: `src/app/(app)/recipes/page.tsx`

**Behavior:**

- Detail shows cover, metadata, ordered ingredients, ordered steps, step images, linked ingredient names, and personal notes.
- Quantity rendering keeps numeric and text quantities distinct; no serving scaling is implemented here.
- Edit and favorite are available for active recipes.
- Delete requires a dialog naming the recipe and explains it can be restored; success returns to `/recipes`.
- Trash cards show Restore; restore returns the recipe to the normal list.
- Missing, foreign-owned, and deleted direct detail URLs all use the same not-found surface.
- Do not show a “开始烹饪” control until Module 3 can fulfill it.

**Steps:**

1. Write failing detail tests for order, linked ingredients, accessible images, no cooking CTA, delete confirmation, and restore.
2. Implement detail and actions.
3. Add loading and not-found states without leaking ownership information.
4. Run focused tests, full tests, typecheck, lint, build, and `git diff --check`.
5. Commit: `feat(recipes): add recipe detail and recovery`.

---

### Task 10: Verify the complete module and perform only authorized live checks

**Files:**

- Modify: `README.md`
- Create: `docs/testing/module-2-recipe-management-acceptance.md`
- Modify only if verification finds an in-scope defect: Module 2 files.

**Code-level verification:**

```powershell
npm.cmd test
npm.cmd run test:db
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
git status --short --branch
git diff --stat a56794e...HEAD
git grep -n -I -E "service_role|SUPABASE_SERVICE_ROLE|eyJ[a-zA-Z0-9_-]{20,}|password=" -- . ":(exclude)package-lock.json"
npm.cmd audit --omit=dev
```

Record exact pass counts and any advisory that cannot be fixed without a major framework upgrade. Do not claim an audit warning is fixed unless the installed dependency graph proves it.

**Required browser acceptance using a local server:**

1. Login surface still renders at 360 px and desktop widths.
2. Recipes/favorites pages render responsive shells without horizontal overflow.
3. New/edit forms, dialogs, reordering, keyboard focus, errors, and loading states are usable.
4. Production build runs with safe test public values, but this does not prove real Supabase.

**Optional non-production Supabase acceptance:**

Only when the user has explicitly confirmed a non-production project and supplied local credentials without exposing them:

1. Run `npm.cmd exec supabase -- migration list` to confirm project identity before mutation.
2. Run `npm.cmd exec supabase -- db push --dry-run` and inspect the exact migration.
3. Apply the migration only to that confirmed non-production project.
4. Generate types with `npm.cmd exec supabase -- gen types typescript --linked`, replace the hand-maintained `Database` contract, and rerun typecheck/tests.
5. Use two authorized test users to prove cross-user database and Storage denial.
6. Create/edit/search/favorite/delete/restore a complete recipe with cover and step image.
7. Confirm the bucket is private and signed URLs expire.

If credentials, Docker, project identity, or email authorization are absent, mark live acceptance pending. Do not connect to production, deploy Vercel, create a PR, or alter `main`.

**Final steps:**

1. Update README with Module 2 setup, migration, private bucket, test commands, and live-validation boundary.
2. Create acceptance evidence without secret values.
3. Commit docs/verification fixes as `docs(recipes): document recipe management setup`.
4. Inspect all commits and ensure no unrelated file is present.
5. Push without force:

```powershell
git push -u origin feat/recipe-app-recipes
```

6. Report and stop for user acceptance using the required module format:
   - completed functions;
   - files grouped by responsibility;
   - database/API/config changes;
   - tests and authorized live results;
   - known issues and pending environment validation;
   - Module 3 as the possible next module, without starting it;
   - branch, every commit ID/message, push result, and GitHub branch link.

---

## 5. Plan self-review

- Spec coverage: all Module 2 requirements are assigned to Tasks 2–9.
- Security: no service role, public bucket, client-supplied owner ID, or production action is required.
- Transaction boundary: database aggregate save is atomic; external Storage uses compensating cleanup because PostgreSQL and object storage cannot share one transaction.
- Search: title, ingredient, and tag matching is database-backed and Chinese-compatible at substring level; no external engine or AI is introduced.
- Recovery: delete is soft and restore is available; permanent delete is intentionally deferred.
- Module boundaries: scaling/cooking, shopping, offline, and AI remain untouched.
- File size: each task limits itself to one responsibility and ends with focused verification plus a commit.
- Placeholders: the implementation contains no disabled future controls and the plan contains no unspecified business decision that blocks coding.
