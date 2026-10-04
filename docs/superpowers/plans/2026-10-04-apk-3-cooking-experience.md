# APK-3 Cooking Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Fixed SOL implementation, tests, self-review and delivery; no model switching or per-task user gates.

**Goal:** Extend the accepted local Android recipe library with optional focused/guided viewing, explicit lightweight cooking records, shared finished photos and readable personal change history, without weakening APK-2 backup safety.

**Architecture:** Keep React → RecipeLibrary → Android SQLite/private files, with the existing IndexedDB development adapter. Add one cooking-record table and reuse current recipe changes and immutable image paths. Preserve strict Backup Format v1 and introduce v2 before exposing new records; both import through the existing validated staging/safety-copy/single-transaction restore protocol.

**Tech Stack:** Existing Vite, React, TypeScript, Tailwind/shadcn, Capacitor 8, SQLite plugin 8.1.1, Filesystem, Dexie, Zod, Vitest, Android Java/JUnit. No new dependency is planned.

**Spec:** `docs/PRODUCT_SPEC.md` (including approved APK-3 delta), frozen APK-3 request dated 2026-10-04, `docs/backup-format-v1.md`, APK-1/2 checkpoints. Original approved request: `E:\CODEX\.codex\attachments\171ce6db-7344-46ca-9270-3f6034444021\已粘贴的文本.txt`.

## Global Constraints

- Base commit: `b541d8acfb2aec75dd139705030f3e647fc5a24a`; branch: `feat/recipio-cooking-experience`. Current/remote APK-2 base verified equal and initially clean.
- 产品需求已经确认，不重新做需求访谈，不重新做竞品调研，不重新讨论技术栈。
- SQLite remains Android Source of Truth. Core features do not log in, use network, Supabase, Vercel or cloud sync. Browser results do not prove Android behavior.
- Core detail order: 食材 → 总耗时 → 提前准备 → 关键事项 → 完整步骤. Full steps are default; Focus/Guided are optional views.
- Only explicit “完成这道菜” creates a record. Save minimum record before optional photo/evaluation/note; none is mandatory.
- No AI, OCR/parser/link/video, timer, notification, wake lock, planner/calendar, shopping, favorites, nutrition center, version tree or rollback.
- Reuse nullable `keyTips.stepNumber`; there is no existing step–ingredient relation in the native model, so do not add one.
- Preserve five-second recipe Undo, all original IDs/timestamps/order, APK-2 restore metadata and atomicity. Do not reset databases or destroy restore-needed files.
- Test-only destructive actions must assert the dedicated AVD alias and use generated fixtures; never operate on a phone or unknown data.
- No reset/clean/force-push/main merge/deploy. Small focused commits and final ordinary feature-branch push are authorized.
- This plan is the single permitted approval pause. After approval, continue through internal tasks unless a frozen semantic/data-safety blocker occurs; then report `APK_3_BLOCKED` with evidence.

## Review Focus

1. A completion insert succeeds but its response is lost: retry with the same operation UUID must return the original record/time, not create another (Task 1/6).
2. One image is used by cover, steps, old change snapshots and cooking photos while export is active: deleting one reference must never remove the live/pinned file (Task 2/3).
3. Valid v1 contains required `changes`; “missing history” is not permission to accept malformed v1. Validate unchanged v1 first, then add only empty cooking records (Task 3).
4. Focus/Guided Android Back, zero steps and 320px/large text: return to the preserved detail; never fabricate completion or hide main buttons (Task 5/9).
5. Equal timestamps, no-op edits and restore invalidation: stable history pagination, no noisy changes, no derived card fields in strict snapshots, no stale record UI after Replace (Task 1/4/7/8).

---

## Audit decisions / minimum data design

