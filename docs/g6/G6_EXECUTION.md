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

- [ ] A: literal pure-function tests → observed RED → safe arithmetic.
- [ ] B/C: real LibraryApp lifecycle/zero-write tests → observed RED → UI.
- [ ] D: scoped three-theme layout/accessibility + history preview wording.
- [ ] E: current-source full JS/TS/type/lint/build/isolation, JVM/Android build,
  real API36 numeric IME/Back, actual browser screenshots and zero-network.
- [ ] Fresh internal review; final report/current state/roadmap; ordinary push.

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
