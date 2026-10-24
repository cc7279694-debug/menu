# G4 comprehensive verification — 2026-10-24

Status: **UI_V2_G4_PENDING_DEVICE_TEST**.
Validation verdict: **Blocked by evidence**. G4-A engineering regression/build
also remains incomplete due host resource pressure; this is not a claim that
only phone approval is missing. No independently accepted/frozen G4 result.

## Baseline / registration

- Existing feature/worktree `feat/recipio-ui-v2-glass-minimal` /
  `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2`.
- Fetched entry2080f866cd0700fbd431dfdde2ffca7830b4aec7, remote equal, clean;
  frozen production/source testse182a72b2435e1a0a98ddb81e5220d84db8d8276.
- Stable main649804a8209413f9d682f1079a4fd19ea84cd064 unchanged.
- G3 registration commit **0541107**: [G3_ACCEPTANCE](G3_ACCEPTANCE.md).
  User reports ChatGPT acceptance plus preserving v23 phone install and six core
  checks PASS. Not Codex phone execution; six per-case names were not provided.
- G3 freeze is visual/interaction only, PASS WITH NOTES. Its old NOT_RUN remains.

Specification: `RECIPIO_UI_V2_SPEC.md`24–27, V01–P01; current user's G4-A/B/C/D
brief overrides older unopened gates, not frozen data/security semantics.

## Environment and safe stop

Windows host, existing JDK21.0.12.1+1/SDK36; no installation/dependency updates.
Initial free memory3.753GiB<4GiB,0emulators. No emulator started. Existing ADB
PID14196 had unreadable ownership and was left alone; no device or phone ADB used.

The first host attempt ran one Vitest worker, type/lint/build and headless QA.
At18:54:05 free memory fell to **0.257GiB**, local Vite navigation exceeded30s,
and a local GET took about2minutes. Only verified own tests/Vite/browser were
cancelled. The source of remaining host pressure was not changed or inferred
as permission to stop other projects. After own tasks stopped,2.075GiB free.

A serial1worker Gradle attempt with Xmx512MiB still saw **0.413GiB** free at
18:59:21; cancelled before test/build summaries. Own single-use daemon26900 exited.
Final gate **2026-10-24T19:01:21+08:00:1.587GiB<4GiB**,0emulators; unknownADB
untouched. No other project's daemon/emulator/task was stopped or reused. No
background queue or15minute polling. These are environment-blocked attempts,
not evidence of product failure or completed tests.

## G4-A — exact fresh execution

| Check / command | Actual outcome |
| --- | --- |
| Full JS/TS including Native subset: `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=dot` | **ABORTED_RESOURCE**; no final file/test count. Do not reuse1133or add a Native subset count. |
| `npm.cmd run typecheck` | PASS; command proceeded to next gated step. |
| `npm.cmd run lint` | PASS exit0;0errors/8warnings:5old Next images plus3unused imports in generated replay scratch tools. Not “5warnings this run”. |
| `npm.cmd run build:local` | Interrupted; no final build result. |
| `node scripts/verify-ui-v2-isolation.mjs` | NOT_RUN; gated after unfinished build. |
| `npx.cmd --no-install cap sync android` | NOT_RUN; gated after unfinished build. |
| Gradle `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --rerun-tasks --no-daemon --max-workers=1` with512MiB heap | Interrupted before summaries. Native Java compilation partial progress is not JVM/lint/debug/testAPK PASS. No fresh JVM count. |
| Frozen APK aapt/apksigner/SHA256 | PASS, exact immutablev23 below. No new candidate. |
| Package entry names |17publicfiles (15build assets+2generatedCordova),0namedshowcase/fixture entries. Fresh production graph/asset byte comparison NOT_RUN; G3 original comparison remains historical. |
| Protected-source Git comparison | PASS: `src/`, `android/`, package/lock and Vite Native config identical toe182a72; no G4 non-document tracked delta versus2080f86. G3 QA scripts from2080f86 remain, not a whole-repository tree equality claim. Stable-main Native main/schema/repositories/core contracts also equal. |

Logs remain in ignored `output/playwright/ui-v2/g4/`:
`full-tests.txt`, `typecheck.txt`, `eslint.txt`, `build-local.txt`,
`android-host-attempt1.txt`, browser `replay-dev-20261024/`.
Compact fresh receipt: [host results](evidence/g4/host-results.txt).
Small readable attempt-log copies are committed under `evidence/g4/raw/` for
review: only trailing whitespace/extra blank EOF normalization, no changed output
content. Exact original bytes remain in ignored output. No database, media, Key
or Provider payload, and no successful-test claim.

### Source / data protection

SQLite4 `src/native/recipe-store.ts:40`; Preview7
`src/features/offline/local-db.ts:15`; Backup2/schema4
`src/native/backup/format-v2.ts:28–30`. These and Native KeyStore/Provider/SSRF/
Finder source/Media/restore implementations unchanged. No database/file writes,
backup replacement, unknown record edits or private media/Key inspection.

A test-only readiness selector was drafted after static inspection, then reverted
because compile/runtime proof could not finish. Production and tests under
`src/`/`android/` plus package/lock/Vite Native config remain frozen; G3 QA tools
from2080f86 are retained. New browser QA draft was retained in ignored
`output/playwright/ui-v2/g4/deferred/verify-ui-v2-g4.mjs`, not committed as a tested
tool. No production change, version increase or repeated APK delivered.

## G4-B — Android core/IME/share/data

All this round's Android runtime/connected items **NOT_RUN**. Device gate never
passed. No browser action or successful compile is counted as Android evidence.