- Current native SQLite is v3: six business tables plus `backup_restore_state`. No native cooking-record table exists. Dexie is v6; its old account-scoped cooking sessions are not the new Android domain.
- Current `recipe_changes` already stores formal before/after snapshots. Keep this single source; change summaries are derived for display, not stored as another version model.
- Current detail already renders all steps and centralized/matching-step key tips. Reuse that logic, move total time to its frozen content position, and avoid blank image shells.
- Current edits always write a change. Compare normalized editable fields first; an identical save must not update timestamps or write history.
- SQLite v4 adds only `cooking_records(id, recipe_id, cooked_at, finished_photo_path, evaluation, note)` with `recipe_id` FK `ON DELETE CASCADE`, nullable optional fields and index `(recipe_id, cooked_at DESC, id DESC)`. Evaluation values: `tasty`, `okay`, `adjust_next_time`; UI: 好吃／一般／下次调整. Note: at most 2,000 characters.
- Minimal record UUID is generated once per explicit completion attempt and retained across retry. A new explicit completion after closing the completion view is a different operation. `cookedAt` is UTC milliseconds, assigned on the first successful insert and unchanged by extras.
- Preview v7 adds `nativeCookingRecords` with indexes `id, recipeId, [recipeId+cookedAt+id]`; pin the existing v6 declaration rather than accidentally changing its migration. Do not erase or rewrite old cloud/cache tables.
- `RecipeName`/`RecipeDetails` keep their stored identity shape. Add `RecipeListItem` for `lastCookedAt` only; use an explicit formal snapshot projection so card-derived fields never enter before/after JSON or backup.
- Record history/change history use descending `(time, id)` keyset cursors and page size 20, maximum 100. Detail shows count, last cooked time and latest 3; unchanged home ordering is created time/id descending.
- Finished photo and cover reuse the same immutable relative path; no copy-on-set-cover and no Blob-in-SQLite. Full reference closure includes soft-deleted recipes still eligible for Undo, steps, before/after snapshots and cooking records.
- Record deletion is explicit confirmation, immediate, without a second Undo system. Recipe deletion remains existing five-second Undo; only expiry cascades associated records/history.
- Cleanup is candidate-only, never a whole-directory sweep. Collect candidate paths before record/expired-recipe removal; after database commit, under the existing data gate, re-read the full closure and unlink only validated, unreferenced, unpinned candidates. Reference-read errors retain files. IO cleanup failure is a warning, not a falsely reported SQL rollback. Old unexplained orphan files remain conservatively retained.
- Backup export can release the brief snapshot data lock only after pinning its image closure. Pins last through archive write/readback and are released in `finally`; cleanup never deletes a pinned file. Restore safety snapshots remain under existing exclusive gate.
- v1 is frozen strict format1/source schema3; v2 is strict format2/source schema4 and adds required `cookingRecords` and `counts.cookingRecords`, each record using `finishedPhotoAssetId`. Maximum 100,000 cooking records; existing archive/data/media limits remain unchanged.
- A checked v1 is internally normalized to v2 with `cookingRecords: []`, preserving all `changes`. Keep the original validated manifest/data hash for journal and commit facts; never invent a manifest/hash for normalized data. New user exports and private safety backups are v2.

## File responsibility map

- Domain: `src/native/cooking-model.ts` (record schemas/types/cursors), `record-validation.ts` (unchanged shared UTC/id validators), existing `recipe-model.ts` (RecipeLibrary additions/list projection), `recipe-history.ts` (formal snapshot projection/no-op comparison).
- Storage: existing `recipe-store.ts`/`sqlite.ts` and `preview-store.ts`, `src/features/offline/local-db.ts`; new `cooking-store.ts` for small SQL record/history query helpers used only inside the caller's data gate.
- Media: new `media-lifecycle.ts` (pure reference closure, pin leases and candidate pruning), existing `media.ts` (validated device unlink/readability adapter). No asset registry/schema is necessary for immutable shared paths.
- Backup: existing `backup/format.ts` retains unchanged v1 validators; new `backup/format-v2.ts` owns v2 schemas/relations and imports v1 common fields, while new `backup/compatibility.ts` owns version dispatch/normalization. This one-way dependency avoids circular initialization and keeps original v1 strictness independently testable. Update existing references/repositories/service/bridge; Java archive version dispatch and plugin's independent DB reference audit must both include cooking photos.
- UI: new `recipe-step-content.tsx`, `step-viewer.tsx`, `cooking-completion.tsx`, `cooking-history.tsx`, `recipe-change-history.tsx`, `recipe-change-summary.ts`; targeted detail/library wiring and editor regression only.
- Verification: new native contract/migration/media/UI/compatibility tests, Android cooked-data instrumentation and `scripts/verify-cooking-android.mjs`; reuse APK-2 fixtures/provider/archive test infrastructure. Keep actual external v1 Golden unchanged.
- Delivery: `docs/backup-format-v2.md`, `docs/checkpoints/2026-10-04-cooking-experience.md`, `docs/verification/cooking-experience-android.md`, `scripts/build-cooking-review-packet.mjs`; update existing state/decisions/architecture, not duplicate them.

