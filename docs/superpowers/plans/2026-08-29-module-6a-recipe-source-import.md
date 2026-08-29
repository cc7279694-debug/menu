# Module 6A Recipe Source Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private import workflow that converts a public recipe webpage, pasted text, or 1–6 uploaded images into an editable recipe draft and saves it through the existing recipe editor.

**Architecture:** A Supabase-owned import job stores private source metadata, temporary image paths, status, and a validated draft. A Next.js route securely reads public HTML and calls the OpenAI Responses API through a small provider interface; the review route maps the validated draft into the existing `RecipeEditor`, and saving finalizes provenance while removing temporary source data.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod 4, Supabase Auth/PostgreSQL/Storage, Tailwind CSS, Vitest, raw OpenAI Responses API `fetch`, Cheerio for server-side HTML extraction.

**Spec:** `docs/superpowers/specs/2026-08-29-recipe-source-import-design.md`

## Global Constraints

- Keep the application personal-only; do not add family or sharing behavior.
- Support `url`, `text`, and `images` sources in Module 6A; platform-specific and video adapters remain outside this plan.
- Never read third-party cookies, credentials, private pages, localhost, private IPs, or `.local` hosts.
- Never expose `OPENAI_API_KEY` to client code or store it in Supabase.
- AI output is a draft and must not save a recipe until the user presses the existing save button.
- Use `gpt-5-mini` as the default model and allow `RECIPE_AI_MODEL` to override it.
- Accept JPEG, PNG, and WebP only; maximum 15 MB per original, compress each stored upload below 5 MB, and allow 6 images per import.
- Store temporary uploads in the private `recipe-imports` bucket under `<user_id>/<import_id>/`.
- Do not persist raw AI responses; persist only Zod-validated `RecipeImportDraft` JSON.
- Do not automatically create categories or tags from AI suggestions.
- Do not add service-role credentials or a separate backend service.
- Use TypeScript for all application code and `npm.cmd` for Windows commands.
- Do not apply a Supabase migration, configure Production secrets, merge, or deploy Production without separate user approval.

---

## Planned File Map

- `supabase/migrations/20260829090000_recipe_imports.sql`: import jobs, source provenance, ingredient grouping, heat level, Storage bucket, RLS, grants, and updated `save_recipe` RPC.
- `src/test/database/recipe-imports-migration.test.ts`: schema/default/check-constraint coverage.
- `src/test/database/recipe-imports-security.test.ts`: table and Storage RLS coverage.
- `src/test/database/load-migrations.ts`: load the recipe management and import migrations in order for PGlite tests.
- `src/lib/supabase/database.types.ts`: generated database types after the migration.
- `src/lib/server-env.ts`: server-only AI environment validation.
- `src/lib/server-env.test.ts`: missing/valid server environment tests.
- `src/features/recipe-imports/schemas.ts`: source, job, draft, and process request schemas.
- `src/features/recipe-imports/schemas.test.ts`: validation boundaries.
- `src/features/recipe-imports/types.ts`: source adapter and extractor interfaces.
- `src/features/recipe-imports/draft-mapping.ts`: map AI draft to existing editor values and taxonomy IDs.
- `src/features/recipe-imports/draft-mapping.test.ts`: deterministic mapping tests.
- `src/features/recipe-imports/url-safety.ts`: URL, DNS, redirect, MIME, byte, and timeout protection.
- `src/features/recipe-imports/url-safety.test.ts`: SSRF and redirect tests with injected DNS/fetch functions.
- `src/features/recipe-imports/web-source.ts`: public HTML metadata and readable-text extraction.
- `src/features/recipe-imports/web-source.test.ts`: parser fixtures.
- `src/features/recipe-imports/openai-extractor.ts`: structured Responses API request and response parsing.
- `src/features/recipe-imports/openai-extractor.test.ts`: provider success and failure tests.
- `src/features/recipe-imports/queries.ts`: owned import lookup and signed temporary image URLs.
- `src/features/recipe-imports/actions.ts`: create, finalize, discard, and retry-safe state transitions.
- `src/features/recipe-imports/actions.test.ts`: auth, ownership, validation, cleanup, and state tests.
- `src/features/recipe-imports/process.ts`: source resolution, extraction, validation, and job-state orchestration.
- `src/features/recipe-imports/process.test.ts`: state-machine and error-code tests.
- `src/app/api/recipe-imports/[importId]/process/route.ts`: authenticated processing endpoint.
- `src/app/api/recipe-imports/[importId]/process/route.test.ts`: route authentication and status tests.
- `src/features/recipe-imports/components/import-form.tsx`: link/text/image input and private upload.
- `src/features/recipe-imports/components/import-form.test.tsx`: input-mode and upload-limit tests.
- `src/features/recipe-imports/components/import-progress.tsx`: status, polling, errors, retry, and fallback UI.
- `src/features/recipe-imports/components/import-progress.test.tsx`: progress-state tests.
- `src/features/recipe-imports/upload-import-images.ts`: validated compression, owned path construction, upload rollback, and deletion.
- `src/features/recipe-imports/upload-import-images.test.ts`: path, compression, limit, rollback, and deletion tests.
- `src/app/(app)/recipes/import/page.tsx`: authenticated import entry route.
- `src/app/(app)/recipes/import/[importId]/page.tsx`: authenticated progress/review route.
- `src/features/recipes/components/recipe-list-page.tsx`: secondary import entry beside new recipe.
- `src/features/recipes/components/recipe-editor.tsx`: ingredient group, heat input, import finalization hook.
- `src/features/recipes/components/recipe-editor.test.tsx`: imported draft and new-field editor tests.
- `src/features/recipes/components/recipe-detail.tsx`: grouped ingredient display, heat/time display, and source attribution.
- `src/features/recipes/components/recipe-detail.test.tsx`: imported-detail rendering tests.
- `src/features/recipes/schemas.ts`: `groupType`, `heatLevel`, and optional `importId` validation.
- `src/features/recipes/schemas.test.ts`: recipe save validation for new fields.
- `src/features/recipes/types.ts`: detail types for group and heat.
- `src/features/recipes/queries.ts`: select group and heat.
- `src/features/recipes/editor-value.ts`: edit-value mapping for group and heat.
- `src/features/navigation/routes.ts`: add desktop/mobile import entry without changing the four primary tabs.
- `.env.example`: empty `OPENAI_API_KEY` and `RECIPE_AI_MODEL=gpt-5-mini` entries.
- `README.md`: local Preview-only AI configuration and limits.
- `docs/testing/module-6a-recipe-source-import-acceptance.md`: repeatable acceptance checklist.

