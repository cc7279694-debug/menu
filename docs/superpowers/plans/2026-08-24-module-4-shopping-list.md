# Module 4 Shopping List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, synchronized current shopping list that can be generated from one or more recipes, conservatively merges compatible numeric quantities, preserves source snapshots, and supports everyday list editing and checking.

**Architecture:** A normalized Supabase schema stores shopping-list, source, item, and item-source snapshots with forced RLS and explicit authenticated grants. Server Actions re-fetch owned recipe data, run deterministic TypeScript scaling/merge functions, then call a security-invoker PostgreSQL function to atomically deactivate the old current list and create the new one. The `/shopping` Server Component loads the current list; small Client Components handle recipe selection, exclusions, item mutations, and responsive interaction.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, Zod 4, Supabase Auth/PostgreSQL, Next.js Server Actions, Vitest, Testing Library, PGlite.

**Spec:** `docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md`

## Global Constraints

- Keep the fixed stack; do not add a separate backend service or a new runtime dependency.
- Module 4 is online-only. Service Worker, Cache Storage, IndexedDB, offline mutation queues, and recovery synchronization remain Module 5.
- The UI emphasizes one current list. Replacing it deactivates the previous list instead of deleting history; no history browser is added in this module.
- A generated list is a snapshot. Later recipe title, amount, aisle, or deletion changes must not silently rewrite it.
- Merge only when every fact is certain: the same owned `ingredient_id`, numeric amounts, no text amount, and exactly compatible normalized units. Do not convert `克`/`g`, `千克`/`克`, `毫升`/`升`, or guessed synonyms.
- Text amounts, missing amounts, incompatible units, manual items, and uncertain identities remain separate rows.
- Target servings use the existing contract: 0.25 through 1000 inclusive, at most two decimal places.
- Generation accepts 1–20 recipes and at most 500 candidate ingredients. Item quantities are stored at three-decimal precision.
- Every new public table uses forced RLS, ownership predicates with `(select auth.uid()) = user_id`, a leading `user_id` index, explicit grants to `authenticated`, and no grant to `anon`.
- Database functions use `security invoker`, `set search_path = ''`, schema-qualified names, authentication/ownership validation, and explicit execute grants only to `authenticated`.
- Never expose a service-role key, connect to production, apply a remote migration, deploy, merge to main/master, or create a PR in this module.
- UI copy is Chinese-first, keyboard accessible, at least 44px for mobile actions, and verified at 360px and desktop widths.
- Use tests first, keep each task independently reviewable, and make one Conventional Commit per accepted task.

## Confirmed Design Decisions

### Generation approaches considered

1. **Recommended: TypeScript merge plus transactional PostgreSQL persistence.** Pure TypeScript keeps unit/amount rules readable and exhaustively testable; a single RPC preserves multi-table atomicity. The Server Action re-fetches source data and never trusts a client-composed draft.
2. **All generation in PL/pgSQL.** This maximizes database centralization but makes cautious unit rules and source projection harder to test and maintain.
3. **Direct multi-table writes from Server Actions.** This is superficially simple but cannot guarantee all-or-nothing replacement without a transaction boundary.

Use approach 1.

### Merge contract

For each selected recipe ingredient, create a source contribution using `quantity * targetServings / baseServings`, rounded to three decimals. A contribution is mergeable only when `quantity` is finite and positive, `quantityText` is null, and its normalized unit exactly matches. Unit normalization performs Unicode NFKC normalization, trimming, whitespace collapse, and lowercase conversion for Latin characters; it performs no unit conversion. Merge keys are `ingredientId + normalizedUnit`. Non-mergeable contributions receive their own deterministic key containing the recipe ingredient ID.

### Database contract