### Task 1: Incremental record storage and shared repository contract

**Files:** Create `src/native/{cooking-model.ts,record-validation.ts,cooking-store.ts}`, `cooking-store.test.mjs`, `cooking-migration.test.mjs`, `preview-cooking-store.test.ts`; modify `recipe-model.ts`, `recipe-store.ts`, `sqlite.ts`, `preview-store.ts`, `src/features/offline/local-db.ts`, and current real-SQLite test helper `backup/sqlite-test-driver.mjs`.

**Interfaces:** `CookingRecord { id, recipeId, cookedAt, finishedPhotoPath: string|null, evaluation: CookingEvaluation|null, note: string|null }`; `CookingRecordExtras` is the last three fields. `CookingCursor { cookedAt, id }`; `ChangeCursor { changedAt, id }`; `CookingSummary { count, lastCookedAt: string|null }`; `RecipeChange { id, recipeId, changedAt, before: RecipeDetails, after: RecipeDetailsInput }`; `LibraryCleanupResult { cleanupWarning: string|null }`.

`CookingEvaluation = "tasty" | "okay" | "adjust_next_time"`; record/cursor ID and time fields are strings. `record-validation.ts` exports `entityIdSchema` and `utcTimeSchema` with exactly the existing backup id/UTC semantics; `cooking-model.ts` exports `cookingRecordSchema`, `cookingRecordExtrasSchema` and their inferred domain types. Backup import schemas do not trim/default optional values. Extracting shared validators must not alter v1 accepted values.

`RecipeLibrary` gains:
```ts
recordCooking(recipeId: string, recordId: string): Promise<CookingRecord>;
updateCookingRecord(id: string, extras: CookingRecordExtras): Promise<CookingRecord>;
deleteCookingRecord(id: string): Promise<LibraryCleanupResult>;
listCookingRecords(recipeId: string, limit?: number, cursor?: CookingCursor): Promise<CookingRecord[]>;
getCookingSummary(recipeId: string): Promise<CookingSummary>;
listRecipeChanges(recipeId: string, limit?: number, cursor?: ChangeCursor): Promise<RecipeChange[]>;
setCookingPhotoAsCover(recordId: string): Promise<RecipeDetails>;
```
`list()` returns `RecipeListItem[]`, where `RecipeListItem extends RecipeName` adds `lastCookedAt: string|null`. `purgeExpired()` returns `LibraryCleanupResult` (callers previously discarding its result can still do so). Helpers do not reacquire the gate. Cover/media/history semantics land in Tasks 2/4 before UI connects them.