---

### Task 1: Add the private import data model and recipe detail fields

**Files:**
- Create: `supabase/migrations/20260829090000_recipe_imports.sql`
- Create: `src/test/database/recipe-imports-migration.test.ts`
- Create: `src/test/database/recipe-imports-security.test.ts`
- Modify: `src/test/database/load-migrations.ts`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: authenticated `auth.uid()`, existing `recipes`, `recipe_ingredients`, `recipe_steps`, and `save_recipe(jsonb)`.
- Produces: `recipe_import_jobs`, `recipe_sources`, `recipe-imports` bucket, `recipe_ingredients.group_type`, `recipe_steps.heat_level`, and updated generated `Database` types.

- [ ] **Step 1: Write failing migration structure tests**

Add assertions that load all migrations and verify:

```ts
expect(schema).toContain("create table public.recipe_import_jobs");
expect(schema).toContain("create table public.recipe_sources");
expect(schema).toContain("group_type text not null default 'main'");
expect(schema).toContain("heat_level text");
expect(schema).toContain("bucket_id = 'recipe-imports'");
expect(schema).toContain("alter table public.recipe_import_jobs force row level security");
```

Update `loadRecipeMigrations()` in the same test-preparation task to load exactly one `_recipe_management.sql` file followed by exactly one `_recipe_imports.sql` file. Add an assertion that a recipe save payload without `groupType` still stores `main`.

Add PGlite behavioral assertions for accepted statuses and rejected values:

```ts
await expect(sql`insert into recipe_import_jobs (id, user_id, source_type, status)
  values (${jobId}, ${userId}, 'url', 'unknown')`).rejects.toThrow();
await expect(sql`insert into recipe_ingredients (..., group_type)
  values (..., 'invalid')`).rejects.toThrow();
```

- [ ] **Step 2: Run database tests and verify failure**

Run:

```powershell
npm.cmd test -- src/test/database/recipe-imports-migration.test.ts src/test/database/recipe-imports-security.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the tables, columns, policies, and bucket do not exist.

- [ ] **Step 3: Add the migration**

Create the migration with these exact enums-as-checks and ownership relationships:

```sql
alter table public.recipe_ingredients
  add column group_type text not null default 'main'
  constraint recipe_ingredients_group_type_check
  check (group_type in ('main', 'seasoning', 'other'));

alter table public.recipe_steps
  add column heat_level text;

create table public.recipe_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'text', 'images')),
  source_url text,
  source_title text,
  source_author text,
  source_platform text,
  source_text text,
  image_paths jsonb not null default '[]'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'fetching', 'extracting', 'review', 'failed', 'saved')),
  draft jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_code text,
  recipe_id uuid references public.recipes(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'text', 'images')),
  source_url text,
  source_title text,
  source_author text,
  source_platform text,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);
```

Add `updated_at` trigger, ownership indexes, forced RLS, CRUD policies scoped to `(select auth.uid()) = user_id`, authenticated grants, and anon revocations. Add the private Storage bucket with a 5 MB limit and JPEG/PNG/WebP MIME list. Storage policies must require `(storage.foldername(name))[1] = auth.uid()::text`.

Replace `save_recipe(jsonb)` so ingredient inserts read:

```sql
coalesce(nullif(v_ingredient->>'groupType', ''), 'main')
```

and step inserts read:

```sql
nullif(v_step->>'heatLevel', '')
```

- [ ] **Step 4: Update generated TypeScript database types**

Start local Supabase, regenerate types, and inspect the diff:

```powershell
supabase.cmd start
supabase.cmd db reset
supabase.cmd gen types typescript --local | Set-Content -Encoding utf8 src/lib/supabase/database.types.ts
```

Expected: both new tables, both new columns, and the updated `save_recipe` payload remain represented without `any`.

- [ ] **Step 5: Run migration and security tests**

Run:

```powershell
npm.cmd test -- src/test/database/recipe-imports-migration.test.ts src/test/database/recipe-imports-security.test.ts --pool=forks --maxWorkers=1
npm.cmd test -- src/test/database/recipe-management-migration.test.ts src/test/database/recipe-management-security.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS, including cross-user SELECT/UPDATE/DELETE denial and Storage path isolation.

- [ ] **Step 6: Commit the data model task**

