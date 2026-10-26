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
