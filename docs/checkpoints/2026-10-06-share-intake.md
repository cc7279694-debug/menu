# APK-5C-A checkpoint

## Goal / scope

Android Share text /1–6 static images → existing AI Intake prefill. URL precedence inherited from APK-5B. No automatic online action, schema change or next module.

## Current status

`APK_5CA_PENDING_DEVICE_TEST` — implementation and final automated/emulator delivery verified; physical OEM Share Sheet A–E only remains. No APK-5C-A user/physical acceptance is claimed. No production/test edits after the final repaired verification; complete89 Android tests and new-APK upgrade/offline checks passed. Mirra was safely stopped under explicit user authorization; only dedicated RECIPIO API36/emulator5580 was used and normally shut down afterward without wiping data.

## Changes

Native bounded classification, private disposable-provider reader and controlled JPEG staging; memory-only pending/leased receipts with actual-cleanup acknowledgment/retry; atomic transfer into fresh AiTemporaryImages. JS strict contract, service prefill, safe routing and private type/count banners.

## Inherited boundaries

Main remains7205a3c / v0.7.0-share-target. SQLite4 / Preview7 / Backup2 unchanged; no new permission/dependency/migration. Optional online AI still requires explicit Start and human Preview gate. APK-4 real user Provider evidence is inherited, not repeated; this module paid AI calls0.

## Verified so far

Classification/inbox compileRED then implemented; explicit prefill5 behaviorRED→GREEN; routing6RED→GREEN; cleanup warning1RED→GREEN; delayed native release2RED→GREEN. Scoped Share/AI/Backup tests7files38PASS; isolated new native JVM11PASS. Interim full native JVM and AndroidTest javac PASS; interim typecheck PASS. Independent final review PASS after delayed-release repair. These interim figures are not final whole-module totals.

## Remaining / evidence boundary

After production retirement repair: full187files998PASS/532.90s; APK63files410PASS/118.21s; Native18suites144PASS,0fail/error/skip; typecheck PASS; lint0errors/5legacy image warnings; local build14.15s/Capacitor sync PASS; explicit-app239-task native rebuild2m13s SUCCESS; Android lint0errors/37existing warnings. Targeted real-Android deadline/cancel/quarantine/cold-text4/4PASS,2m59s. Earlier pre-repair passes and failed complete/targeted runs remain historical evidence in verification/share-intake.md, not final results.

Rebuilt v15 APK17,225,119bytes, SHA256 `09bdafc383dba38a2819014195438373611cbdeec69e8d344a019098943b142e`; Debug v2 signature PASS;11packaged web assets byte-equal;222text/DEX and final logcat credential-shaped scan0. Old candidate retained separately.

Final unfiltered Android89/89PASS,14classes,0failure/error/skip/5m48s; exact unique method set matches current sources. Fresh final-v15 baseline/upgrade/offline:PASS with null failures/0AI. Actual install-r v14→v15 preserved all eight-table rows/IDs/times/order, current/history image hashes and key configured status, SQLite4/FK; flight-mode cold launch/detail/image/Guided/real Back and native Backup SAF open/cancel worked without data changes. WebView external requests/runtime errors0 and Provider/page-read attempts0; original network settings restored/read back exactly.

Physical OEM Share Sheet A–E Not Run:plain text,1image,2–3orderedimages,image+description,dirtyeditor. No device attached; prior APK-4/5B user evidence is not new5C-A evidence. Unqualified Gradle root tasks exposed an unrelated empty Cordova library AndroidTest Kotlin duplicate-class issue; explicit app full239-task rebuild and89 tests passed without dependency or configuration changes.

## Delivery / Git boundary

Feature `feat/recipio-share-intake`; main/tag remain7205a3c. New20files/modified24files/deleted0, all APK-5C-A scope; native reader/staging/lease, AI prefill/routing, tests, contract/security/plan/verification and delivery scripts. No schema/migration/Backup/Provider/Key/permission/dependency change. Final feature commit is pinned by Review Packet manifest/lineage; commit/push/remote equality and clean tree are reported from actual Git, not a self-referential checkpoint SHA.

APK:`artifacts/recipio-share-intake-v15-debug.apk` (`app.recipio.local`,15,`0.8.0-share-intake`,Debug signing). Whitelist Packet:`artifacts/share-intake/review-packet-apk-5ca-share-intake.zip`; closed-ZIP entry/size/SHA readback required. No raw source text/URI/Intent/media/database/backup/logcat/credential or APK bytes in Packet. Exact commands/counts in its curated test-results.txt; installed generated-only raw evidence stays ignored under artifacts/share-intake/final-v15.

## Next

Stop for physical Share Sheet acceptance. Keep pending receipt process-memory only and the OS-exit/actual-delete/transfer ownership invariants; do not repeat AI Smoke, replan, enter video/APK-5C-B or promote main without separate approval.

## Files in the focused feature delivery

Added20:

```text
android/app/src/androidTest/java/app/recipio/local/ShareIntakeInstrumentedTest.java
android/app/src/androidTest/java/app/recipio/local/ShareMediaInboxInstrumentedTest.java
android/app/src/main/java/app/recipio/local/ShareMediaCopy.java
android/app/src/main/java/app/recipio/local/ShareMediaFiles.java
android/app/src/main/java/app/recipio/local/ShareMediaInbox.java
android/app/src/main/java/app/recipio/local/ShareMediaReadService.java
android/app/src/test/java/app/recipio/local/ShareMediaCopyTest.java
android/app/src/test/java/app/recipio/local/ShareMediaFilesTest.java
docs/checkpoints/2026-10-06-share-intake.md
docs/share-intake-contract.md
docs/share-intake-temp-media-security.md
docs/superpowers/plans/2026-10-06-apk-5ca-share-intake.md
docs/verification/share-intake-android.md
docs/verification/share-intake.md
scripts/build-share-intake-review-packet.mjs
scripts/verify-share-intake-android.mjs
src/native/ai/shared-input.test.ts
src/native/share-target/backup-regression.test.mjs
src/native/share-target/security-regression.test.ts
src/native/share-target/share-intake.test.tsx
```

Modified24:

```text
android/app/src/androidTest/AndroidManifest.xml
android/app/src/androidTest/java/app/recipio/local/ShareTargetInstrumentedTest.java
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/app/recipio/local/AiTemporaryImages.java
android/app/src/main/java/app/recipio/local/LocalAiIntakePlugin.java
android/app/src/main/java/app/recipio/local/LocalShareTargetPlugin.java
android/app/src/main/java/app/recipio/local/ShareTargetInbox.java
android/app/src/main/java/app/recipio/local/ShareTextParser.java
android/app/src/test/java/app/recipio/local/AiTemporaryImagesTest.java
android/app/src/test/java/app/recipio/local/ShareTargetInboxTest.java
android/app/src/test/java/app/recipio/local/ShareTextParserTest.java
docs/ARCHITECTURE.md
docs/CURRENT_STATE.md
docs/DECISIONS.md
docs/ROADMAP.md
src/native/ai/native-bridge.ts
src/native/ai/service.ts
src/native/library-app.tsx
src/native/share-target/contract.ts
src/native/share-target/controller.test.ts
src/native/share-target/controller.ts
src/native/share-target/lazy-share.test.tsx
src/native/share-target/library-share.test.tsx
src/native/share-target/native-bridge.ts
```

Deleted0. Generated APK, packet, sanitized summaries and raw test artifacts remain ignored, not source commits.