```powershell
git add supabase/migrations/20260829090000_recipe_imports.sql src/test/database/recipe-imports-migration.test.ts src/test/database/recipe-imports-security.test.ts src/lib/supabase/database.types.ts
git commit -m "feat(recipe-import): add private import data model"
```

---

### Task 2: Define validated import contracts and deterministic editor mapping

**Files:**
- Create: `src/features/recipe-imports/schemas.ts`
- Create: `src/features/recipe-imports/schemas.test.ts`
- Create: `src/features/recipe-imports/types.ts`
- Create: `src/features/recipe-imports/draft-mapping.ts`
- Create: `src/features/recipe-imports/draft-mapping.test.ts`
- Modify: `src/features/recipes/schemas.ts`
- Modify: `src/features/recipes/schemas.test.ts`

**Interfaces:**
- Consumes: `RecipeSaveInput`, existing taxonomy arrays, and UUID generation supplied to the mapper.
- Produces: `recipeImportDraftModelSchema`, `recipeImportDraftSchema`, `recipeImportJsonSchema`, `createRecipeImportSchema`, `processRecipeImportSchema`, `SourceDocument`, `RecipeDraftExtractor`, and `mapImportDraftToRecipeSaveInput()`.

- [ ] **Step 1: Write failing schema tests**

Cover these boundaries:

```ts
expect(recipeImportDraftSchema.parse(validDraft).ingredients[0].groupType).toBe("seasoning");
expect(() => recipeImportDraftSchema.parse({ ...validDraft, ingredients: [] })).toThrow();
expect(() => recipeImportDraftSchema.parse({ ...validDraft, steps: [] })).toThrow();
expect(() => recipeImportDraftSchema.parse({ ...validDraft, warnings: Array(21).fill("x") })).toThrow();
expect(createRecipeImportSchema.parse({ sourceType: "url", sourceUrl: "https://example.com/r" })).toBeTruthy();
expect(() => createRecipeImportSchema.parse({ sourceType: "text", sourceText: "" })).toThrow();
```

Add recipe-save tests that accept `groupType: "main" | "seasoning" | "other"` and `heatLevel`, and reject any other group or heat text over 60 characters.

- [ ] **Step 2: Run schema tests and verify failure**

```powershell
npm.cmd test -- src/features/recipe-imports/schemas.test.ts src/features/recipes/schemas.test.ts
```

Expected: FAIL because the import schemas and new recipe fields do not exist.

- [ ] **Step 3: Implement schemas and interfaces**

Use these exported shapes:

```ts
export const ingredientGroupSchema = z.enum(["main", "seasoning", "other"]);
const modelNullableText = (max: number) => z.string().trim().min(1).max(max).nullable();
const modelNullableInteger = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable();

export const recipeImportDraftModelSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: modelNullableText(500),
  baseServings: z.number().positive().max(1000),
  prepMinutes: modelNullableInteger(0, 10080),
  cookMinutes: modelNullableInteger(0, 10080),
  personalNotes: modelNullableText(4000),
  suggestedCategoryName: modelNullableText(40),
  suggestedTagNames: z.array(z.string().trim().min(1).max(40)).max(12),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    groupType: ingredientGroupSchema,
    quantity: z.number().positive().nullable(),
    quantityText: modelNullableText(40),
    unit: modelNullableText(20),
    preparationNote: modelNullableText(120),
  })).min(1).max(100),
  steps: z.array(z.object({
    instruction: z.string().trim().min(1).max(2000),
    heatLevel: modelNullableText(60),
    timerSeconds: z.number().int().min(1).max(86400).nullable(),
    ingredientNames: z.array(z.string().trim().min(1).max(80)).max(30),
  })).min(1).max(100),
  warnings: z.array(z.string().trim().min(1).max(200)).max(20),
});

export const recipeImportDraftSchema = recipeImportDraftModelSchema;
export const recipeImportJsonSchema = z.toJSONSchema(recipeImportDraftModelSchema);

export const createRecipeImportSchema = z.discriminatedUnion("sourceType", [
  z.object({ sourceType: z.literal("url"), sourceUrl: z.string().url().max(2048) }),
  z.object({ sourceType: z.literal("text"), sourceText: z.string().trim().min(40).max(60000) }),
  z.object({ sourceType: z.literal("images") }),
]);

export const attachRecipeImportImagesSchema = z.object({
  importId: z.string().uuid(),
  imagePaths: z.array(z.string().min(1).max(500)).min(1).max(6),
});

export const processRecipeImportSchema = z.object({ importId: z.string().uuid() });

export type RecipeImportDraft = z.infer<typeof recipeImportDraftSchema>;
export type RecipeImportStatus =
  | "queued" | "fetching" | "extracting" | "review" | "failed" | "saved";

export type RecipeImportJob = {
  id: string;
  sourceType: "url" | "text" | "images";
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourcePlatform: string | null;
  imagePaths: string[];
  status: RecipeImportStatus;
  draft: RecipeImportDraft | null;
  warnings: string[];
  errorCode: string | null;
  recipeId: string | null;
  expiresAt: string;
};

export type SourceDocument = {
  platform: string;
  title: string | null;
  author: string | null;
  canonicalUrl: string | null;
  text: string;
  imageUrls: string[];
};

export interface RecipeDraftExtractor {
  extract(input: { document: SourceDocument; imageUrls: string[] }): Promise<RecipeImportDraft>;
}
```