- `shopping_lists`: one active row per user via a partial unique index; inactive rows are preserved.
- `shopping_list_sources`: one row per selected recipe, storing nullable `recipe_id`, recipe-title snapshot, and selected servings.
- `shopping_list_items`: item snapshots, optional standard ingredient reference, amount, unit, aisle, checked/manual flags, and sort order.
- `shopping_list_item_sources`: one row per original contribution, including recipe-ingredient reference plus amount/unit snapshots so merged totals remain explainable.
- Child tables duplicate `user_id` and `shopping_list_id` to support efficient RLS and composite ownership foreign keys.

### Current Supabase requirements checked on 2026-08-24

- New public tables may not be exposed to the Data API automatically, so the migration explicitly revokes and grants table privileges.
- RLS policies use role-specific `to authenticated`, indexed `user_id`, and both `using` and `with check` for updates.
- Public functions revoke the default `PUBLIC` execute privilege and grant only the intended signatures to `authenticated`.
- The implementation creates its migration with the local Supabase CLI and validates it with PGlite; no remote project is required.

Official references: [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Database functions](https://supabase.com/docs/guides/database/functions), and [Database migrations](https://supabase.com/docs/guides/local-development/overview).

---

### Task 1: Shopping Schema, RLS, Atomic Replacement, and Generated Types

**Files:**
- Create: `supabase/migrations/<cli-generated>_shopping_lists.sql`
- Create: `src/test/database/shopping-list-migration.test.ts`
- Create: `src/test/database/shopping-list-security.test.ts`
- Modify: `src/test/database/load-migrations.ts`
- Modify: `src/lib/supabase/database.types.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `auth.users`, `public.profiles`, `public.recipes`, `public.ingredients`, and `public.recipe_ingredients` ownership keys.
- Produces: four shopping tables, `public.replace_active_shopping_list(jsonb) -> uuid`, `public.reorder_shopping_items(uuid, uuid[]) -> void`, and matching `Database` table/function types.

- [ ] **Step 1: Verify the local CLI command surface**

Run:

```powershell
.\node_modules\.bin\supabase.cmd --version
.\node_modules\.bin\supabase.cmd migration new --help
```

Expected: the installed CLI reports a version and documents `migration new`; do not log in or link a project.

- [ ] **Step 2: Write failing migration and RLS tests**

Extend `load-migrations.ts` with `loadShoppingMigrations(database)`, which calls `loadRecipeMigrations`, locates exactly one `*_shopping_lists.sql`, and executes it. Add PGlite tests that assert:

```ts
const shoppingTables = [
  "shopping_lists",
  "shopping_list_sources",
  "shopping_list_items",
  "shopping_list_item_sources",
];

expect(rows).toHaveLength(shoppingTables.length);
expect(rows.every((row) => row.rowsecurity && row.force)).toBe(true);
```

Also assert the partial unique active-list index, leading `user_id` indexes, authenticated-only function privileges, explicit table privileges, positive/range checks, and ownership foreign keys.

Security tests must seed two users and prove:

- user B cannot select/update/delete user A's current list or children;
- anonymous access has no table or function privileges;
- replacing a list preserves the previous row as inactive and creates exactly one active row;
- a foreign/deleted recipe source aborts the whole transaction;
- cross-list item/source links abort the whole transaction;
- reordering requires every active-list item exactly once and rejects foreign IDs.

- [ ] **Step 3: Run the database tests and verify RED**

Run:

```powershell
npm.cmd test -- src/test/database/shopping-list-migration.test.ts src/test/database/shopping-list-security.test.ts --reporter=verbose --maxWorkers=1 --fileParallelism=false
```

Expected: FAIL because the shopping migration and database types do not exist.

- [ ] **Step 4: Create the migration with the CLI**

Run:

```powershell
.\node_modules\.bin\supabase.cmd migration new shopping_lists
```

Use the generated timestamped file; never invent the timestamp manually.

- [ ] **Step 5: Implement the normalized tables and indexes**

The migration must create these columns and constraints exactly:

```sql
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '当前购物清单',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_lists_user_id_id_unique unique (user_id, id),
  constraint shopping_lists_name_length check (char_length(trim(name)) between 1 and 80)
);

create unique index shopping_lists_one_active_per_user_idx
  on public.shopping_lists (user_id) where is_active;
