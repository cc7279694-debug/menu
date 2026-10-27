# G2 — Production Core UI Integration

## Approved contract / identity

User approved G1 `9a17b1c369f5567404540ac249379c3063d6284f` as
UI_V2_G1_VISUAL_ACCEPTED — PASS WITH NOTES and explicitly authorized G2.
Continue feature `feat/recipio-ui-v2-glass-minimal` in the existing isolated
worktree. Main stays649804a; do not reset/clean/stash unknown work.
The current G2 user attachment (2026-10-23) is the execution authority alongside
RECIPIO_UI_V2_SPEC.md, EXECUTION.md, PRODUCT_SPEC and the accepted final gallery.
This is implementation bookkeeping, not another design plan or visual choice.

Goal: real local Home/Library/Detail/Editor/Focus/Guided/Completion/History use
the accepted Warm Ivory geometry and shared primitives, not fixture data.
Pure Glass/Soft Sage remain candidates, no persisted theme setting.

Locked: RecipeLibrary/Repository, SQLite4, Preview7, Backup2; Native/IME/KeyStore,
Provider/Finder/source/SSRF/Share contracts; existing Logo/icons/media; explicit
completion, no-op history, five-second deletion deadline and all busy/uncertain
ownership guards. No AI calls, new dependencies, G3/G4, video, main/tag/deploy.
Allowed: core presentation, shared V2 component/CSS extraction, scoped tests,
minimum route/scroll glue, approved version metadata and internal debug APK.
G3 pages keep their current renderer/service and usable entry/return paths.

## Ordered implementation / interfaces

1. Establish production behavior protection using real PreviewRecipeLibrary and
   fake external ports. Existing correct invariants may be characterized GREEN;
   new missing integration/scroll behavior must be observed RED before repair.
2. Extract proven common V2 layout CSS from showcase; preserve exemplar output.
   Production imports only shared primitives/tokens/styles, never showcase,
   demo-data, generated food images, debug route or sample toolbar. Update real
   build-graph guard to allow shared V2 and reject every demo module/asset.
3. Home + Library: real paginated list100/offset, creation order/search/filter,
   compact Add/Finder intents, recent strip and simple rows, root-only glass nav.
   Restore origin query/filter/page/scroll after Detail, with existing state owner.
4. Detail + viewer: shared G1 hierarchy, real local images/full content/overview,
   original callbacks, default complete steps, optional Focus/Guided, explicit
   idempotent completion only. More/ingredients/images use Base UI, no second
   modal/Back/IME state machine. Respect measured action clearance and deep solid.
5. Editor + completion/history: preserve form value/lock/model/media lifecycle,
   attach scoped V2 appearance only in G2 (AI shared editor keeps legacy default).
   Use original save/uncertain/dirty guards; existing complete/history services.
6. Fresh validation + internal candidate: protected DOM flows, native UI suite,
   whole tests, typecheck/lint/build/isolation, sync, Java units/lint/assemble.
   New unused incremental code/0.10.0-ui-v2-g2-rc1, same package/debug certificate.
   Dedicated emulator only if ownership/memory safe; phone untouched. Browser,
   emulator and physical evidence distinguished; environment limit = NOT_RUN.
7. Compare actual core screens/states to G1 (not fixture production fallback),
   final engineering review, focused commits/normal feature push, checkpoint,
   APK path/bytes/SHA/package/version/signature and exact remote read-back.
   Stop READY_FOR_REVIEW or PENDING_ANDROID_TEST; no automatic G3.

## Pre-flight shared-interface rulings

- Shell owns routes/busy/share/restore; presentations consume callbacks only.
  Preserve lazy service owners and hidden settings detours; no extra mounting.
- RecipeEditor also serves AI. An opt-in core presentation preserves G3 behavior
  and prevents unintended visual/dirty-dialog replacement in those flows.
- Production uses document scrolling, existing detail viewer return references
  and native Back. Keep these owners; add bounded root-list scroll restoration
  instead of replacing the app router with the showcase state machine.
- CSS split is proven reuse, not a new glass library or another concept. The
  approved brief overrides ImageGen/library-selection/re-interview Skill gates.
- Existing isolated worktree/dependencies are verified; no install needed.
  Durable Windows ledger below replaces Bash-only scratch helpers.

## Review focus

Pagination is still bounded; search never triggers external calls; no fixture
in production; no changed media reference ownership; completion cannot duplicate;
dirty/busy/uncertain and shared editor paths retain ownership; root-list and
detail scroll/focus restore; modal Back/focus handling precedes navigation;
G3 services are unchanged and remain reachable; current APK signature and version
allow upgrade without destructive data operations.