Extend existing recipe ingredient and step schemas with `groupType` and `heatLevel`. Do not add `importId` to the recipe payload; import finalization remains a separate owned action after a successful recipe save.

- [ ] **Step 4: Write failing mapping tests**

Use a deterministic ID iterator and assert:

```ts
expect(result.categoryId).toBe(existingCategoryId);
expect(result.tagIds).toEqual([existingTagId]);
expect(result.ingredients[1].groupType).toBe("seasoning");
expect(result.steps[0].heatLevel).toBe("中火");
expect(result.steps[0].ingredientLinks[0].recipeIngredientId)
  .toBe(result.ingredients[0].recipeIngredientId);
```

Also assert unmatched category/tag names are returned as suggestions rather than silently created.

- [ ] **Step 5: Implement the mapper**

Export this exact signature:

```ts
export function mapImportDraftToRecipeSaveInput(input: {
  draft: RecipeImportDraft;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  createId?: () => string;
}): {
  value: RecipeSaveInput;
  unmatchedCategoryName: string | null;
  unmatchedTagNames: string[];
}
```

Normalize taxonomy and ingredient matching with `trim().toLocaleLowerCase("zh-CN")`. Link each step ingredient name to the first normalized matching ingredient. Set `imagePath` to `null`, preserve warning text in `personalNotes`, and generate a recipe ID, ingredient IDs, and step IDs with `crypto.randomUUID()` when `createId` is omitted.

- [ ] **Step 6: Run focused tests and commit**

```powershell
npm.cmd test -- src/features/recipe-imports/schemas.test.ts src/features/recipe-imports/draft-mapping.test.ts src/features/recipes/schemas.test.ts
git add src/features/recipe-imports src/features/recipes/schemas.ts src/features/recipes/schemas.test.ts
git commit -m "feat(recipe-import): define validated recipe drafts"
```

Expected: PASS.

---

### Task 3: Add server-only AI configuration and structured extraction

**Files:**
- Create: `src/lib/server-env.ts`
- Create: `src/lib/server-env.test.ts`
- Create: `src/features/recipe-imports/openai-extractor.ts`
- Create: `src/features/recipe-imports/openai-extractor.test.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `RecipeDraftExtractor`, `SourceDocument`, `recipeImportDraftSchema`, server-only process environment, and injected `fetch` for tests.
- Produces: `getRecipeAiEnv()` and `createOpenAiRecipeDraftExtractor()`.

- [ ] **Step 1: Write failing environment and provider tests**

Assert the following:

```ts
expect(parseRecipeAiEnv({ OPENAI_API_KEY: "secret" })).toEqual({
  OPENAI_API_KEY: "secret",
  RECIPE_AI_MODEL: "gpt-5-mini",
});
expect(() => parseRecipeAiEnv({ OPENAI_API_KEY: "" })).toThrow("AI configuration");
expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.objectContaining({ method: "POST" }));
await expect(extractor.extract(input)).rejects.toThrow("菜谱内容整理失败");
```

Provider tests must cover HTTP 429, HTTP 500, missing `output_text`, malformed JSON, and schema-invalid JSON without logging response bodies.

- [ ] **Step 2: Run provider tests and verify failure**

```powershell
npm.cmd test -- src/lib/server-env.test.ts src/features/recipe-imports/openai-extractor.test.ts
```

Expected: FAIL because the server environment and extractor do not exist.

- [ ] **Step 3: Implement server-only environment validation**

Start `src/lib/server-env.ts` with:

```ts
import "server-only";
import { z } from "zod";

const recipeAiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  RECIPE_AI_MODEL: z.string().min(1).default("gpt-5-mini"),
});

export function parseRecipeAiEnv(input: Record<string, string | undefined>) {
  const parsed = recipeAiEnvSchema.safeParse(input);
  if (!parsed.success) throw new Error("AI configuration is missing or invalid");
  return parsed.data;
}

export function getRecipeAiEnv() {
  return parseRecipeAiEnv({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RECIPE_AI_MODEL: process.env.RECIPE_AI_MODEL,
  });
}
```

- [ ] **Step 4: Implement the raw Responses API client**

Export:

```ts
export function createOpenAiRecipeDraftExtractor(options?: {
  fetchImpl?: typeof fetch;
  env?: { OPENAI_API_KEY: string; RECIPE_AI_MODEL: string };
}): RecipeDraftExtractor
```

Build one request with:

```ts
{
  model: env.RECIPE_AI_MODEL,
  input: [{
    role: "user",
    content: [
      { type: "input_text", text: systemBoundaryAndSourceText },
      ...imageUrls.map((imageUrl) => ({ type: "input_image", image_url: imageUrl })),
    ],
  }],
  text: {
    format: {
      type: "json_schema",
      name: "recipe_import_draft",
      strict: true,
      schema: recipeImportJsonSchema,
    },
  },
}
```

The prompt must state that source text is untrusted data, quantities must remain `null` when absent, times are seconds only at step level, and warnings must name every inferred or missing field. Parse `output[].content[]` entries with `type === "output_text"`, JSON-parse the text, then validate with `recipeImportDraftSchema`.

- [ ] **Step 5: Document empty secret fields and run tests**

Append to `.env.example` without any secret value:

```dotenv
OPENAI_API_KEY=
RECIPE_AI_MODEL=gpt-5-mini
```

Document that local and Vercel Preview environments need a user-provided API key, and that Production configuration requires separate approval.

Run and commit:

```powershell
npm.cmd test -- src/lib/server-env.test.ts src/features/recipe-imports/openai-extractor.test.ts
git add .env.example README.md src/lib/server-env.ts src/lib/server-env.test.ts src/features/recipe-imports/openai-extractor.ts src/features/recipe-imports/openai-extractor.test.ts
git commit -m "feat(recipe-import): add structured AI extraction"
```

Expected: PASS and `git diff --cached` contains no key value.

---

### Task 4: Safely read and normalize public webpage sources

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/recipe-imports/url-safety.ts`
- Create: `src/features/recipe-imports/url-safety.test.ts`
- Create: `src/features/recipe-imports/web-source.ts`
- Create: `src/features/recipe-imports/web-source.test.ts`