create index shopping_lists_user_updated_idx
  on public.shopping_lists (user_id, updated_at desc, id desc);
```

Create the other three tables using the confirmed database contract. Apply these limits: selected servings `(> 0 and <= 1000)`, item name `1..80`, numeric quantity positive, quantity text `1..40`, unit `<=20`, aisle `<=40`, contribution text `1..40`, and nonnegative sort order. Add composite foreign keys so a child cannot point across users or lists. Recipe and ingredient snapshot references use `on delete set null` for their nullable reference column; deleting source domain data must not destroy a shopping snapshot.

Use these exact row shapes:

```sql
create table public.shopping_list_sources (
  id uuid primary key,
  user_id uuid not null,
  shopping_list_id uuid not null,
  recipe_id uuid,
  recipe_title_snapshot text not null,
  selected_servings numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  constraint shopping_list_sources_user_id_id_unique unique (user_id, id),
  constraint shopping_list_sources_user_list_id_unique unique (user_id, shopping_list_id, id),
  constraint shopping_list_sources_recipe_unique unique (shopping_list_id, recipe_id),
  constraint shopping_list_sources_title_length check (char_length(trim(recipe_title_snapshot)) between 1 and 100),
  constraint shopping_list_sources_servings_range check (selected_servings > 0 and selected_servings <= 1000),
  constraint shopping_list_sources_list_owner_fk foreign key (user_id, shopping_list_id)
    references public.shopping_lists (user_id, id) on delete cascade,
  constraint shopping_list_sources_recipe_owner_fk foreign key (user_id, recipe_id)
    references public.recipes (user_id, id) on delete set null (recipe_id)
);

create table public.shopping_list_items (
  id uuid primary key,
  user_id uuid not null,
  shopping_list_id uuid not null,
  ingredient_id uuid,
  name_snapshot text not null,
  quantity numeric(12, 3),
  quantity_text text,
  unit text,
  aisle text,
  is_checked boolean not null default false,
  is_manual boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_list_items_user_id_id_unique unique (user_id, id),
  constraint shopping_list_items_user_list_id_unique unique (user_id, shopping_list_id, id),
  constraint shopping_list_items_sort_unique unique (shopping_list_id, sort_order) deferrable initially deferred,
  constraint shopping_list_items_name_length check (char_length(trim(name_snapshot)) between 1 and 80),
  constraint shopping_list_items_quantity_positive check (quantity is null or quantity > 0),
  constraint shopping_list_items_quantity_text_length check (quantity_text is null or char_length(trim(quantity_text)) between 1 and 40),
  constraint shopping_list_items_amount_shape check (quantity is null or quantity_text is null),
  constraint shopping_list_items_unit_length check (unit is null or char_length(trim(unit)) <= 20),
  constraint shopping_list_items_aisle_length check (aisle is null or char_length(trim(aisle)) <= 40),
  constraint shopping_list_items_sort_nonnegative check (sort_order >= 0),
  constraint shopping_list_items_list_owner_fk foreign key (user_id, shopping_list_id)
    references public.shopping_lists (user_id, id) on delete cascade,
  constraint shopping_list_items_ingredient_owner_fk foreign key (user_id, ingredient_id)
    references public.ingredients (user_id, id) on delete set null (ingredient_id)
);