- [ ] RED: `it("migrates exact v3 rows and restore metadata to v4 without changing original data")` uses the old migration statements and generated v3 fixture; assert all old six-table fields, metadata, created/updated times identical and new table empty. A failing v4 migration must retain v3 version/data. Preview v6→v7 must preserve old stores and device media.
- [ ] RED: assert minimum null-extra record, same UUID retry returns one row/original time, different-recipe UUID reuse rejected, invalid enum/note/path rejected, deleted/nonexistent recipe rejected, descending equal-time pagination and SQL/Preview parity. DB insert failure leaves no record or recipe mutation.
- [ ] Run `npx.cmd vitest run src/native/cooking-store.test.mjs src/native/cooking-migration.test.mjs src/native/preview-cooking-store.test.ts --maxWorkers=1 --no-file-parallelism`; record legitimate failures before implementation.
- [ ] Implement v4/v7 migrations and typed methods using shared gate/transactions and parameterized SQL. Do not replace the database, change existing columns or allocate new recipe IDs.
- [ ] Re-run the exact targeted command plus `npm.cmd run typecheck`; all must pass. Commit only related files: `feat(cooking): add local record storage and safe incremental migration`.

### Task 2: Shared image closure, deletion and export pins

**Files:** Create `src/native/media-lifecycle.ts`, `media-lifecycle.test.ts`, `cooking-media.test.mjs`; modify `media.ts`, `recipe-store.ts`, `preview-store.ts`, `backup/coordinator.ts`, `library-app.tsx` (only cleanup-warning handling), existing deletion/media tests.

**Interfaces:** `collectRecipeImagePaths(recipe: RecipeDetailsInput): string[]`; `collectLibraryImagePaths(recipes: RecipeDetails[], changes: RecipeChange[], records: CookingRecord[]): string[]`. `LocalMediaLifecycle.pin(paths: readonly string[]): () => void`; `pruneCandidates(candidates: readonly string[], readReferences: () => Promise<readonly string[]>): Promise<LibraryCleanupResult>`. A caller holds the shared data gate while gathering fresh references/pruning; `pin()` is established before releasing a snapshot lock. `deleteLocalImages(paths: readonly string[]): Promise<void>` validates owned relative paths and resolves inside private storage/device-owned media; no recursive/broad delete.

- [ ] RED: deleting a record leaves the recipe and a shared cover/step/history/other-record photo; removing a cover leaves a record's photo; only last-reference deletion removes its candidate. Pending recipe Undo preserves all children/photos, undo restores them, expiry alone cascades.
- [ ] RED: paused export pin retains a candidate despite concurrent record deletion; cleanup reference-query failure retains all files; unlink failure returns a warning after the successful database deletion, not a “restore failed” fiction. Scope tests prove no unrelated file/store is removed.
- [ ] Run `npx.cmd vitest run src/native/media-lifecycle.test.ts src/native/cooking-media.test.mjs src/native/media-native.test.ts --maxWorkers=1 --no-file-parallelism`, capture RED.
- [ ] Implement one shared lifecycle/reference collector, immutable path reuse and candidate cleanup for native and preview. Retain files on ambiguity, clean neither editor drafts nor unknown old orphans; report cleanup warnings in existing UI status.
- [ ] Re-run targeted tests and existing recipe deletion/Undo tests. Commit `feat(media): protect shared cooking photos and backup references`.

### Task 3: Strict backup v2 with unchanged v1 import and safe restore

**Files:** Create `src/native/backup/format-v2.ts`, `compatibility.ts`, `compatibility.test.mjs`; modify existing `format.ts` only for unchanged shared validator extraction, `references.ts`, `repository.ts`, `preview-repository.ts`, `service.ts`, `native-archive.ts`, `restore-recovery.ts`, related fixture/tests and controls counts. Modify `android/app/src/main/java/app/recipio/local/{LocalBackupArchive.java,LocalBackupPlugin.java}` and corresponding JVM/connected tests. Create `docs/backup-format-v2.md`; add a successor note to v1 without rewriting its rules.