**Interfaces:**
- Consumes: a user URL, injected DNS lookup/fetch functions, and `SourceDocument`.
- Produces: `assertSafePublicUrl()`, `fetchPublicDocument()`, and `extractPublicWebSource()`.

- [ ] **Step 1: Install one focused HTML parser**

```powershell
npm.cmd install cheerio@1.1.2
```

Inspect `package.json` and confirm no unrelated dependency changed.

- [ ] **Step 2: Write failing SSRF and fetch-limit tests**

Cover `localhost`, `.local`, URL credentials, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, loopback/link-local/unique-local IPv6, DNS returning a private address, a redirect to a private host, more than 3 redirects, non-HTML MIME, body over 2 MB, and a 10-second abort.

Use injected dependencies rather than live network:

```ts
await expect(fetchPublicDocument("https://example.com", {
  lookup: async () => [{ address: "127.0.0.1", family: 4 }],
  fetchImpl: vi.fn(),
})).rejects.toThrow("不支持访问该地址");
```

- [ ] **Step 3: Run safety tests and verify failure**

```powershell
npm.cmd test -- src/features/recipe-imports/url-safety.test.ts
```

Expected: FAIL because the functions do not exist.

- [ ] **Step 4: Implement guarded fetching**

Export:

```ts
export async function assertSafePublicUrl(
  value: string,
  lookup: typeof dnsLookup = dnsLookup,
): Promise<URL>

export async function fetchPublicDocument(
  value: string,
  dependencies?: { lookup?: typeof dnsLookup; fetchImpl?: typeof fetch },
): Promise<{ finalUrl: string; contentType: string; body: string }>
```

Use `redirect: "manual"`, revalidate every `Location`, cap redirects at 3, read the response stream while counting UTF-8 bytes, abort at 2 MB, and abort the request after 10 seconds. Send only a fixed `Accept: text/html,text/plain` header and a product user agent; never forward browser headers.

- [ ] **Step 5: Write failing HTML extraction tests**

Fixture assertions must verify removal of `script`, `style`, `nav`, `footer`, `form`, and hidden elements; preference for `article` then `main` then `body`; whitespace normalization; canonical URL; `og:title`; author meta; image URL normalization; at most 12 page-image candidates; and 60,000 text characters. Add a process test proving that only the first 6 candidates that pass `assertSafePublicUrl()` are sent to the AI provider.

- [ ] **Step 6: Implement webpage normalization**

Export:

```ts
export function extractPublicWebSource(input: {
  html: string;
  finalUrl: string;
}): SourceDocument
```

Return `platform: new URL(finalUrl).hostname`, absolute HTTP(S) image URLs, and empty arrays instead of throwing when optional metadata is absent. The processing layer must run every remote image candidate through `assertSafePublicUrl()`, discard unsafe/unresolvable candidates, and pass at most 6 safe URLs to the extractor. Throw the stable user-facing error `网页中没有找到可整理的文字` when normalized text is under 40 characters and there are no candidate images.

- [ ] **Step 7: Run focused tests and commit**

```powershell
npm.cmd test -- src/features/recipe-imports/url-safety.test.ts src/features/recipe-imports/web-source.test.ts
git add package.json package-lock.json src/features/recipe-imports/url-safety.ts src/features/recipe-imports/url-safety.test.ts src/features/recipe-imports/web-source.ts src/features/recipe-imports/web-source.test.ts
git commit -m "feat(recipe-import): add guarded webpage extraction"
```

Expected: PASS.

---

### Task 5: Implement owned import actions and processing state machine

**Files:**
- Create: `src/features/recipe-imports/queries.ts`
- Create: `src/features/recipe-imports/actions.ts`
- Create: `src/features/recipe-imports/actions.test.ts`
- Create: `src/features/recipe-imports/process.ts`
- Create: `src/features/recipe-imports/process.test.ts`
- Create: `src/app/api/recipe-imports/[importId]/process/route.ts`
- Create: `src/app/api/recipe-imports/[importId]/process/route.test.ts`

**Interfaces:**
- Consumes: authenticated Supabase client, validated source payload, signed image URLs, webpage reader, and `RecipeDraftExtractor`.
- Produces: `createRecipeImportAction()`, `attachRecipeImportImagesAction()`, `getOwnedRecipeImport()`, `cleanupExpiredRecipeImports()`, `processRecipeImport()`, `finalizeRecipeImportAction()`, `discardRecipeImportAction()`, and GET/POST processing route.

- [ ] **Step 1: Write failing action and state-machine tests**

Test exact transitions:

```text
queued -> fetching -> extracting -> review
queued -> extracting -> review
queued|failed -> fetching|extracting
any processing state -> failed with stable error_code
review -> saved only after owned recipe exists
```