create table public.shopping_list_item_sources (
  id uuid primary key,
  user_id uuid not null,
  shopping_list_id uuid not null,
  shopping_list_item_id uuid not null,
  shopping_list_source_id uuid not null,
  recipe_ingredient_id uuid,
  quantity_contribution numeric(12, 3),
  quantity_text_contribution text,
  unit_snapshot text,
  created_at timestamptz not null default now(),
  constraint shopping_list_item_sources_user_id_id_unique unique (user_id, id),
  constraint shopping_list_item_sources_origin_unique unique (shopping_list_item_id, shopping_list_source_id, recipe_ingredient_id),
  constraint shopping_list_item_sources_quantity_positive check (quantity_contribution is null or quantity_contribution > 0),
  constraint shopping_list_item_sources_text_length check (quantity_text_contribution is null or char_length(trim(quantity_text_contribution)) between 1 and 40),
  constraint shopping_list_item_sources_amount_shape check (quantity_contribution is null or quantity_text_contribution is null),
  constraint shopping_list_item_sources_unit_length check (unit_snapshot is null or char_length(trim(unit_snapshot)) <= 20),
  constraint shopping_list_item_sources_item_owner_fk foreign key (user_id, shopping_list_id, shopping_list_item_id)
    references public.shopping_list_items (user_id, shopping_list_id, id) on delete cascade,
  constraint shopping_list_item_sources_source_owner_fk foreign key (user_id, shopping_list_id, shopping_list_source_id)
    references public.shopping_list_sources (user_id, shopping_list_id, id) on delete cascade,
  constraint shopping_list_item_sources_recipe_ingredient_owner_fk foreign key (user_id, recipe_ingredient_id)
    references public.recipe_ingredients (user_id, id) on delete set null (recipe_ingredient_id)
);

create index shopping_list_sources_user_list_idx on public.shopping_list_sources (user_id, shopping_list_id, id);
create index shopping_list_items_user_list_idx on public.shopping_list_items (user_id, shopping_list_id, is_checked, sort_order);
create index shopping_list_item_sources_user_list_item_idx on public.shopping_list_item_sources (user_id, shopping_list_id, shopping_list_item_id);
```

- [ ] **Step 6: Implement triggers, RLS, and privileges**

Reuse `public.set_updated_at()` for lists and items. Enable and force RLS on all four tables. Create select/insert/update/delete policies for `authenticated`; update policies include both clauses:

```sql
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

Add explicit privileges:

```sql
revoke all on table public.shopping_lists from anon, authenticated;
revoke all on table public.shopping_list_sources from anon, authenticated;
revoke all on table public.shopping_list_items from anon, authenticated;
revoke all on table public.shopping_list_item_sources from anon, authenticated;
grant select, insert, update, delete on table public.shopping_lists to authenticated;
grant select, insert, update, delete on table public.shopping_list_sources to authenticated;
grant select, insert, update, delete on table public.shopping_list_items to authenticated;
grant select, insert, update, delete on table public.shopping_list_item_sources to authenticated;
```

- [ ] **Step 7: Implement atomic list replacement and reorder functions**

`replace_active_shopping_list(p_payload jsonb)` must:

1. read `(select auth.uid())`, reject null;
2. lock the current user's `profiles` row `for update` to serialize replacements;
3. validate 1–20 distinct source recipes, each owned by the user, active, and paired with valid target servings;
4. set the old current list inactive;
5. insert the list, source snapshots, item snapshots, and contribution snapshots using caller-supplied UUIDs;
6. validate every non-null ingredient and recipe-ingredient reference belongs to the user and matches its source recipe;
7. return the new list UUID, relying on the function transaction for rollback.

Declare it as:

```sql
language plpgsql
security invoker
set search_path = ''
```

`reorder_shopping_items(p_shopping_list_id uuid, p_item_ids uuid[])` must lock the owned active list and its items, reject duplicates/missing/foreign IDs, then update every `sort_order` using `unnest(... with ordinality)`. Revoke both function signatures from `public, anon` and grant execute only to `authenticated`.

- [ ] **Step 8: Add TypeScript database types and a focused script**

Add all four table shapes and both function signatures to `database.types.ts`. Add:

```json
"test:shopping": "vitest run src/features/shopping src/test/database/shopping-list-migration.test.ts src/test/database/shopping-list-security.test.ts"
```

- [ ] **Step 9: Run Task 1 verification**

