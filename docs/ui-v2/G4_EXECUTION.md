# G4 execution ledger — 2026-10-24

Approved plan: user's “G3 冻结登记 + G4 最终综合验收” sections0–15.
Spec authority: `RECIPIO_UI_V2_SPEC.md`24–27 and V01–P01 matrix.
This is an execution/evidence ledger, not new product planning.

## Task contract / sequence

- Goal: register accepted G3; collect fresh G4-A engineering/data, G4-B Android,
  G4-C visual/accessibility/performance, G4-D final evidence and ordinary push.
- Scope: existing feature branch/worktree, test/evidence tools, reports; minimal
  TDD UI repair only if a reproducible product defect appears.
- Frozen: G32080f86/sourcee182a72, main649804a, SQLite4/Preview7/Backup2,
  services/Provider/key/SSRF/Native/media/restore, Logo and3themes.
- Out of scope: new feature/design, paid AI, phone ADB, other projects, main/tag/
  deploy/video, dependency or SDK installations, personal-data replacement.
- Accept: evidence matches V01–P01; required device/IME/TalkBack/performance
  missing =>PENDING_DEVICE_TEST, never compiler/browser=>device PASS.
- Verification: one final full JS/TS run includes Native subset (not twice-counted),
  type/lint/build/isolation/sync/JVM/lint/debug/testAPK, browser and owned-device
  checks where safe, exact unchanged candidate metadata, final Git equality.

## Pre-flight / rulings

- Clean entry2080f86, fetched feature matches, main649804a, ancestry verified.
  Existing linked worktree reused. Frozen v23 SHA matches522a943f…f58.
- Initial memory3.753GiB<4GiB; no emulator process; unreadable ADB PID14196
  left alone. No Android/device operation. One bounded gate after host checks;
  no automatic queue or other-process shutdown.
- Ruling: no extra baseline full-suite run or dependency install; this is existing
  validated workspace and the user asks for one fresh final G4 regression.
- Ruling: reuse committed existing QA harnesses with controlled Fake ports;
  Browser plugin absent, installed Playwright available, no new browser install.
  Device performance/TalkBack cannot be inferred from browser/fake evidence.
- Pre-flight interfaces: engineering rebuilt web assets must byte-match the
  accepted v23 before reuse; browser fixtures stay outside production graph;
  Android data preservation governs any device installation/testing.

## Progress

- G3 acceptance registered from user's formal decision; six checks not individually
  invented. No G3 historic failure/NOT_RUN overwritten.
- G4-A first host attempt started with one Vitest worker plus type/lint/build and
  browser. Typecheck and ESLint completed (0errors/8warnings:5inherited plus3
  generated temporary replay imports), but memory
  fell to0.257GiB at18:54:05. Only this task's Vitest6252, own Vite30624 and own
  browser runner24616 were stopped; unrelated processes/ADB untouched. The build
  chain was cancelled before completion. Full suite aborted, not PASS; browser
  goto timeouts occurred before product assertions, classified RESOURCE_ENVIRONMENT.
  Original logs retained. No Android operation. After own work closed,2.075GiB
  free; continue host checks serially only, no emulator below4GiB.
- Native readonly audit:105instrumentation methods/16classes are static inventory,
  not executions. Old verify-backup/cooking/AI scripts have destructive reset paths
  and old version assumptions; do not run them on preserved data. Historical UTP
  default cleanup can uninstall app, so any future device run must preserve APKs.
- Static test fixture drift: ShareTarget launch waits for a removed Home slogan
  (now only Settings footer). A minimal common-root test-selector repair was
  drafted, but its compile/runtime proof could not finish. It was reverted with
  apply_patch to the frozen source before delivery; preserve the finding as
  readiness risk, not an executed Android FAIL. Cold share can bypass Home, so a
  future repair must not blindly wait for a Home-only action. All tests unchanged.
- Browser static concern: Warm Ivory caption/muted computed color pair may be
  below4.5:1; actual affected DOM/context not yet verified. Do not call it a product
  failure or silently alter approved tokens. Resume observation when safe.
- Serial Gradle test/lint/debug/testAPK attempt used512MiB/1worker/no-daemon;
  memory still fell to0.413GiB. Cancelled only this task's build at19:00 before
  any test summary; native Javac partial progress is not a JVM/lint/APK PASS.
  Single-use owned daemon26900 exited; other Java17 project daemons untouched.
- Final gate19:01:21+08:00:1.587GiB<4GiB,0emulators,unownedADB14196 untouched.
  No Android runtime/phone operation. No queue or repeated attempts scheduled.
- New QA runner draft (syntax check only, no successful suite) was moved, not
  deleted, to ignored `output/playwright/ui-v2/g4/deferred/verify-ui-v2-g4.mjs`.
  Original failed attempt logs remain. No new unverified QA/production source
  is committed. `src/`, `android/`, package/lock and Vite Native config match
  e182a72; all G4 non-document tracked changes versus2080f86 are absent. The G3
  QA scripts added in2080f86 remain; the whole repository is not an e182a72 tree.
- Frozen v23 freshly verified by aapt/apksigner/SHA:23/0.10.0-ui-v2-g3-rc2,
  packageapp.recipio.local,17255912bytes,522a943f…f58,same certificate29ded26b…b9.
 17publicfile entries (including2generatedCordova);0namedfixture/showcase entries.
  No new build/isolation/15asset byte-match result is claimed for G4.
- Stop **UI_V2_G4_PENDING_DEVICE_TEST** / design verdict **Blocked by evidence**.
  G4-A host regression/build also remains incomplete due resource pressure, not
  merely connected. G3 accepted history remains accepted; no G4 acceptance claim.
- Final fresh-context evidence review found one scope ambiguity: e182a72 equality
  applies to protected app/test/config paths, not G3 QA scripts added in2080f86.
  Corrected all receipts and rechecked no G4 non-document delta versus2080f86.
  Review is local source/evidence review, not ChatGPT acceptance or new runtime.