**Interfaces:** `compatibility.ts` exports `validateBackupData(data: unknown, manifest: unknown): ValidatedBackup`, dispatching by manifest version to original strict v1 validation and `validateBackupV2`. `ValidatedBackup = ValidatedBackupV1 | ValidatedBackupV2`; each member contains its corresponding `data` and original `manifest`. `BackupManifest = BackupManifestV1 | BackupManifestV2` is the UI/bridge import-manifest union; writes use `BackupDataV2`/`BackupManifestV2` exclusively. Neither validator admits unknown/missing fields. `normalizeBackupData(checked: ValidatedBackup): BackupDataV2` adds only missing cooking collection to a valid v1. `BackupSourceSnapshot` is current schema4, includes records with local photo paths. `fromPortableData(data: BackupDataV2, paths: Record<string,string>): BackupSourceSnapshot`. `BackupRepository.withPinnedSnapshot<T>(work: (source: BackupSourceSnapshot) => Promise<T>): Promise<T>` captures+pins under the gate and releases pin in `finally`, without holding the gate for normal export IO. Existing `snapshot`, `replace`, `exclusive`, commit metadata contracts otherwise stay intact.

- [ ] RED: unchanged actual generated v1 `artifacts/backup-restore/golden.recipio` (SHA `6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313`, 2,761 bytes) imports all original changes/media. Store a copied generated-data fixture with its expected hash if needed. Missing `changes`, added cooking fields to v1, unknown versions, dangling records, wrong enum/count/asset/hash and oversized records reject before writes.
- [ ] RED: v2 round-trip includes seven business entities and all current/historical/cooking photos; cover/photo shared references restore to one file and byte SHA stays equal. v1 normalization preserves changes and clears cooking collection only as part of explicitly confirmed Replace; pre-restore safety backup remains complete v2.
- [ ] RED: failure on the Nth cooking insert rolls back all seven tables and metadata; staging/safety failure leaves old media/data; lost commit acknowledgment uses the original input hash to reconcile; Java startup cleanup preserves cooking-only generation references, including during Undo.
- [ ] Run `npx.cmd vitest run src/native/backup --maxWorkers=1 --no-file-parallelism`; JVM `./android/gradlew.bat -p android :app:testDebugUnitTest --console=plain --max-workers=2`; save relevant RED before implementation.
- [ ] Implement version-specific TS/Java validation, export2/schema4 only, SQL/Preview snapshot/replace/count/readback and native schema4/reference audit. Keep container validation, stage-before-confirm, private safety copy, SQL atomic replacement and original journal hash unchanged. Do not globally substitute all 1/3 literals with 2/4 or weaken v1 to pass tests.
- [ ] Re-run all backup TS/JVM tests; update DECISIONS with frozen-v1→v2 rationale and v2 format spec. Commit `feat(backup): add cooking data v2 and preserve strict v1 restore`.

### Task 4: Meaningful changes and readable personal history

**Files:** Create `src/native/recipe-history.ts`, `recipe-change-summary.ts`, `recipe-change-summary.test.ts`, `recipe-change-history.tsx`, `recipe-change-history.test.tsx`; modify storage save/set-cover methods and existing details/preview tests.

**Interfaces:** `toHistorySnapshot(recipe: RecipeDetails): RecipeDetails`; `sameEditableDetails(before: RecipeDetailsInput, after: RecipeDetailsInput): boolean` compares explicit normalized editable values, not derived list state. `summarizeRecipeChange(change: RecipeChange): string[]`. `RecipeChangeHistory({ recipeId, store, onBack })` reads existing paginated history; no writes/rollback controls.

- [ ] RED: sugar `30g → 15g`, ingredient add/delete, step edit/reorder/image, preparations, key tips/relation, duration, notes and cover get readable old/new summaries. Formatting-only normalized no-op keeps `updatedAt`/change count unchanged; record/view changes produce no recipe snapshot. Read-only historic old values must not be trimmed/coerced on import.
- [ ] RED: cover from a cooking photo shares path and writes one meaningful change; repeat set-as-cover creates none. Key-tip associations survive editor reorder and safe deletion. Snapshot before/after retains exact formal shape with no last-cooked/count/preparation-hint fields.
- [ ] Run `npx.cmd vitest run src/native/recipe-change-summary.test.ts src/native/recipe-change-history.test.tsx src/native/recipe-details.test.mjs src/native/preview-store.test.ts --maxWorkers=1 --no-file-parallelism`; capture legitimate RED before implementation.
- [ ] Implement no-op projection and paginated read-only UI; field-group summaries not Git diff/version tree. Same-time cursors use IDs to avoid duplicates/omissions.
- [ ] Re-run targeted change/editor/backup tests; commit `feat(recipes): show meaningful personal recipe changes`.