Assert unauthenticated create returns `请先登录后再导入菜谱`, cross-user jobs appear as not found, a second process request for `fetching` or `extracting` returns HTTP 409, and discard deletes all `recipe-imports` objects before deleting the job.

- [ ] **Step 2: Run orchestration tests and verify failure**

```powershell
npm.cmd test -- src/features/recipe-imports/actions.test.ts src/features/recipe-imports/process.test.ts src/app/api/recipe-imports/[importId]/process/route.test.ts
```

Expected: FAIL because the orchestration files do not exist.

- [ ] **Step 3: Implement create and owned query functions**

Use these signatures:

```ts
export async function createRecipeImportAction(
  input: unknown,
): Promise<ActionResult<{ importId: string; uploadFolder: string }>>

export async function attachRecipeImportImagesAction(
  input: unknown,
): Promise<ActionResult<null>>

export async function getOwnedRecipeImport(importId: string): Promise<RecipeImportJob | null>

export async function cleanupExpiredRecipeImports(): Promise<void>
```

For image imports, create the job before upload and return `<user_id>/<import_id>` as the only permitted folder. After upload, `attachRecipeImportImagesAction()` requires 1–6 unique paths, verifies every path begins with that exact folder plus `/`, then stores them in `image_paths`. If attachment fails, the client removes the uploaded objects and displays an error. For text and URL sources, insert the validated source directly. `cleanupExpiredRecipeImports()` lists only the current user's jobs whose `expires_at` is in the past, deletes their exact owned Storage prefixes, then deletes those job rows; it never uses a service-role client.

- [ ] **Step 4: Implement processing orchestration**

Export:

```ts
export async function processRecipeImport(
  importId: string,
  dependencies?: {
    extractor?: RecipeDraftExtractor;
    fetchDocument?: typeof fetchPublicDocument;
  },
): Promise<{ status: "review"; draft: RecipeImportDraft }>
```

Processing rules:

- URL: set `fetching`, call `fetchPublicDocument`, normalize HTML, then set `extracting`.
- Text: create a `SourceDocument` with platform `pasted-text`, then set `extracting`.
- Images: create signed URLs valid for 10 minutes, use an empty-text `SourceDocument` with platform `uploaded-images`, then set `extracting`.
- On success: store validated `draft`, source metadata, warnings, clear `error_code`, set `review`.
- On known errors: set one of `unsafe_url`, `source_unreadable`, `source_too_large`, `ai_rate_limited`, `ai_unavailable`, `invalid_ai_output`.
- On unknown errors: log only import ID and error class, store `processing_failed`.

- [ ] **Step 5: Implement the route and lifecycle actions**

POST `/api/recipe-imports/[importId]/process` authenticates through the existing server auth helper, calls `processRecipeImport`, and returns only:

```ts
{ ok: true, status: "review" }
```

or:

```ts
{ ok: false, code: string, message: string }
```

GET on the same route returns only this owned status payload:

```ts
{
  status: "queued" | "fetching" | "extracting" | "review" | "failed" | "saved";
  errorCode: string | null;
}
```

It must not return source text, image paths, signed URLs, or draft JSON.

`finalizeRecipeImportAction(importId, recipeId)` verifies both objects belong to the user, inserts/upserts one `recipe_sources` row, sets job `saved`, clears `source_text` and `draft`, then deletes temporary images. `discardRecipeImportAction(importId)` deletes temporary images and the job. Both actions are idempotent.

- [ ] **Step 6: Run focused tests and commit**

```powershell
npm.cmd test -- src/features/recipe-imports/actions.test.ts src/features/recipe-imports/process.test.ts src/app/api/recipe-imports/[importId]/process/route.test.ts
git add src/features/recipe-imports/queries.ts src/features/recipe-imports/actions.ts src/features/recipe-imports/actions.test.ts src/features/recipe-imports/process.ts src/features/recipe-imports/process.test.ts src/app/api/recipe-imports
git commit -m "feat(recipe-import): process private import jobs"
```

Expected: PASS.

---

### Task 6: Build the responsive import and progress experience

**Files:**
- Create: `src/features/recipe-imports/components/import-form.tsx`
- Create: `src/features/recipe-imports/components/import-form.test.tsx`
- Create: `src/features/recipe-imports/components/import-progress.tsx`
- Create: `src/features/recipe-imports/components/import-progress.test.tsx`
- Create: `src/features/recipe-imports/upload-import-images.ts`
- Create: `src/features/recipe-imports/upload-import-images.test.ts`
- Create: `src/app/(app)/recipes/import/page.tsx`
- Create: `src/app/(app)/recipes/import/[importId]/page.tsx`
- Modify: `src/features/recipes/components/recipe-list-page.tsx`
- Modify: `src/features/navigation/routes.ts`
- Modify: `src/features/navigation/routes.test.ts`

**Interfaces:**
- Consumes: create/discard actions, browser Supabase client, private upload folder, process POST route, owned job query, and `RecipeEditorPage`.
- Produces: `/recipes/import` input page and `/recipes/import/[importId]` progress/review page.

- [ ] **Step 1: Write failing import-form tests**

Verify:

- Tabs are named `粘贴链接`, `上传图片`, and `粘贴文字`.
- Only the selected input type is submitted.
- URL submit navigates to `/recipes/import/<id>`.
- Text under 40 characters is rejected.
- More than 6 images, unsupported MIME, or an original file over 15 MB is rejected before upload.
- Images are compressed below 5 MB and uploaded under the returned owned folder.
- Submit button becomes disabled and reads `正在准备导入…`.