Run the two database tests, `npm.cmd run typecheck`, and `git diff --check`. Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add supabase/migrations src/test/database src/lib/supabase/database.types.ts package.json
git commit -m "feat(shopping): add private shopping list schema"
```

---

### Task 2: Shared Quantity Rules and Conservative Shopping Merge

**Files:**
- Create: `src/features/ingredients/quantities.ts`
- Create: `src/features/ingredients/quantities.test.ts`
- Create: `src/features/shopping/types.ts`
- Create: `src/features/shopping/schemas.ts`
- Create: `src/features/shopping/schemas.test.ts`
- Create: `src/features/shopping/merge.ts`
- Create: `src/features/shopping/merge.test.ts`
- Modify: `src/features/cooking/servings.ts`

**Interfaces:**
- Consumes: existing cooking serving limits/format behavior.
- Produces: `ShoppingActionResult<T>`, `ShoppingRecipeSelection`, `ShoppingGenerationInput`, `ShoppingGenerationRecipe`, `ShoppingContribution`, `ShoppingDraftItem`, `normalizeShoppingUnit`, `buildShoppingContributions`, `mergeShoppingContributions`, and shared quantity helpers.

- [ ] **Step 1: Write failing shared-quantity and merge tests**

Cover the unchanged cooking contracts after extraction plus these shopping cases:

```ts
expect(mergeShoppingContributions([
  contribution({ recipeIngredientId: "a", ingredientId: "tomato", quantity: 2, unit: "个" }),
  contribution({ recipeIngredientId: "b", ingredientId: "tomato", quantity: 3, unit: "个" }),
])[0]).toMatchObject({ quantity: 5, unit: "个", sources: [expect.anything(), expect.anything()] });
```

Also prove that `g` and `G` merge after normalization, while `克` and `g`, `克` and `千克`, text amounts, null amounts, different ingredient IDs, and manual rows do not merge. Test target-serving scaling, three-decimal rounding, exclusion by recipe-ingredient ID, deterministic source order, aisle snapshot fallback, and no mutation of inputs.

- [ ] **Step 2: Run the tests and verify RED**

Run the new ingredient/shopping tests. Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Extract shared quantity helpers without changing cooking behavior**

Move `MIN_SERVINGS`, `MAX_SERVINGS`, `isValidTargetServings`, `parseTargetServings`, `scaleQuantity`, `formatKitchenQuantity`, and `formatIngredientAmount` to `features/ingredients/quantities.ts`. Re-export them from `features/cooking/servings.ts`, keeping `getStepIngredients` there. Existing cooking imports and all 57 cooking tests must remain green.

- [ ] **Step 4: Add shopping schemas and types**

Use Zod to enforce 1–20 distinct selections, serving precision/range, at most 500 exclusions, valid UUIDs, item field limits matching SQL, and a reorder payload containing unique UUIDs. Export input/output types from the schemas; do not hand-maintain duplicate runtime/type contracts.

- [ ] **Step 5: Implement the pure merge pipeline**

Implement:

```ts
export function normalizeShoppingUnit(unit: string | null): string | null;
export function buildShoppingContributions(
  recipes: ShoppingGenerationRecipe[],
  selections: ShoppingRecipeSelection[],
): ShoppingContribution[];
export function mergeShoppingContributions(
  contributions: ShoppingContribution[],
  excludedRecipeIngredientIds: ReadonlySet<string>,
): ShoppingDraftItem[];
```

Use exact merge rules from the global contract. Preserve per-source contribution snapshots. Sort groups by aisle (`未分类` last), then first-source recipe order, then recipe-ingredient order. Generate no UUIDs in pure functions; the Server Action owns persistence IDs.

- [ ] **Step 6: Run Task 2 verification and commit**

Run new tests, all cooking tests, typecheck, and diff check. Then commit:

```powershell
git add src/features/ingredients src/features/shopping src/features/cooking/servings.ts
git commit -m "feat(shopping): add conservative ingredient merging"
```

---

### Task 3: Shopping Queries and Snapshot Mapping

**Files:**
- Create: `src/features/shopping/queries.ts`
- Create: `src/features/shopping/queries.test.ts`
- Modify: `src/features/recipes/queries.ts`
- Modify: `src/features/recipes/types.ts`

**Interfaces:**
- Consumes: Task 1 database types and Task 2 shopping types.
- Produces: `searchShoppingRecipeOptions(query)`, `getShoppingGenerationRecipes(recipeIds)`, and `getActiveShoppingList()`.

- [ ] **Step 1: Write failing query tests**

Mock the server Supabase client and prove:

- recipe search returns only active owned summaries and caps at 24;
- generation loading preserves caller recipe order and includes `ingredientId`, names, amounts, units, base servings, default aisle, and source sort orders;
- a missing, deleted, duplicate, or foreign recipe causes a stable `所选菜谱已失效，请重新选择` error;
- current-list mapping returns the active list with ordered sources/items/contributions;
- no active list returns null;
- query errors become stable Chinese messages and never expose raw Supabase errors.

- [ ] **Step 2: Run query tests and verify RED**

Expected: FAIL because the shopping query module does not exist.

- [ ] **Step 3: Add the narrow recipe-selection query**

Reuse `search_recipe_summaries` through a small exported recipe-query helper rather than copying search SQL. Return `{ id, title, coverUrl, baseServings }`; use signed URLs through the existing media helper.

- [ ] **Step 4: Implement owned generation-data loading**

Authenticate with `supabase.auth.getUser()`. Fetch active selected recipes, recipe ingredients, standard ingredients including `default_aisle`, and map to `ShoppingGenerationRecipe`. Compare the distinct requested IDs with returned rows before producing data.

- [ ] **Step 5: Implement current-list mapping**

Fetch one active owned list, then load sources, items, and item-source snapshots in parallel. Map IDs through explicit `Map` objects, retain orphaned nullable recipe/ingredient references through their snapshots, and sort by persisted `sort_order` plus ID tie-breakers.

- [ ] **Step 6: Run verification and commit**

Run shopping query tests, recipe query tests, typecheck, and diff check. Commit:

```powershell
git add src/features/shopping/queries.ts src/features/shopping/queries.test.ts src/features/recipes
git commit -m "feat(shopping): query recipes and current list"
```

---

### Task 4: Server Actions for Preview, Generation, and Item Mutations

**Files:**
- Create: `src/features/shopping/actions.ts`
- Create: `src/features/shopping/actions.test.ts`

**Interfaces:**
- Consumes: Task 2 schemas/merge functions and Task 3 queries.
- Produces: `searchShoppingRecipesAction`, `previewShoppingListAction`, `generateShoppingListAction`, `saveShoppingItemAction`, `setShoppingItemCheckedAction`, `deleteShoppingItemAction`, `clearCompletedShoppingItemsAction`, and `reorderShoppingItemsAction`.

- [ ] **Step 1: Write failing action tests**

Test invalid input without Supabase calls, unauthenticated results, server-side re-fetch before generation, ignored client draft fields, RPC payload snapshots, RPC rollback errors, active-list ownership on every mutation, revalidation only after success, and stable Chinese failure messages.

- [ ] **Step 2: Run action tests and verify RED**

Expected: FAIL because the actions do not exist.

- [ ] **Step 3: Implement search and preview actions**

Search trims to 80 characters and delegates to Task 3. Preview parses selections, re-fetches generation recipes, builds contributions, and returns raw contributions plus the merged preview. It performs no writes.

- [ ] **Step 4: Implement atomic generation**

`generateShoppingListAction` parses only selections and excluded recipe-ingredient IDs, re-fetches owned recipes, rebuilds/merges the draft, assigns UUIDs with `crypto.randomUUID()`, and sends snapshot JSON to `replace_active_shopping_list`. It rejects an empty resulting list with `请至少保留一项需要购买的食材`.

- [ ] **Step 5: Implement item mutations**

Every action authenticates, validates, targets an owned active list, checks affected-row data with `.select("id").maybeSingle()`, and returns `ActionResult`. New manual rows use `ingredient_id: null`, `is_manual: true`, and next sort order. Editing preserves `is_manual` and source links. Deleting an item cascades only its item-source rows. Clear-completed deletes checked items for the active list. Reorder delegates to the validated RPC.

- [ ] **Step 6: Revalidate and commit**

Successful writes call `revalidatePath("/shopping")`. Run action tests, typecheck, lint, and diff check. Commit:

```powershell
git add src/features/shopping/actions.ts src/features/shopping/actions.test.ts
git commit -m "feat(shopping): add list generation and mutations"
```

---

### Task 5: Multi-Recipe Generation Flow

**Files:**
- Create: `src/features/shopping/components/shopping-generator.tsx`
- Create: `src/features/shopping/components/shopping-generator.test.tsx`
- Create: `src/features/shopping/components/recipe-selection-list.tsx`
- Create: `src/features/shopping/components/generation-preview.tsx`

**Interfaces:**
- Consumes: Task 4 search/preview/generate actions.
- Produces: `<ShoppingGenerator initialRecipes onGenerated>` used by the shopping page.

- [ ] **Step 1: Write failing component tests**

Cover opening the generator, searching recipes, selecting 1–20 recipes, editing each serving count, inline serving validation, preview loading/error, excluding/restoring individual contributions, conservative merged totals with source labels, empty-result prevention, pending-state duplicate-submit prevention, successful generation, and accessible focus/labels.

- [ ] **Step 2: Run component tests and verify RED**

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement recipe selection**

Use a client component with a three-state flow: `select -> review -> saving`. Keep selected recipes in local state keyed by recipe ID so searches do not discard selection. Default target servings to each recipe's base servings. Use existing shadcn/Base UI Dialog and Button primitives; do not add a package.

- [ ] **Step 4: Implement the exclusion preview**

Render contributions grouped by resulting draft item. Each original recipe ingredient has a checkbox labeled `家里已有，不购买`; toggling it updates preview locally with Task 2 pure functions. Show amount, unit, aisle fallback, and every source recipe. Never imply that incompatible rows were merged.

- [ ] **Step 5: Implement generation submission**

Submit only selections and exclusion IDs. On success, close/reset the generator and refresh the route. On error, keep all choices and show a non-blocking status message. All primary controls use `min-h-11` and remain usable at 360px.

- [ ] **Step 6: Verify and commit**

Run generator tests, shopping tests, typecheck, lint, and diff check. Commit:

```powershell
git add src/features/shopping/components
git commit -m "feat(shopping): build multi-recipe generator"
```

---

### Task 6: Current Shopping List Page and Daily Interactions

**Files:**
- Modify: `src/app/(app)/shopping/page.tsx`
- Create: `src/features/shopping/components/shopping-page.tsx`
- Create: `src/features/shopping/components/shopping-page.test.tsx`
- Create: `src/features/shopping/components/shopping-list-view.tsx`
- Create: `src/features/shopping/components/shopping-item-row.tsx`
- Create: `src/features/shopping/components/shopping-item-editor.tsx`

**Interfaces:**
- Consumes: Task 3 current-list query, Task 4 mutations, and Task 5 generator.
- Produces: complete protected `/shopping` experience.

- [ ] **Step 1: Write failing page/component tests**

Cover no-current-list onboarding, grouped list rendering, `未分类` last, source recipe chips, checked styling without hiding amounts, toggle pending/error recovery, manual add, edit, delete, clear completed, up/down reorder within the full persisted order, generator replacement warning, empty group cleanup, and 44px mobile controls.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL while the route still renders the placeholder.

- [ ] **Step 3: Implement the Server Component page**

Load `getActiveShoppingList()` and initial recipe options in parallel. Render Chinese heading/copy and pass serializable data to `<ShoppingPage>`. Authentication remains inherited from the existing protected app layout/middleware.

- [ ] **Step 4: Implement grouped current-list rendering**

Group by the saved aisle snapshot, not live ingredient data. Show unchecked count, checked/total progress, amount, preparation-independent item name, source recipe titles, and manual badge. Keep checked rows visible until the user explicitly clears them.

- [ ] **Step 5: Implement mutations and editor**

Use `useTransition` for server-confirmed changes. Disable only the affected control while pending. The editor supports name, numeric or text amount (mutually exclusive), unit, and aisle. Delete and clear-completed actions require an in-app confirmation dialog; they do not affect recipe data.

- [ ] **Step 6: Implement accessible ordering**

Use labelled up/down buttons rather than a drag dependency. Compute the complete new item-ID order, submit once, and preserve aisle grouping after reload. Disable impossible moves.

- [ ] **Step 7: Verify and commit**

Run page tests, all shopping tests, typecheck, lint, and diff check. Commit:

```powershell
git add src/app/(app)/shopping src/features/shopping/components
git commit -m "feat(shopping): complete current list workflow"
```

---

### Task 7: Documentation, Full Verification, Browser Acceptance, and Delivery

**Files:**
- Modify: `README.md`
- Create: `docs/testing/module-4-shopping-list-acceptance.md`

**Interfaces:**
- Consumes: complete Module 4 implementation.
- Produces: reproducible acceptance evidence and a pushed feature branch; no deployment or PR.

- [ ] **Step 1: Update product-facing documentation**

Document the `/shopping` flow, strict merge boundary, snapshot/history behavior, online-only scope, database migration requirement, and Module 5 offline deferral. Do not claim real Supabase verification without evidence.

- [ ] **Step 2: Run serial focused and full tests**

```powershell
npm.cmd run test:shopping -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd test -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd run test:db -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd run typecheck
npm.cmd run lint
```

Record exact file/test counts and warnings.

- [ ] **Step 3: Run a safe production build**

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-review-placeholder'
npm.cmd run build
```