### Task 5: Full steps, Focus and optional Guided viewing

**Files:** Create `src/native/recipe-step-content.tsx`, `step-viewer.tsx`, `recipe-detail.test.tsx`, `step-viewer.test.tsx`; modify `recipe-detail.tsx`, `library-app.tsx`, `library-app.test.tsx`.

**Interfaces:** `RecipeStepContent({ recipe: RecipeDetails, stepIndex: number })`; `StepViewer({ recipe, mode: "focus"|"guided", initialIndex, onClose: () => void, onComplete: () => void })`. Viewer state is local view-only index; no repository dependency. LibraryApp owns navigation priority; detail stays mounted while a viewer is open to preserve scroll/trigger focus.

- [ ] RED: detail order is ingredients/time/preparation/tips/full steps; all text/step order visible, matching tips come from same array. No-image step mounts no LocalImage shell; valid local images present in full/focused/guided views.
- [ ] RED: Focus arbitrary index, first/last bounds, prev/next and Back return without recipe/record writes; Guided starts at 1/N, correct progress, exit creates nothing, final explicit completion callback only. Zero steps leaves detail/complete usable and disables start without nonexistent step access.
- [ ] Run `npx.cmd vitest run src/native/recipe-detail.test.tsx src/native/step-viewer.test.tsx src/native/library-app.test.tsx --maxWorkers=1 --no-file-parallelism`, capture RED.
- [ ] Implement shared content and accessible touch controls (minimum 44px, wrapping text/buttons, scrolling content, safe-area). Central Back order: active subview → detail → origin list; editor retains its existing dirty guard. No timers/wake locks/notifications or stored progress.
- [ ] Re-run targeted tests; browser/Android narrow-screen and actual Back checks are Task 9, not inferred from DOM tests. Commit `feat(cooking): add optional focused and guided step views`.

### Task 6: Explicit completion and optional local photo/evaluation/note

**Files:** Create `src/native/cooking-completion.tsx`, `cooking-completion.test.tsx`; modify library/detail wiring, media contract tests and related storage/UI tests.

**Interfaces:** `CookingCompletion({ record: CookingRecord, onUpdate: (extras: CookingRecordExtras) => Promise<CookingRecord>, onSetCover: () => Promise<RecipeDetails>, onAdjust: () => void, onDone: () => void })`. Parent persists `recordCooking(recipeId, attemptUuid)` before mounting completion, retaining UUID on failure/retry and using a synchronous ref lock before awaiting.

- [ ] RED: detail/Focus/Guided browsing creates zero records; double click/retry after acknowledged-or-uncertain failure creates exactly one with first timestamp. Empty completion immediately exits with minimum record; each extra is independently optional and editable with no cookedAt changes.
- [ ] RED: real picker cancel retains prior photo/form; image/read/write failures retain minimum record and unsaved text. Set-as-cover reuses path, keeps record photo, preserves current fresh recipe fields rather than overwriting a stale detail. Unsubmitted extras Back uses existing discard confirmation; successful extras are not saved twice.
- [ ] Run `npx.cmd vitest run src/native/cooking-completion.test.tsx src/native/library-app.test.tsx src/native/cooking-store.test.mjs src/native/cooking-media.test.mjs --maxWorkers=1 --no-file-parallelism`, capture RED.
- [ ] Implement optional completion form, native picker/Web adapter, explicit cover action and existing editor entry. “完成并返回” saves entered extras; if saving fails, keep values and offer retry or explicit “仅保留做过记录”. Adjust saves pending extras first or lets user explicitly skip them; editor cancel never deletes the already-created record.
- [ ] Re-run targeted tests; commit `feat(cooking): persist explicit completion with optional finished photos`.

### Task 7: Cooking history and home last-cooked display