- [ ] **Step 2: Write failing progress tests**

Verify copy and controls for `queued`, `fetching`, `extracting`, `review`, and `failed`. A failed web import must show both `上传截图` and `粘贴文案` actions. Polling stops on `review`, `failed`, and `saved`.

- [ ] **Step 3: Run UI tests and verify failure**

```powershell
npm.cmd test -- src/features/recipe-imports/components/import-form.test.tsx src/features/recipe-imports/components/import-progress.test.tsx src/features/navigation/routes.test.ts
```

Expected: FAIL because the components, upload helper, and route entry do not exist.

- [ ] **Step 4: Implement validated private image upload**

Export:

```ts
export type RecipeImportMediaBucket = {
  upload: (
    path: string,
    file: File,
    options: { cacheControl: string; upsert: false; contentType: string },
  ) => Promise<{ data: unknown; error: unknown }>;
  remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
};

export async function uploadImportImages(input: {
  userId: string;
  importId: string;
  files: File[];
  bucket: RecipeImportMediaBucket;
  compress?: typeof browserImageCompression;
  createAssetId?: () => string;
}): Promise<string[]>
```

Validate both UUIDs, require 1–6 files, reuse `validateImageFile`, compress to WebP with `MAX_IMAGE_DIMENSION` and `TARGET_IMAGE_BYTES`, then upload as `${userId}/${importId}/${assetId}.webp` with `cacheControl: "3600"` and `upsert: false`. Remove every successfully uploaded path if any later upload fails. Export a matching `removeImportImages()` that refuses paths outside the exact user/import prefix.

- [ ] **Step 5: Implement the import form**

Use a single responsive card with a three-option segmented control. Keep state local to the form. For images, show ordered thumbnails with remove buttons and accessible labels. After create and upload succeed, call `attachRecipeImportImagesAction()` with the returned paths, then navigate to the import detail route; processing starts there so a refresh can resume the task.

Do not add a fifth primary mobile tab. Add a secondary `从链接/图片导入` button to `RecipeListPage` beside `新建菜谱`, hide it on the favorites page, and expose `/recipes/import` through a named route constant.

- [ ] **Step 6: Implement progress and review routing**

The import entry server page calls `cleanupExpiredRecipeImports()` before rendering. The detail server page loads the owned job. For `queued` or `failed`, the client component calls POST once. While active, poll GET `/api/recipe-imports/[importId]/process` every 1.5 seconds. Use text and a small non-looping status transition; under reduced motion, remove transforms and transitions.

When status is `review`, load taxonomy, call `mapImportDraftToRecipeSaveInput`, and render `RecipeEditorPage` with `initialValue`, `importId`, unmatched suggestions, and source summary. The user still sees the normal save button.

- [ ] **Step 7: Run UI tests and commit**

```powershell
npm.cmd test -- src/features/recipe-imports/components/import-form.test.tsx src/features/recipe-imports/components/import-progress.test.tsx src/features/recipe-imports/upload-import-images.test.ts src/features/navigation/routes.test.ts
git add src/features/recipe-imports/components src/features/recipe-imports/upload-import-images.ts src/features/recipe-imports/upload-import-images.test.ts "src/app/(app)/recipes/import" src/features/recipes/components/recipe-list-page.tsx src/features/navigation/routes.ts src/features/navigation/routes.test.ts
git commit -m "feat(recipe-import): add import and review screens"
```

Expected: PASS. If PowerShell parses parentheses in paths, quote each path passed to `git add`.

---

### Task 7: Extend the existing editor and finalize imported recipes

**Files:**
- Modify: `src/features/recipes/components/recipe-editor.tsx`
- Modify: `src/features/recipes/components/recipe-editor.test.tsx`
- Modify: `src/features/recipes/components/recipe-editor-page.tsx`
- Modify: `src/features/recipes/components/recipe-detail.tsx`
- Modify: `src/features/recipes/components/recipe-detail.test.tsx`
- Modify: `src/features/recipes/types.ts`
- Modify: `src/features/recipes/queries.ts`
- Modify: `src/features/recipes/editor-value.ts`
- Modify: `src/features/recipes/normalization.ts`
- Modify: `src/features/recipes/normalization.test.ts`
- Modify: `src/features/recipes/actions.test.ts`

**Interfaces:**
- Consumes: `RecipeSaveInput.groupType`, `RecipeSaveInput.heatLevel`, optional import review metadata, `saveRecipeAction`, and `finalizeRecipeImportAction`.
- Produces: editable ingredient grouping, editable step heat, and save-then-finalize behavior.

- [ ] **Step 1: Write failing editor and query mapping tests**

Assert that an imported initial value renders:

```ts
expect(screen.getByDisplayValue("调料")).toBeInTheDocument();
expect(screen.getByLabelText("第 1 步火候")).toHaveValue("中火");
expect(screen.getByText("AI 整理结果，请确认后保存")).toBeInTheDocument();
```

Assert normal create/edit pages remain unchanged when `importId` is absent. Query mapping must preserve database `group_type` and `heat_level`. Existing recipes created before the migration must render as `main` with empty heat. An imported detail must group `主食材` and `调料`, render `火候：中火`, render 65 seconds as `1 分 05 秒`, and show an external source link with `rel="noreferrer"`.

- [ ] **Step 2: Run recipe tests and verify failure**