Expected: `/shopping` builds successfully; placeholder values do not authorize a real project.

- [ ] **Step 4: Validate migration/security scope**

Run PGlite tests, `git diff --check`, a secret-pattern scan, `npm.cmd audit --omit=dev --audit-level=high`, and inspect `git diff --stat acb2913...HEAD` plus `git diff --name-only acb2913...HEAD`. No cooking behavior, offline/IndexedDB, deployment, family, AI, or unrelated refactor is allowed beyond the shared quantity extraction defined in Task 2.

- [ ] **Step 5: Browser acceptance**

With the in-app Browser, verify desktop and 360px layouts, page identity, nonblank DOM, no framework overlay, console health, no horizontal overflow, and an interaction loop. With authorized non-production Supabase credentials, cover two recipes, different servings, one excluded pantry item, one compatible merge, one incompatible non-merge, source labels, check/edit/manual/reorder/clear, refresh persistence, and replacement preserving only one active list. Without authorized credentials, perform only login/route-protection smoke and explicitly record the authenticated-flow boundary; never use production or personal credentials.

- [ ] **Step 6: Final review, commit, and push**

Request a full branch review against `acb2913`. Address findings within the review budget, rerun affected checks, then:

```powershell
git add README.md docs/testing/module-4-shopping-list-acceptance.md
git commit -m "docs(shopping): record module acceptance"
git push -u origin feat/recipe-app-shopping
```

Verify local and remote HEAD match. Do not merge or create a PR.

- [ ] **Step 7: Pause for user acceptance**

Report completed functionality, files, database/API/config changes, exact tests, known boundaries, branch, commit IDs/messages, push result, GitHub branch link, and recommend Module 5 PWA/offline only after Module 4 is accepted.

## Plan Self-Review

- Every product-spec Module 4 requirement maps to Tasks 1–6: multi-recipe selection, servings, pantry exclusion, conservative merge, source tracking, aisle grouping, manual editing, ordering, and checking.
- Offline viewing/sync is explicitly excluded and reserved for Module 5.
- Database functions, grants, RLS, indexes, ownership, snapshots, and transaction rollback all have PGlite coverage.
- Type names and task interfaces are defined before consumers use them.
- No placeholder implementation steps, new dependencies, production actions, main merge, PR, or deployment are included.
