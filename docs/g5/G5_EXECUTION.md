# G5 daily cooking experience — execution contract

2026-10-26. User-approved Master Task; continuous G5-A through G5-E,
one final independent review, no intermediate stage approvals.

Baseline: d3846b62b620f5a2a3bce0708473ce6b6bad3c06, verified after fetch.
Branch: feat/recipio-g5-daily-cooking, from the existing isolated UI worktree.
R1 signing/personal migration remains DEFERRED_BY_USER, not a G5 prerequisite.

## Goal and design boundary

Make collecting, finding, cooking and refining an ordinary local recipe easier.
Mode: Refinement within the accepted UI V2 direction.
Locked: three existing themes/tokens, original Logo, root destinations, local
search/sort/filter semantics, explicit completion, review/online consent,
Repository ownership, SQLite4, Preview7, Backup2 and private media references.
Adjustable: density, text hierarchy, optional-field guidance, empty/error
presentation, keyboard focus, control spacing and responsive details.
No new systems, storage fields, timers, favorites, progress persistence,
network actions, services, dependencies or automatically invented summaries.

## Internal tasks and ownership

- [x] A: library-screens.tsx and scoped g5-library.css. Distinguish a genuinely
  empty library from no search/filter match; keep sort, pagination and callbacks.
  Surface real duration on cards, readable long names and no-image states.
  Test recovery controls and that local search never starts Finder/network.
- [x] B: existing AI/Link/Finder components and scoped g5-intake.css. Clear
  input limits, optional image details, source/review/uncertainty and recovery.
  Preserve exact Service calls and explicit save/online gates. Root integrates
  add-sheet choices and shared manual RecipeEditor without a second flow.
  Test invalid input, review confirmation and explicit request boundaries.
- [x] C/D: existing detail, step content, Focus/Guided, completion and histories,
  scoped g5-cooking.css. Show actual ingredients/preparation/tips together in
  existing cooking Sheet, keep current step dominant, show actual last record
  before older records, optional extras and direct adjustment. No new query
  owner, automatic record, destructive image behavior or generated advice.
  Test overlay Back, read-only browsing, explicit finish and optional extras.
- [x] E: integrate shared CSS, accessible editor errors, touch/long-text fixes.
  New key interactions use tests first; preserve existing meaningful tests.
- [x] Verify current source in cloud: full JS/TS, typecheck, lint, production
  build/isolation, native JVM/build and safe fresh synthetic API36 runtime.
- [x] Browser checks use ephemeral generated data: real routes, three themes,
  widths320/390/412, CSS200% text, reduced motion/solid fallback, canceled
  edit/Picker and explicit AI gates. Capture before/after against the exact
  baseline with the same generated content/viewport. Fake Provider evidence
  is labeled; no paid AI. Reject unexpected external browser requests.
- [x] Self-review, concise screenshots/results/checkpoint, commit and normal
  feature push. Stop at RECIPIO_G5_READY_FOR_REVIEW, not acceptance/freeze.

## Verification evidence boundaries

Initial host free RAM1.23GiB: no local browser/emulator/Gradle. Lightweight
targeted tests are serialized with one worker; heavy validation is cloud-only.
Never use local phones or another project's processes, AVDs, ports or data.
Cloud devices must be newly created and clearly owned; no pre-existing app
may be overwritten, cleared or uninstalled. No permanent signing workflow,
Environment Secrets or user private backup is accessed.
Cloud runtime, browser automation and physical/TalkBack/performance evidence
are separate. Browser text scaling is not Android system-font verification.
Native fixture identity is the default app.recipio.local, ONLY inside an empty
owned cloud AVD, because the frozen AI image URI guard rejects suffix package
names. No URI/security widening, R1 resumption or user APK installation. The
fixture APK is internal/short-lived, never a durable release. Native targets:
11 storage/provider cases,8 real IME/Back Fake-HTTP cases,2 generated-data
manual editor/cooking/cold Activity restart cases; exact21 required, no skips.
Unexecuted physical devices/TalkBack/real-device performance are NOT_RUN.
Transient runner-signed fixture APKs are not user-installable durable releases.
No main merge, tag, formal release, long-term key or restoration of R1 work.

## Review focus

1. Empty library versus no match; clear only the requested search/filter.
2. Text/image import drafts and uncertainty survive presentation changes.
3. Nested cooking Sheet Back closes first; viewing never creates a record.
4. Finish stays idempotent and optional extras do not delete shared media.
5. Long Chinese/Emoji,320px and200% text keep primary actions reachable.

Final delivery: concise differences, actual screenshots, file/Git scope,
fresh cloud results, all limits/NOT_RUN and original-data impact. No large ZIP.

## Verified stopping point

2026-10-26: RECIPIO_G5_READY_FOR_REVIEW. Final source/test commit e5fbe1b75c97295b214dea9ed0f0ad202b2b6b60; cloud run40313302175 all4 jobs PASS. Exact results, failed-driver repairs and NOT_RUN are in G5_REVIEW.md. Documentation/evidence-only delivery follows without changing tested source. No acceptance/freeze or next module is authorized.