```powershell
npm.cmd test -- src/features/recipes/components/recipe-editor.test.tsx src/features/recipes/normalization.test.ts src/features/recipes/actions.test.ts
```

Expected: FAIL because the editor and query mapping do not expose the new fields.

- [ ] **Step 3: Extend detail and editor mapping**

Add:

```ts
groupType: "main" | "seasoning" | "other";
```

to recipe ingredient detail and:

```ts
heatLevel: string | null;
```

to recipe step detail. Select `group_type` and `heat_level` in `getRecipeDetail`, map them in `recipeDetailToSaveInput`, and preserve them in normalization.

Add an optional source to `RecipeDetail`:

```ts
source: {
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourcePlatform: string | null;
} | null;
```

Load the current user's `recipe_sources` row in parallel with existing detail relations. Render grouped ingredients, heat level, an exact minute/second duration formatter, and the original-source link without embedding source text.

- [ ] **Step 4: Extend the editor without restructuring it**

Add a compact ingredient group select with labels `主食材`, `调料`, `其他`, and add an optional heat input beside the existing minute/second timer fields. Keep all existing image, reordering, ingredient-link, category, and tag behaviors.

Extend editor/page props with:

```ts
importId?: string;
importSourceLabel?: string;
unmatchedCategoryName?: string | null;
unmatchedTagNames?: string[];
```

Show unmatched suggestions with explicit `新建并选中` buttons that call existing create actions only after a user click.

- [ ] **Step 5: Finalize after a successful save**

After `saveRecipeAction` returns success, call `finalizeRecipeImportAction(importId, recipeId)` when `importId` exists. If finalization fails, still navigate to the saved recipe but display `菜谱已保存，来源信息稍后可重试关联`; never submit `saveRecipeAction` a second time automatically.

- [ ] **Step 6: Run recipe regression tests and commit**

```powershell
npm.cmd test -- src/features/recipes src/features/recipe-imports
git add src/features/recipes src/features/recipe-imports/components/import-progress.tsx
git commit -m "feat(recipe-editor): review and save imported drafts"
```

Expected: PASS with existing manual create/edit behavior intact.

---

### Task 8: Complete verification, acceptance documentation, and branch delivery

**Files:**
- Create: `docs/testing/module-6a-recipe-source-import-acceptance.md`
- Modify only if verification reveals an in-scope defect: files already listed in Tasks 1–7.

**Interfaces:**
- Consumes: the completed Module 6A flow.
- Produces: reproducible evidence for local, database, responsive browser, Preview, secrets, and Git delivery.

- [ ] **Step 1: Run the complete automated verification**

```powershell
npm.cmd test -- --pool=forks --maxWorkers=1
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: all tests, TypeScript, ESLint, and production build pass. Existing `<img>` warnings may be recorded only if they remain unchanged; new warnings are failures.

- [ ] **Step 2: Verify the local Supabase schema without touching Production**

```powershell
supabase.cmd db reset
npm.cmd test -- src/test/database --pool=forks --maxWorkers=1
supabase.cmd db diff --local
```

Expected: reset and database tests pass; `db diff --local` is empty after all migrations. Do not run `supabase db push` in this task.

- [ ] **Step 3: Perform desktop and mobile browser acceptance**

Test at desktop, 360, 390, and 430 px:

1. paste a public recipe webpage;
2. paste a Chinese recipe paragraph;
3. upload one screenshot;
4. upload six screenshots;
5. reject a seventh image and an unsupported file;
6. verify progress text and failure fallbacks;
7. review group, heat, minute/second timers, classification suggestions, and warnings;
8. edit and save one imported recipe;
9. reopen it and verify source metadata, ingredient groups, heat, and timers;
10. verify no horizontal overflow, console error, duplicate request, or whole-page loading freeze.

- [ ] **Step 4: Record Preview-only configuration boundary**

The acceptance document must list these required Preview variables without values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY
RECIPE_AI_MODEL
```

Record that the migration and variables are not applied to Production without separate approval. If Preview configuration is not authorized yet, mark live AI acceptance as pending rather than substituting fake Production evidence.

- [ ] **Step 5: Scan the diff and repository for secrets**

```powershell
git status --short
git diff --stat
git diff --name-only
git grep -n -I -E "service_role|SUPABASE_SERVICE_ROLE|sk-[A-Za-z0-9_-]{16,}|OPENAI_API_KEY=.+|password=" -- . ":(exclude)package-lock.json"
```

Expected: only intended files changed; `.env.local`, API keys, tokens, passwords, downloaded webpages, uploaded images, and AI response fixtures containing private content are absent.

- [ ] **Step 6: Commit documentation and push the feature branch**

```powershell
git add docs/testing/module-6a-recipe-source-import-acceptance.md
git commit -m "docs(recipe-import): add module 6a acceptance evidence"
git status --short --branch
git push origin feat/recipe-app-shopping
```

Expected: push succeeds to `origin/feat/recipe-app-shopping`; do not push `main`, create a PR, merge, apply Production migration, or deploy Production.

- [ ] **Step 7: Pause for module acceptance**

Report exactly:

1. completed behavior;
2. modified and added files;
3. database, API, Storage, and configuration changes;
4. tests and browser evidence;
5. known limitations, especially platform-specific pages and video links;
6. next module: Module 6B platform-rich-text adapters;
7. branch name, commit IDs, commit messages, push result, and GitHub branch link.

Wait for user acceptance before planning or implementing Module 6B.