| Required chain | Result / missing proof |
| --- | --- |
| Local core, search/filter/page/return, editor/images/long/no-image/name-only | NOT_RUN onv23 runtime. |
| Focus/Guided; only explicit complete writes one record; history/media | NOT_RUN. |
| AI screenshots/reorder/Review gate/duplicate/originalUUID recovery | NOT_RUN with Native Fake; new real AI remains NOT_RUN and0calls. |
| Link complete/partial/multiple/direct edit/explicitAI/error/cancel | NOT_RUN. |
| Finder separate Search/Extract/selected-source handoff | NOT_RUN runtime; no true-provider or fresh boundary PASS inferred. |
| Share cold/hot URL/text/images, dirty/busy/replacement/cleanup | NOT_RUN. |
| Backup SAF export/restore-preview cancel, busy/uncertain navigation | NOT_RUN; no personal-data replacement attempted. |
| True IME first/second Back; drafts/URL/query/confirmation/Sheet/busy | NOT_RUN. Existing eight-case suite not rerun. |
| Preserving upgrade IDs/entities/history/image bytes/integrity | NOT_RUN by Codex; user's v23 preserving-install acceptance is separate, no invented database fingerprints. |
| Full connected/TalkBack | NOT_RUN; no fresh pass count. |

Before any resume, read [Native readiness/data-protection notes](G4_NATIVE_READINESS.md).
Old tools can clear data; default UTP cleanup historically uninstalled the app.
Static inventory is16instrumentation test classes/105methods including1scaffold
context test, **not105executed tests**.

## G4-C — fresh browser, accessibility, performance

Browser plugin unavailable; existing installed Playwright with fresh contexts and
generated/Fake data used. Intended origin127.0.0.1:5184,390×844, reduce-motion;
production and settings-dialog suites timed out at navigation **before first
product assertion**,0completed groups. Intake interrupted. No successful G4
screenshot generated or claimed; keep accepted G3/G2 images as historical only.
768/200%/long text/failed media/solid/focus supplemental suite was not run.

Raw failed navigation results are retained, classified **RESOURCE_ENVIRONMENT**,
not a confirmed rendering regression. [Environment receipt](evidence/g4/browser-environment-stop.json).
No real AI, remote page or private data used. No new fonts, assets or visual design.

| Remaining item | Outcome |
| --- | --- |
| All3themes at320/390/412/768,200%/long/no-image/failed-image | NOT_RUN fresh G4 matrix. |
| Glass/solid, reduced-motion, safe-area/footer/scroll end,48px | NOT_RUN; old browser matrices not relabelled. |
| Dialog focus/return and TalkBack main chain | NOT_RUN. Browser focus scan cannot replace TalkBack. |
| Same-device/same-dataset baseline vsV2 cold/interactive/scroll/Sheet | NOT_RUN; no samples/median/20%comparison exists. Browser timeouts are not a valid benchmark. |

### Risks discovered, not runtime failures

1. ShareTargetInstrumentedTest launch waits for legacy Home slogan now only in
   Settings footer. Static readiness drift, not device-reproduced FAIL. Future
   correction must wait common production root and retain per-route prefill/asserts;
   a cold share can bypass Home. Draft correction reverted; frozen tests preserved.
2. Warm Ivory caption `#716d65` over muted `#f0ece5` calculates approximately
   4.3739:1. Potential normal-text contrast issue for no-image surfaces; affected
   rendered DOM/context not observed, so **NEEDS_EVIDENCE**, not a confirmed defect
   or a silent token/palette change. Verify text size/state/actual colors first.

## V01–P01 acceptance matrix

| ID | G4 verdict | Evidence / required continuation |
| --- | --- | --- |
| V01 | NOT_RUN fresh | G1/G2/G3 approval historical; new rendered comparison absent. |
| V02 | NOT_RUN | Long/name-only/failed-image supplemental runtime absent. |
| V03 | NOT_RUN fresh | Existing component states not rerun after resource stop. |
| V04 | NOT_RUN / NEEDS_EVIDENCE | Full width/font/color matrix absent; contrast static risk above. |
| B01 | NOT_RUN | Owned Android offline/core missing; JS suite aborted. |
| B02 | NOT_RUN fresh | Explicit-network counters not reached in browser, no completed suite. RealProvider calls0. |
| B03 | NOT_RUN fresh | Review/duplicate/uncertain workflow not freshly completed. |
| B04 | NOT_RUN fresh | Cooking semantics not freshly completed. |
| B05 | NOT_RUN | Real IME absent. |
| B06 | NOT_RUN fresh | Native share/competition not executed. |
| D01 | PASS static; runtime NOT_RUN | Frozen contract/version Git comparison and APK identity; no DB runtime integrity claim. |
| D02 | User PASS; Codex NOT_RUN | User reports preservingv23upgrade; no Codex owned-device fingerprints. |
| A01 | NOT_RUN | Actual targets/focus/TalkBack matrix absent. |
| P01 | NOT_RUN | No same-device baseline sample or medians. |

## Single candidate / stop

- Path: `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2\artifacts\recipio-ui-v2-g3-v23-debug.apk`.
-17,255,912bytes; SHA256`522a943fdbc320cace07396a2344b609975c97471724603539257ed64bd96f58`.
-`app.recipio.local`,code23/name`0.10.0-ui-v2-g3-rc2`,min24/target36.
- Signature valid; certificateSHA256`29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
- Same accepted file, no overwritten/rebuilt release artifact or new version.

Only registration/evidence docs committed and ordinary feature push. Final commit,
remote equality and clean status are checked after commit to avoid self-reference.
No merge/tag/force/deploy/video/G4acceptance. Stop pending safe resources/user
continuation, then fresh G4 checks. Do not mark host test attempts or old green
counts complete. User/ChatGPT final independent G4 acceptance remains required.
