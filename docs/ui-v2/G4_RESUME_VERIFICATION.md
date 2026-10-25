# G4 resume verification — 2026-10-25

**UI_V2_G4_PENDING_DEVICE_TEST**. Final host regression/build also incomplete.
Not G4 acceptance/freeze or a final APK delivery.

## Baseline and scope

Feature/worktree: feat/recipio-ui-v2-glass-minimal / recipe-step-app-ui-v2.
Clean fetched entryaee5177fa1a03239e56532fe8de4c75b3943ec7f; stable main
649804a8209413f9d682f1079a4fd19ea84cd064 unchanged. G3 registration0541107
preserves user/ChatGPT acceptance attribution, not Codex phone execution.
Accepted2080f86/sourcee182a72/v23 and earlier G2/G3-0 history unchanged.

Approved G4 brief/SPEC V01–P01 apply. No product replan, paid AI, phone/other
project operation, SDK/dependency installation, new AVD, main/tag/deploy or later
module performed. [Checkpoint](G4_CHECKPOINT.md) is the continuation point.

## Defects and source repairs

1. Actual enabled normal-copy image fallback failed4.373905:1:12px/400 recent/
   list and16px/400 AI broken image. Three CSS declarations now map to existing
   secondary. Measured Warm4.558345/Pure5.580642/Sage4.894636 pass4.5. No new
   palette, image, layout or Logo.
2. Real v24 Android Pure/Sage switch changed DOM/cache but immediate force-stop
   restarted Warm/null. Separate disk observation confirmed delayed WebView
   LevelDB writing (~914ms); after actual write, Pure survived. No startup clear
   found. This is genuine Native RED, not a browser mock or permission failure.
3. Existing Filesystem/Data now stores only3validated enums in constant
   recipio-ui-v2-theme-v1.txt. Native file write ACK confirms displayed theme;
   initial read precedes serial writes. Latest intent owns UI; latest failure
   returns to latest successful ACK. Missing can inherit legal legacy cache;
   malformed existing value→Warm. Web keeps localStorage, errors are visible,
   LibraryApp is not remounted. No delay/debounce/refresh or test disk-wait fix.
4. A checked-radio click captures an intent to return to the current theme while
   another write is pending; it uses rendered theme===id, avoiding duplicate
   unchecked submissions. A source review found old-success/new-failure mismatch;
   its regression and last-successful-ACK fix were completed before source freeze.

Scope:3CSS mappings; theme storage/hook; Settings warning/radio and LibraryApp
prop; focused tests; QA runner/fixture/helpers; ShareTarget Android **test-only**
readiness selector from obsolete Home slogan to common V2 root. Downstream Native
assertions retained. No production Java/Manifest/dependency/permission change.

SQLite4/Preview7/Backup2, KeyStore/Provider/SSRF/Finder-source/media/restore
contracts unchanged. Backup serializes strict collections/images-only references;
enum file is not Recipe media or Backup2 content. Readonly review is not runtime
proof or ChatGPT independent acceptance.

## Current frozen-source results

| Check | Actual outcome |
| --- | --- |
| Focused theme/foundation | PASS:2files/44tests,27.30s,start12:21:08; subset, not extra whole-suite count. |
| TDD | Initial12fail/11pass; checked-radio1fail; malformed6fail; ACK/read-order2fail, then44PASS. Original failures retained. |
| Full JS/TS including Native subset | ABORTED_RESOURCE:1worker, no final file/test count. Free0.457GiB at12:35:10+08. Only own run stopped; no Vitest remained. |
| Post-patch final typecheck / ESLint | NOT_RUN; earlier pre-P2 passes are not this final source's result. |
| Final local build / graph / sync | NOT_RUN after theme repair. |
| Final JVM / Android lint / debug/testAPK build | NOT_RUN after theme repair. |
| v25 signing/assets/preserving install | NOT_BUILT / NOT_RUN. Intended25/0.10.0-ui-v2-g4-rc2; path was free. |
| Native105 / realIME8 / TalkBack | NOT_RUN this turn; installed TalkBack was not enabled. |
| P01 comparison | NOT_RUN; no20% performance conclusion. |

Full command: npm.cmd test -- --pool=threads --maxWorkers=1
--no-file-parallelism --reporter=dot. No total inferred from dots, old1133 or44.
Raw output retains expected Mock-RPC errors, inherited Dexie/JSDOM diagnostics
and a legacy not-awaited assertion warning; none is a completed suite summary.
No test/failing assertion deleted. At heavy-check stop free memory stayed<1GiB;
later light-only docs/Git check recovered3.004GiB, still below the4GiB emulator
gate. No heavy check/emulator restarted, other process stopped or queue created.

## Earlier v24 results — superseded for final-source claims

These preceded the theme repair and are not finalv25 evidence:

- 203files/1133PASS,522.75s; typecheckPASS; ESLint0errors/5inherited warnings.
  Build1.52s, graph304modules/8sharedV2/0showcase/0fixtures, syncPASS.
- Combined256MiB Metaspace Gradle failed with D8 OutOfMemoryError:Metaspace while
  host~5.1GiB free. Split command-only limits fixed the tooling: JVM+lint112s/
  186tasks; package50s/141tasks.22JVM suites/188tests/0failure/error/skip;
  Android lint0errors/37warnings.
- Browser74reported groups:11production/8foundation/9dialogs/16compiled-cooking/
  19intake/11supplemental.64PNGpaths/63different image contents; supplemental
  33geometry/104focus/36contrast records. Runtime/console errors/warnings0;
  non-local HTTP(S) blocked; realAI0. Not Android/TalkBack proof.