**Files:** Create `src/native/cooking-history.tsx`, `cooking-history.test.tsx`; modify detail/library UI and list projection tests.

**Interfaces:** `CookingHistory({ recipeId, store: RecipeLibrary, onBack: () => void, onChanged: () => void })`; consume Task 1 records/summary/cursors, Task 2 deletion result and LocalImage. Latest 3 on detail; history fetches pages of 20 with stable cursor. List last-cooked projection must be a batched query/aggregation, not per-card requests.

- [ ] RED: count/last date/recent 3, load-more equal-time ordering, delete-confirm cancel leaves data, delete one record retains recipe/shared files and updates summary. Empty/error/retry states preserve navigation and do not ask to clear data.
- [ ] RED: home shows last cooked date only with a true record; date handling follows current device timezone. Recording/edits do not change created-time ordering, search or duration-filter boundaries. Library cards retain their limited layout.
- [ ] Run `npx.cmd vitest run src/native/cooking-history.test.tsx src/native/library-app.test.tsx src/native/cooking-store.test.mjs --maxWorkers=1 --no-file-parallelism`, capture RED.
- [ ] Implement light history/summary/display wiring; after completion/delete/cover/restore invalidate affected list/detail/subview data. No statistics center, ranking or calendar.
- [ ] Re-run targeted/UI and old library regressions; commit `feat(cooking): add lightweight history and last-cooked cards`.

### Task 8: Freeze regression fixtures and Android acceptance tooling

**Files:** Create `scripts/verify-cooking-android.mjs`, `scripts/build-cooking-review-packet.mjs`, `android/app/src/androidTest/java/app/recipio/local/LocalCookingStorageTest.java`; extend existing archive/provider instrumentation tests. Create `docs/verification/cooking-experience-android.md` and checkpoint skeleton with pending—not passed—checks.

**Interfaces:** `node scripts/verify-cooking-android.mjs <adbAbsolutePath> <serial> <mode> [apkAbsolutePath]`, modes `baseline|upgrade|flows|media|backup|offline|narrow`; require AVD alias `Recipio_Backup_36`, boot complete and explicit generated-data provenance before destructive operations. Reuse actual SAF/selection helpers, but do not inject record/cover paths to replace UI proof.

- [ ] RED: instrumentation tests cover isolated real v3→v4 SQLite migration/failure and cooking-only-media cleanup in actual native context. JS acceptance assertions cover all seven tables, portable shared references and SHA, minimum/null records, unchanged IDs/times/sort, cancellation/corruption and transaction rollback.
- [ ] Implement fresh reports containing serial/alias/Android/ABI/APK hash/time, commands/exit/cases/warnings and actual before/after assertions. UI-only tests must read back native SQLite/media to substantiate claims. Destructive testing cannot silently switch target or accept an unknown device.
- [ ] Preserve original v10 APK/Golden/empty backups and APK-2 evidence. Upgrade acceptance starts from v10 generated data before installing v11; verify six old tables/metadata/media unchanged except added schema/table and safe documented migration effects.
- [ ] Packet builder whitelists at least `manifest.json`, `diff.patch`, `checkpoint.md`, `verification.md`, `android-verification.md`, `migration-notes.md`, `backup-compatibility.md`, `test-results.txt`, `apk-metadata.txt`. Manifest records base/head/file lengths/SHA; ZIP uses CreateNew/no overwrite and closed-ZIP reread. No APK, private photos/records, raw DB, credentials or signing keys inside.
- [ ] Run script syntax checks and isolated Android tests; commit `test(cooking): add native migration and generated-data acceptance evidence`.

### Task 9: Fresh full verification, actual Android scenarios and delivery

**Files:** Finalize checkpoint/verification, CURRENT_STATE/DECISIONS/ARCHITECTURE and v2 compatibility notes; generated outputs under ignored `artifacts/cooking-experience/`.

