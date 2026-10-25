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

## Resume — 2026-10-25

- User explicitly resumed G4; clean/fetched aee5177, main649804a unchanged,
  accepted23 SHA confirmed. Initial5.887GiB free,0emulators, unknownADB17152
  left alone. Heavy phases now serial; no other-process shutdown/phone/realAI.
- First inspect actual visual risk before final full suite, avoiding obsolete
  regression evidence if a fix is necessary. Initial local build108.7s, isolation
 304modules/8sharedV2/0fixtures, sync1.769s PASS, but not final repaired-source proof.
  Sync's junction-specific paths restored to existing portable node_modules paths.
- Browser real normal12px/400 no-image text in Home is contrast4.373905:1 on
  Warm Ivory (errors0/external0): confirmed V04 implementation defect, not the
  old resource timeouts. Automated contrast test RED saved in
  `browser/resume-20261025-contrast-original`. Minimal repair maps placeholder
  copy to the existing secondary Token, leaving palette/layout/services untouched.
  New candidate24 required if production repair verifies;23 remains immutable.
- Layout/remaining browser, final regression/build and owned-device checks in
  progress. Do not infer results from this ledger or initial build.
- Shared V2Image in actual AI intake also reproduced the same contrast defect at
 16px/400, so the repair covers its existing shared image-placeholder rule too.
  Three CSS declarations now use existing secondary rather than caption; no
  palette values or business semantics changed. Both actual-path RED receipts kept.
- Fresh supplemental GREEN:9groups/33geometry/104focus/34enforced ratios,
 18capture events/17unique PNG,errors0/console0/external0; actual WarmIvory4.558345, Pure5.580642,
  Sage4.894636. Three abstract diagnostic pairs are not accessibility passes.
  BaseUI's documented RAF focus guard required condition-completion in QA,
  not a fixed delay or weaker focus assertion. Original tool failures retained.
- Production CSS frozen after supplemental; fresh whole JS/NativeTS suite started
  with1thread/no file parallelism. Rebuild candidate24/version
  `0.10.0-ui-v2-g4-rc1` after final checks; no24artifact existed at preflight.
- Corrected the previously documented ShareTarget test-only obsolete Home-slogan
  readiness to the actual common V2 root; retained every downstream destination,
  prefill, request, ownership and IME assertion. Native execution proof pending;
  do not label the static fixture mismatch a product/Native runtime failure.
- Local fresh-context source/QA safety review identified no blocking issue; it
  does not replace runtime or ChatGPT independent acceptance. Existing raw replay
  scripts retained byte-identical as `.mjs.txt` so old unused-import scratch does
  not add lint noise; original logs/failed outputs unchanged.
- Final repaired-source JS regression203files/1133PASS,522.75s, start11:22:04.
  TypecheckPASS, ESLint0errors/5inheritedwarnings, build1.52s/isolation304/sync
  PASS. Initial combined Gradle JVM/lint/assemble reached JVM XML and lint report,
  then D8 failed with explicit `OutOfMemoryError: Metaspace` at256MiB cap while
  host remained~5.1GiB free. Retain `final-android-host.txt`, not an App failure.
  Ruling: split JVM+lint (768heap/512meta) from package(768heap/384meta),1worker,
  no-daemon/offline; command-only resource adjustment, no repository config change.
  Final successful results still required; earlier counts not promoted.
- Split finalv24 host runs PASS:22JVM suites/188tests/0failure/error/skip;
  lint0errors/37warnings; JVM+lint112s, debug+testAPK50s. Debug signing and15
  final-web asset SHA comparisons PASS (17APKpublicfiles,0QA path leak). v24
  `0.10.0-ui-v2-g4-rc1`,17255908bytes, SHA
  `e1a5520a6973bce499c7d52a141f52b90d65229cbf3165b71d4cab147741655e`.
- Browser finalv24 run `run-2026-10-25T03-38-54-506Z` PASS74reported groups:
  production11/foundation8/dialogs9/built-cooking16/intake19/supplemental11;
  64PNGpaths/63distinct image hashes, supplemental33geometry/104focus/36actual
  contrast checks;0runtime/console warning/error. This is browser evidence only.
