# APK-5B checkpoint — Android Share entry

Approved 2026-10-05; final verification2026-10-06. APK_5B_PENDING_DEVICE_TEST: implementation, full regression, native Android and installed emulator gates PASS; only physical OEM Share Sheet Not Run. This is not user acceptance or permission to enter APK-5C.

## Baseline and scope

APK-5A accepted commit `f7c5d8de8cf2dde94cc61f2d7ca9f896e73417af` promoted by authorized ordinary fast-forward. `main`, `origin/main`, annotated `v0.6.0-link-import` agree. APK-5B remains `feat/recipio-share-target`; no force, main merge, deployment or real AI.

Only Android ACTION_SEND/exact text/plain/EXTRA_TEXT → unique HTTP(S) URL → existing LinkImportService input. Read, Parser, AI and Save require user actions. New share never overwrites protected edits, active URLs, requests, backup/restore or cooking views. Deferred pending shows hostname, supports explicit Open/Ignore and visible latest-item replacement.

## Implementation inherited by the next stage

- Native ShareTextParser reuses WebUrlSafety.parse, checks 32KiB UTF-8 and exact dedupe without network. Process-memory one-shot inbox, narrow DTO and empty shareAvailable event. No attachment/HTML/URI reading or source persistence.
- Capacitor already dispatches the cold launch Intent. Preserve ACTION_SEND identity, remove consumed EXTRA_TEXT and ClipData; recreation cannot replay it. Do not introduce a second cold capture or persisted marker.
- Destroyed-plugin consumption and intent handling share the destruction monitor; an old queued Bridge call cannot steal the next cold receipt. Deterministic real native RED→GREEN verifies the fix.
- Root routing rechecks ownership/current route after lazy loading. Listener retry really reattaches. Parent observes the existing LinkImportService snapshot so clearing an occupied URL enables explicit pending Open. No second importer or keyboard state machine.
- SQLite4, Preview7, Backup2, native permissions, dependencies and APK-4/5A Back/IME production routing unchanged. Main library, images, cooking/history and backup stay local.

## Review and current verification

Read-only Codex review, not independent ChatGPT review. Listener retry, lazy-unmount ownership, portal-close and cleared-URL eligibility issues reproduced then fixed; removing owner guards produces RED. Review also identified old-Bridge consumption and helper network restoration holes, fixed and rechecked. Final exact-image helper assertions prevent the header icon satisfying cover checks. No unresolved production Critical/Important issue. Reviewer did not operate devices or run tests.

Final verification in `../verification/share-target.md` and `../verification/share-target-android.md`:183files/982PASS; app59files/394PASS; related39files/300PASS (overlapping subsets); Native16suites/125PASS; connected64PASS; typecheck/lint/local build/sync/JVM/Android lint/assemblies PASS. JS lint0errors/5 inherited warnings, Android lint0errors/36warnings, existing bundle warning unchanged. Final source/automated test code was unchanged after those runs; helper adaptations and installed workflow/full lint subsequently reran. No real AI. Older failed/interrupted/pre-patch green logs are diagnostic only.

Actual v13→v14 preserves all eight tables/IDs/times/order/image SHA/Key configured status; SQLite4/FK valid; cold/warm sharing no auto writes/calls;320px/touch layout; exact generated cover decoding, airplane-mode cold launch/detail/Guided/Back and Backup SAF open/cancel PASS. Network settings restored and read back exactly. All destructive-capable fixtures use generated-only owned emulator data; no real user data clearing or restore.

Delivery APK: `E:/CODEX/VIBE CODING/recipe-step-app/artifacts/recipio-share-target-v14-delivery-debug.apk`,17206915bytes, SHA-256 `ea79ef10e1287fe056a5f1f4bbe90029a852dfa901c10bca24d6d5be1e7e313f`, package `app.recipio.local`, versionCode14/versionName `0.7.0-share-target`, v2 Debug signature verified. Matches tested build and13 web assets;222 text/DEX credential scan0. v13/old candidates/Packet remain unchanged. Review Packet whitelist10files with manifest/hash readback; commit/remote SHA fixed by manifest/final receipt, not a self-referencing document.

## Modified files and data layer

- New Native: LocalShareTargetPlugin.java, ShareTargetInbox.java, ShareTextParser.java; parser/inbox JVM tests, ShareTargetInstrumentedTest.java and test-only AndroidImeProbe.java.
- Modified Native: narrow Manifest SEND filter and MainActivity plugin registration; AiImeBackInstrumentedTest, AiKeyInputDialogInstrumentedTest and WebLinkIntakeInstrumentedTest wait for real readiness/settled IME, with original assertions retained.
- New JS: `src/native/share-target/` contract/controller/native bridge and controller/library/lazy tests. Modified LibraryApp safe route integration plus legacy initialization/Link fixture corrections.
- New scripts: verify-share-target-android.mjs and build-share-target-review-packet.mjs. New approved plan, contract, checkpoint and two verification documents; README/ARCHITECTURE/CURRENT_STATE/DECISIONS/PRODUCT_SPEC/ROADMAP updated. Deleted files: none.
- SQLite4, Preview7, Backup2, repositories/media reference model, migrations, provider/key/parsing paths, dependencies and permissions: unchanged. New process-only receipts never enter DB/files/backup. Existing core remains offline.
- Git: feature-only Conventional Commit + ordinary push workflow; main remains f7c5d8de, annotated v0.6.0 tag retained. Final local/remote HEAD and clean status must be read back at handoff; no force/main merge/deploy/5C.

## Limits and stopping point

Pending may be lost on process death; newest-only replacement is visible. Share is not screenshot/video/social-platform intake; browser has no native Share Sheet. Physical OEM phone is the only remaining device item and is not inferred from emulator results. Next: user covers current app with independent v14 (never clear data), shares a browser URL, checks prefill/manual Read and dirty-draft protection. Stop here; no APK-5C planning or implementation.