- v24 app.recipio.local /24/0.10.0-ui-v2-g4-rc1,17,255,908bytes,
  SHA e1a5520a6973bce499c7d52a141f52b90d65229cbf3165b71d4cab147741655e.
  Signaturev2PASS, cert29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9.
  All15built-assets byte-matched APK;17publicentries include2Cordova,0namedQA leak.
  Immutable v24 is diagnostic history, not final delivery. v23 also retained.

Raw logs: ignored output/playwright/ui-v2/g4/resume-20261025/; browser
run-2026-10-25T03-38-54-506Z. The focus-guard QA synchronization issue was repaired
by waiting actual BaseUI RAF completion, without weaker focus assertions/fixed
delay. Old scratch preserved byte-identical as .mjs.txt, not deleted to hide
evidence. October24 interrupted evidence remains in [old report](G4_VERIFICATION.md).

## Real Android/data — v24 only

Prelaunch5.16GiB, existing owned Recipio_Backup_36/API36/2GiB guest. Old5580
belonged to iKuuuVPNCore, untouched. Free5582 used exact verified SDK/QEMU/AVD/
parent/port; launcher20776/QEMU11980 now exited, not reusable identity evidence.

Preserving install-r v21→v24 passed exact installed version/name/APK SHA.
Private quiescent snapshots included WAL/images: schema4/integrityok/FK0;
all8tables/28recipes/3images/ID/time/order/image hashes identical. No uninstall,
clear, downgrade or replacement restore.

First SAF NOT_RUN because SystemUI ANR blocked it. One observed Wait action
recovered DocumentsUI, no force close/data clearing. Retry controlled native
smoke passed navigation; generated UUID/two-step recipe and real SAF64×48PNG;
local ingredient search/filter/detail return; native editor discard; actual
Focus/Guided/nested ingredient Sheet/Back/on-screen controls. Browsing/exiting
created0records; explicit completion created1. Warm cold-start passed before
genuine Pure/Sage failure. Editing is not trueIME evidence.

Post-core quiescent comparison retained every original row/time/order and3image
bytes. Added only1generated recipe/ingredient/image/record and2steps. No unknown
edit/delete. Raw database/media/XML/assertion output remain private/ignored, not
Git. VM stopped12:06+08. Original appearance Warm; diagnostic left legalPure
cache, to restore after next safe runtime. No phone evidence claimed.

Open presentation observation: inspecting the actual generated-detail screenshot
after stopping showed the cover fallback, although the earlier DOM check had
reported complete64×48 decoding. Import/original-image byte preservation remain proved, but
actual cover presentation is **NOT_CONFIRMED**. Possible presentation timing or
loading failure has not been distinguished; do not count DOM decoding as Native
image rendering PASS. No image logic changed to hide it. Recheck actual presented
frames after resources recover; retain the contradictory screenshot.

## Acceptance matrix

| ID | Outcome / missing final proof |
| --- | --- |
| V01 | v24controlled browser; finalv25 visual/phone NOT_RUN. |
| V02 | v24long/title-only/no/bad-image pass; finalv25 NOT_RUN. |
| V03 | v24loading/error/disabled/focus/Review states; finalv25 NOT_RUN. |
| V04 | v24three themes/320/390/412/768/200%/solid/reduced-motion/contrast pass; finalv25 NOT_RUN. |
| B01 | v24partial Native core; source theme repair pending v25 runtime/offline remainder. |
| B02 | No real paid action/call; v24Fake browser pass; finalNative NOT_RUN. |
| B03 | v24browser Review/duplicate/uncertain cases; finalv25/Native NOT_RUN. |
| B04 | v24actual Focus/Guided0→1pass; v25 NOT_RUN. |
| B05 | RealIME8/Link/Finder keyboard chains NOT_RUN. |
| B06 | Share readiness repaired/compiledv24, runtime NOT_RUN. |
| D01 | Static frozen contracts unchanged; enum outside backup; destructive restore NOT_RUN. |
| D02 | v21→v24 preservation and original-data comparison PASS; v25 NOT_RUN. |
| A01 | v24browser48px/focus; realTalkBack main chain NOT_RUN. |
| P01 | NOT_RUN, no baseline percentage/pass asserted. |

## Readiness, not invented execution

Freshly inspected signed pre-V2 baseline:
E:/CODEX/VIBE CODING/recipe-step-app/artifacts/recipio-logo-integration-v19-debug.apk,
17,238,136bytes, SHA e0a4257ce46bddac8bed015f03ae7e81392f10388b44fee8afc0a3085f98e18d,
19/0.9.1-logo-refresh/min24/target36/x86_64/samecert. Matches October6 checkpoint.
API36 image/avdmanager exist, no AVD created. Lack of extra authorization is not
asserted as measurement blocker. ActivityTTID/CDP-ready/rAF alone cannot certify
all P01; no reliable complete comparison was executed under this host load.

TalkBack package is not bound/focus proof. Genuine input/readonly observer would
need separate calibration; no service enabled, observer compiled or gesture
calibration run. DOM/Tab/default synthetic swipes do not substitute for it.

Continue existing verification after resources recover; no replan/development
repeat. Build new25 on frozen patch, then preserving upgrade/immediate theme/
complete Native/IME/data/TalkBack/performance. Ordinary feature checkpoint/push
does not declare acceptance; no main/tag/deploy/next module.

## Compact public evidence

[Evidence index](evidence/g4/resume-20261025/README.md) includes focused PASS,
native theme RED/disk observation, ACK-race RED, aborted full log, sanitized data
preservation receipts, v24 metadata and controlled screenshots. Copies normalize
only whitespace/encoding; private original bytes remain ignored. No raw business
database, private image, picker XML, Key or Provider payload is published.
