# G6 execution ledger

Approved spec: [G6_TASK.md](G6_TASK.md). Continuous A–E implementation;
one final ChatGPT review. No intermediate approval gate.

## Verified baseline and isolation

- Remote G5=cb40a9fb1d07a1856f08725269563fd297299003, scoped ACCEPTED/FROZEN.
- Product code equals tested G5 e5fbe1b (only acceptance/docs followed).
- New branch feat/recipio-g6-serving-adjustment at that baseline.
- Dedicated sibling worktree E:/CODEX/VIBE CODING/recipe-step-app-g6.
  Native worktree tool returned Not a git repository for this projectless chat;
  explicit Git fallback creates isolation without changing the G5 checkout.
- G5 and video experiment worktrees untouched. Main remains4a26b88.
- Local free RAM0.83GiB: no local npm install/test/browser/Gradle/emulator.
  Use hosted cloud validation with synthetic data; no user phone operations.
- SQLite4/Preview7/Backup2, Repository/media/AI/network/Logo frozen.
  R1 signing/migration deferred; G4 pending. No PR/merge/tag/release.

## Shared interfaces and choices

- A supplies pure amount/target validation functions. B consumes results only
  for presentation; never mutate/copy computed amounts into RecipeDetails.
- B owns one transient valid target per selected recipe session in LibraryApp,
  shared by detail and existing kitchen Sheet. Input draft is local UI text.
  Opening another/re-entering a recipe and successful save reset the target;
  kitchen open/close, edit cancel and related recipe history keep the session.
- Input range0.1..10000 remains the model's range. Invalid/partial input never
  becomes the active target; last valid values remain displayed with an error.
- Legacy baseServings/referenceServings mappings are read-only reference;
  RecipeDetails.servings is the sole real denominator. No guessed defaults.
- A's parser matches the entire amount plus a supported unit, maps only
  full-width numeric characters, and conservatively preserves other text.
- C's G6 cloud browser/native entry reuses proven G5 tooling without changing
  G5 evidence/workflows. Exact fresh counts and source SHA required at finish.

## Progress

- [x] A: literal pure-function tests → observed RED → safe arithmetic.
- [x] B/C: real LibraryApp lifecycle/zero-write tests → observed RED → UI.
- [x] D: scoped three-theme layout/accessibility + history preview wording.
- [x] E: current-source full JS/TS/type/lint/build/isolation, JVM/Android build,
  real API36 numeric IME/Back, actual browser screenshots and zero-network.
- [x] Fresh internal review; final report/current state/roadmap prepared. Final
  documentation-only commit/push and remote/clean-tree check precede handoff.

## Evidence rules

G5 numbers are historical baseline only. Native IME is not browser keys;
CSS200% is not Android system font scaling. Activity restart is not cold
process flight-mode evidence. Cloud debug identity is not durable signing.
No real AI, private media, personal backups or existing-device data are used.
Final stop: RECIPIO_G6_READY_FOR_REVIEW, not acceptance/freeze or G7.

## Observed test-first evidence

Commitc27fb730e7a289f14402f714a68cf74951f31675, cloud run40343923995:
frozen affected G5 gates20/20 PASS. G6 two files172 assertions:112 FAIL,
60 PASS. Pure failure is the stub returning false for valid servings; UI
failure is the missing actual serving control, not a missing import or fixture.
Now implementing A and B/C from those literal expectations. Native/browser
QA is separate verification, not claimed executed by source existence.

## Integrated RED and decimal control repair

Cloud40345842092 at3a75dc46912f5ab7f1bfb937c1c80342f313205b:
G5 affected20PASS; G6 pure162PASS, integration9PASS/2FAIL (173 total).
The added decimal button regression reproduced1.2999999999999998 instead
of1.3. Fix is decimal integer-part stepping preserving the fractional text,
not rounded binary addition or a new UI precision cap.24 literal helper cases
added; original162 expectations unchanged. Internal read-only review found
this one P2; follow-up review requested after fix.

The other failure was test readiness: CookingHistory intentionally disables
Back during its initial real store read. The test now waits for the existing
Back button to become enabled before clicking; no production history changes.

Full G6 cloud workflow restored for final current-source JS/type/lint/build,
real-page browser checks, key-free Android build and fresh owned API36 fixture.
Earlier G5/cloud numbers are not final G6 evidence. No local heavy tests run.

## First full-cloud findings at e80ac3e

Run40346467769 browser completed all10 business flows, including actual complete
Preview rows/media digests, zero adjustment writes and one explicit record.
Its first geometry gate correctly FAILED: new target input128x44 at Warm320,
because legacy #root input min-height44 outranked the scoped rule. G6 input
selector now explicitly covers #root while retaining the Portal selector;
48px assertion remains unchanged. This is a scoped CSS fix, not relaxed QA.

Android build completed, but hosted emulator SDK extraction failed with
ZipFile unknown archive before the device/helper could run. Native execution
is NOT_RUN for this attempt, not a RECIPIO platform failure or PASS. A fresh
final-source workflow retries the non-destructive hosted setup. No local
emulator, phone, private data, real AI or signing operation was attempted.

## Final-source retry and Solid fixture correction — 2026-10-27

Atf84d3e9 run40347864982: actual Windows217 targeted /212 files1381 full
PASS, type/lint/build/isolation PASS (5 existing lint warnings), JVM189 PASS
and fresh API36 native23 PASS. The browser environment stalled at the public
Ubuntu Noto font download and was cancelled, not recorded as product PASS.
Only that browser job was retried against the same source in attempt2.

Attempt2 ran all10 business flows plus all Warm320/390/412 CSS100/200 detail
and kitchen checks PASS, establishing the48px fix GREEN. It then exposed a
QA preparation error: the selector only set an already-presentdata-v2-solid,
but actual production root defaults omit it. No production defect or failed
layout assertion is hidden. The probe now sets the existing fallback attribute
on real root/cooking/Portal scopes (as G5), verifies computed opaque material
and no blur, and rechecks kitchen/main geometry and zero writes. Original33
check groups and48px/overflow/CTA assertions remain intact. Product code,
Native tests and workflow are unchanged by this last probe repair.

Fresh normal push validates all final-source gates again. No local browser,
Gradle, device or real AI invocation; current free RAM3.48GiB remains below4.

## Final fixed-source result — 2026-10-27

d8f2e3afcaffce886d4a08caec7ce99a97a4531d / run40440306979 attempt1:
all4 jobs PASS.217 targeted included in212 files/1381 JS/TS;189 JVM;
23 actual fresh owned API36 tests,0 skips. Typecheck/lint(0 errors/5 existing
warnings)/build/isolation/sync/Android Debug+AndroidTest PASS. Browser33 groups,
39 geometry,9 computed materials,12 real PNGs; external/page/console0.
7 representative actual PNGs inspected and archived with concise receipts.

Root/internal source review has no remaining confirmed issue after decimal
and48px repairs; it is not ChatGPT independent acceptance. Final documentation
and screenshots only follow the fixed-source CI; no code/test/workflow drift.
G4 pending, R1 deferred, G5 acceptance inherited. Existing v23/v25, personal
data, other worktrees/processes/devices and main remain untouched. No local
heavy execution, real AI, formal/user APK, PR/tag/merge/release or G7.
Stop after ordinary G6 documentation push/clean remote equality confirmation:
RECIPIO_G6_READY_FOR_REVIEW. Exact NOT_RUN and next independent review are in
G6_REVIEW.md; do not infer phone, OS-font/TalkBack or signed-upgrade acceptance.