- [ ] Run full test suite fresh: `npm.cmd test -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/cooking-experience/test-results-final.json`. Record files/cases/failures/skips; do not reuse 673-case APK-2 history.
- [ ] Run `npx.cmd vitest run src/native --maxWorkers=1 --no-file-parallelism`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build:local`; preserve actual warnings rather than suppressing them. Old Next server build is not this local Android build.
- [ ] Run `npm.cmd run sync:android`, then `./android/gradlew.bat -p android :app:testDebugUnitTest lintDebug assembleDebug --console=plain --max-workers=2 -PapkVersionCode=11 -PapkVersionName=0.4.0-cooking-experience`. Existing build script: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -ArtifactName recipio-cooking-experience-v11-debug.apk -VersionCode 11 -VersionName 0.4.0-cooking-experience`. Retain previous artifacts; version11/name are planned until build output confirms them.
- [ ] Start only dedicated API36 AVD with hidden process window; inspect available devices once. Set `ANDROID_SERIAL` to verified dedicated serial for `connectedDebugAndroidTest`, run full suite with the same version properties; record assumptions/skips separately. No device means honest pending evidence, not endless retries/nonexistent-environment repair.
- [ ] Run actual generated-data Android flows: default full steps → arbitrary Focus → Back retains position → minimum complete; Guided exit/no record then explicit final completion; optional PNG/photo→cover → cold startup both visible; sugar30g→15g/current+read-only old values; five-second recipe Undo with children/history/photos; single-record/shared-file delete; 320px/large text/actual Back; offline cold start/view/edit/complete/history.
- [ ] Run real v1 import and new external v2 export → readback/hash → clear only generated test data → Replace restore. Assert cooking history/photos/current cover/old change photos/counts/IDs/times/positions; hash bytes exactly, corruption/cancel/fault rollback still leave old state. Test startup reconciliation preserving a cooking-only generation and interrupted operations. Re-run full connected suite after final code repairs.
- [ ] Audit merged Android manifest/backup rules: retain no automatic cloud/device-transfer backup and no new network/broad media permissions. Actual OEM migration/physical phone are separate Not Run evidence unless genuinely tested.
- [ ] Self-review scope, migrations, error paths, concurrency, image references, v1 strictness, v2 full closure and restore truth. If code changes during review/acceptance, rerun affected tests plus final full verification; never mark pre-fix results final.
- [ ] Record APK absolute path/size/SHA/package/version and generated test-backup paths/size/SHA. Final APK is `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-cooking-experience-v11-debug.apk`; packet is `...\artifacts\cooking-experience\review-packet-apk-3-cooking-experience.zip`. No hash/size is claimed before production.
- [ ] Update documentation to actual results (migration, backup compatibility, known retained orphan/cleanup limitations, native vs browser vs physical-phone boundaries), `git diff --check`, targeted diff/status and secret scan; commit focused delivery docs, generate packet pinned to that HEAD, ordinary push `feat/recipio-cooking-experience`, verify local/remote equality and clean tree. No PR/main/deploy.
- [ ] Final concise module report follows user-required 13 fields; status: `APK_3_COMPLETE` only when all required implementation and simulator acceptance passed; `APK_3_PENDING_DEVICE_TEST` when built code/APK still lack required device proof; `APK_3_BLOCKED` for unsafe migration/backup/reference architecture. Physical-phone absence is explicitly Not Run and is never implied by simulator evidence. Stop; do not enter APK-4.

## Requirement coverage / self-review

Frozen sections 1/19 → Task 1/8/9; sections 3–9 → Task 5; sections 10–13 → Task 1/2/6; sections 14–16 → Task 4/6; sections 17/18 → Task 2/7; sections 20/21 → Task 3/8/9; sections 22/23 → Task 7; scope bans apply globally; sections 26–34 → all RED/GREEN steps and Tasks 8/9.

No independent product-design approval is added. Backup work is intentionally earlier than the request's suggested Task 10 so no released cooking UI can write records its backup omits. All shared public names/types above are the downstream contract; implementation may split private helpers for readability but cannot silently change frozen semantics. The plan is documentation only: no APK-3 code, migration, tests or device actions have run yet.