- Owned prelaunch5.16GiB, no other emulator. Port5580 was owned by iKuuuVPNCore,
  left untouched; same existingRecipio_Backup_36/API36 started on free5582,
  launcher20776/QEMU11980 verified exact SDK path/AVD/port. No newSDK/AVD.
  TalkBack installed/not enabled; actual main-chain NOT_RUN, not inferred PASS.
- Preserving `install -r` v21→v24 PASS:8tables/schema4/integrityok/FK0,
  28originalrecipes/3originalimages and row/ID/time/order/image hashes identical.
  NativeSAF first attempt NOT_RUN due observed SystemUI ANR; raw private evidence
  retained. One observed system Wait action recovered DocumentsUI, no forced stop
  or data change. Retried core PASS navigation, realSAFgeneratedPNG, search/filter
  return, native editor discard, Focus/Guided0→1only explicit completion.
- TrueNative theme RED: PureGlass/SoftSage display/cache change but immediate
  force-stop loses the new value (both restartWarm/null). Separate diagnostic
  proved LevelDB wrote after914ms; only then restart preservedPure. No startup
  clearing found; original hook syncsetItem is not a native durable-write ACK.
  Do not fix the test with delay/debounce or relabel as PASS. Approved-scope repair
  uses existing Filesystem for one fixed validated theme enum, no dependency,
  Java-main/security/SQLite/Backup change. New final candidate will be25.
  v24host/browser numbers remain per-candidate history, not finalv25 results.
- Before stopping owned QEMU, quiescent snapshot and original-row/media comparator
  PASS (`protected-after-v24-core.json`): all originals retained despite the one
  generated recipe/image/explicit record. No unknown record touched; originals
  remain in ignored private safety copies. Only owned5582 stopped12:06:12+08;
  VPN/unknownADB/other projects untouched. Full105/IME8 still NOT_RUN this turn.
- Theme repair TDD: initial12fail/11pass; checked-radio-intent1fail; malformed6fail;
  ACK-success→latest-failure/cold-read-baseline2fail. Final frozen focused2files/
  44PASS,27.30s (`theme-storage-ack-fallback-green-r2.txt`); this is a subset,
  not additional whole-suite counts. Native fixed Data enum file ACK gates theme;
  initial read completion causally precedes ordered writes, latest intent owns
  UI and failedlatest falls back to lastsuccessfulACK. Missing can inherit legal
  legacy cache; malformed existing file→Warm. Visible truthful warnings; Web
  remains synchronous. Source review P2 was fixed before full regression.
  No mainJava/permissions/dependency/SQLite/Backup change. Backups still use
  strict images-only references; no enum preference in Backup2.
- v25final source now frozen; new full JS run begun12:22 on1worker, no parallel
  browser/JVM/emulator. v25target`0.10.0-ui-v2-g4-rc2`, path was unoccupied.
  Runtime data safety comparison PASS. Initial appearance wasWarm; RCA deliberately
  left legalPure in legacy cache for diagnosis. RestoreWarm after next safe runtime
  validation; do not mistake diagnostic preference for user's final choice.
- Final44focused PASS,27.30s,start12:21:08 after P2/radio/malformed/read-causality
  repairs. Fullv25 singleworker12:22→12:35 ABORTED_RESOURCE: free0.457GiB at
  12:35:10; only own24339 interrupted, then no Vitest/npm-test remained.
  Free0.838GiB then0.633GiB; no more heavy checks/VM/queue. Final total unknown,
  not old1133+subset. Post-patch type/lint/build/graph/sync/JVM/Android lint/APKs/
  Native105/IME8/TalkBack/P01 NOT_RUN; v25notbuilt. Preserve patch/checkpoint.
- Later light-only fetch/docs audit saw3.004GiB, still<4GiB emulator gate.
  No new heavy retry/AVD/queue. Source/metadata scans0longKeymatches/forbidden
  private archive paths; public evidence contains only synthetic screenshots and
  sanitized row/image counts+hashes. Actual detail screenshot showed fallback
  despite DOM decode success; image presentation explicitly NOT_CONFIRMED.
