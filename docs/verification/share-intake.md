# APK-5C-A verification

Final automated/emulator verification passed on the repaired production/test implementation. Status: `APK_5CA_PENDING_DEVICE_TEST` (physical OEM Share Sheet only). All AI automation uses Fake transport; paid requests0.

## Repaired implementation — final results

- Whole repository:187files /998PASS,532.90s; APK subset:63files /410PASS,118.21s. Subsets are included in, not added to, the whole-repository total.
- Typecheck PASS; lint0errors/5existing legacy image warnings; local Vite build14.15s and Capacitor sync PASS. Delivery scripts lint PASS.
- Real Android targeted retirement/quarantine/cold-text rerun:4/4PASS,2m59s. This is not the complete89-case connected result.
- Final Native JVM:18suites /144PASS,0failure/error/skip. Explicit app JVM/lint/assembleDebug/assembleDebugAndroidTest with rerun-tasks/offline/one worker/512MiB heap and v15 properties:239tasks executed, BUILD SUCCESSFUL,2m13s. Android lint0errors/37existing warnings.
- Rebuilt v15 APK:17,225,119bytes; SHA256 `09bdafc383dba38a2819014195438373611cbdeec69e8d344a019098943b142e`; `app.recipio.local` /15 /`0.8.0-share-intake`. Debug v2 signature PASS;11built web assets byte-equal to packaged assets;222text/DEX entries credential-shaped scan0matches. The earlier APK is preserved separately, not overwritten without retaining its bytes.
- Final complete connected run:89/89PASS,14classes,0failure/error/skip;5m48s,142tasks (1executed). Exact unique class/method set matches all89current Android source tests, including the inherited Capacitor sample; no class/method/shard filter. Only explicitly selected emulator5580/Recipio_Backup_36/API36 used. XML timestamp2026-10-06T06:17:53UTC.
- Fresh final-v15 installed evidence: immutable v14 UI-generated recipe/image baseline PASS; actual install-r v14→repaired v15 PASS for every eight-table row/ID/time/order, current/history image SHA256 and key configured status, SQLite4/FK. Flight-mode force-stop cold launch, local detail/cover/Guided/real Back and native Backup SAF open/cancel PASS; no local data change. Observed WebView external requests0/runtime errors0 and explicit Provider/page-read attempts0. Original airplane1/Wi-Fi0/data0 restored/read back exactly. Evidence timestamps06:19:19/06:20:11/06:20:30UTC; all failure fields null, paid AI0. Raw baseline/image/logcat stays ignored and excluded from Packet.
- Final owned-device logcat credential-shaped scan0; modified files credential-shaped scan0; no keys in source/JS/SQLite/Backup/Packet. Existing static source/privacy and backup regressions passed within998. These checks do not claim omniscient network monitoring or a compromised-OS guarantee.
- Physical OEM Share Sheet A–E:Not Run. No physical phone attached; user APK-5B/APK-4 evidence retained separately and not relabeled as APK-5C-A acceptance. Both verified emulators were shut down without wiping; no unrelated daemons operated. Complete final commands and unrun boundary are curated in test-results.txt; final feature commit is pinned by Packet manifest/lineage. No main merge/deploy/video.

Final delivery-tool execution first exposed Windows PowerShell5.1's need for explicit `System.IO.Compression` assembly loading. The generated0-byte incomplete ZIP is preserved under a failure-specific name, not overwritten or delivered. Only the Packet builder's assembly load is repaired; app/JS/Android test sources and APK bytes remain identical to the final full verification above. Builder syntax/lint and actual closed-ZIP whitelist/size/SHA readback are validated separately after the repair; no app or Provider tests are relabeled/repeated for this tool-only change.

The first repaired Gradle invocation used unqualified root task names. App JVM144/lint/assembleDebug/assembleDebugAndroidTest completed, but the invocation subsequently failed building the generated empty `capacitor-cordova-android-plugins` library's own AndroidTest APK (Kotlin1.8.22/old jdk7/jdk8 duplicate classes),2m49s/332tasks. That library has no test source; this is not a failed RECIPIO test assertion and is not represented as a successful overall command. Final product verification uses explicit `:app:` tasks, all18JVM suites and all14classes/89Android tests without method/class filters. No dependency, library configuration or failed product test is removed/changed to bypass it; the unrelated library-test harness remains outside this module.

## RED / GREEN actually observed

- JS prepareSharedInput:5 failures missing method → existingAI/service + shared-input16PASS.
- JS Share routing:6 expected failures → new and inherited Share routing33PASS.
- Failed release warning:empty drain incorrectly cleared warning1failure →36PASS.
- Native lease/inbox:missing capability compileRED → full JVM and AndroidTest javac SUCCESS (interim52s).
- Native files/copy:behaviorRED → new11 isolated JVM PASS after final-pin release acknowledgment repair. Two premature-ack assertions genuinely failed before repair.
- Share + prefill + SQLite/Backup/privacy:7files38PASS,71.80s.
- Interim typecheck PASS. Static independent final review PASS; not a replacement for devices.

## Historical pre-retirement-repair runs — not final delivery

- Whole repository:187files /998PASS,557.18s. The initial additional APK subset was interrupted after a Vitest worker timeout. After the explicitly authorized Mirra emulator pause, fresh APK63files410PASS/191.69s and related AI/Link/Share/Backup43files316PASS/91.00s completed. Subsets are not added to whole-repository totals.
- Typecheck PASS; lint0errors/5existing legacy image warnings; local Vite build18.52s and Capacitor sync PASS.
- Final Native JVM:18suites /144PASS,0failure/error/skip. Android lint0errors/37warnings (existing icon/EXIF/SDK/dependency notices, no new production source warning).
- Fresh `testDebugUnitTest lintDebug assembleDebug assembleDebugAndroidTest --rerun-tasks --offline --max-workers=1 --no-daemon` with512MiB heap and explicit v15 properties:239tasks executed, BUILD SUCCESSFUL,7m18s. This compile/JVM result is not connected-device evidence.
- Independent v15 APK:17,225,119bytes, SHA256 `1ed77b7715455506ae773b72c349a971a2f9f655cbc3c60425d16959849fd486`; `app.recipio.local` /15 /`0.8.0-share-intake`. Debug v2 signature verification PASS.11built web assets byte-equal to packaged assets;221text/DEX APK entries credential-shaped scan0matches; modified-source scan0matches.
- New Android acceptance/Packet scripts syntax checks PASS. Packet builder fixed commit pinning: docs/diff read captured commit and HEAD/branch/clean-worktree/baseline are rechecked; independent read-only review PASS. Final scripts-only lint is recorded separately after last edits.
- Installed v14 baseline and actual v14→v15 install-r preservation PASS: all eight-table rows/IDs/times/order, current/history image SHA256, key configured status and SQLite4/FK retained. Flight-mode cold launch, local generated image/detail/Guided/real Back, native Backup SAF open/cancel and unchanged data PASS; WebView external requests0/runtime errors0, Provider/page-read attempts0. Exact prior network state restored. Physical Share Sheet remains unrun.

No data model, Backup version, provider/key request path or main content changed. Final figures and artifact SHA are recorded after actual completion.

## Environment pause — not a frozen delivery

2026-10-06 12:18 local time: physical memory available0.44GiB, virtual2.81GiB; only out-of-scope Mirra5554 running. Dedicated RECIPIO AVD not launched because reliable operating headroom was unavailable. No physical phone connected.

Additional APK fork run reported a worker-termination timeout for unchanged Link native-bridge tests. Isolated default-fork run was stopped. Single-thread diagnostic failed to start its worker:60.15s,0tests,0transform/setup/import,1unhandled timeout error. This is a runner-start failure before assertions, not PASS or proof of a business defect. Whole repository green and Native JVM/build evidence above remain actual results. No timeout/assertion was relaxed and no production change was made for this symptom. Only verified task-owned test processes were stopped, not Mirra or other project daemons. Logs are ignored local diagnostics, not Packet contents.

The pause above is historical. User subsequently explicitly authorized stopping Mirra if it remained active. Verified emulator5554/Mirra_API_37 was stopped with emulator shutdown only; its data and other daemons were retained. Dedicated emulator5580/Recipio_Backup_36/API36 booted without wipe. Delivery scripts lint PASS. No production change was made for the resource symptom.

## Android fixture RED / GREEN on resume

Initial connected run:87 executed,69PASS/18FAIL. All failures required positive generated-image staging; actual safe reason was image_unreadable. Do not report this run as PASS.

Minimal native diagnostic actually opened the generated PNG descriptor and read byte137, then failed explicit temporary-permission assertion: expected GRANTED0, actual DENIED-1. The exported public fixture was readable but Android did not register its redundant grant. The production requirement for a genuine temporary grant was correct and remains unchanged.

Only androidTest fixtures were repaired: protected test-provider read permission, provider-owned grant/revoke with fixed receiver UID/package/authority/fixture path/query, read-only descriptors and no write operations. Missing real grant with an Intent read flag remains a negative case. Backup UI waits for successful media receipt and its Open button before asserting the existing disabled gate. No failure/assertion/timeout was removed or relaxed.

The unchanged grant diagnostic then PASS on the real Android provider. The next complete88-case run executed86PASS/2FAIL: a reaped reader still appeared briefly in ActivityManager, and cancellation waited only for process spawn rather than the actual blocked READ. Neither run is represented as complete acceptance.

Test-only measurement repairs use exact same-UID/non-main reader PID plus `Os.kill(pid,0)`; only ESRCH counts as exited. Cancellation first observes this receipt's sole zero-byte source part and an unfinished callback. Existing5s readiness/5s cancellation/35s completion and cleanup/next-stage assertions stay in place. The cold direct-guardian fixture also now waits for successful Inbox.initialize before independently creating staging; otherwise asynchronous startup orphan cleanup races that fixture. The isolated guardian/cancellation2-case rerun PASS,1m32s.

An initial targeted3-case run failed before these final fixture repairs and is retained separately. Its MIME query failure was `unsupported_media`, not a lost application deadline. [Android16 ContentResolver](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android16-release/core/java/android/content/ContentResolver.java) waits about3s for getTypeAsync then returns null; [ContentProviderNative](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android16-release/core/java/android/content/ContentProviderNative.java) sends it one-way, with [same-node serialization](https://source.android.com/docs/core/architecture/ipc/binder-threading). The generated60s blocked-MIME fixture therefore also contaminated the next MIME query. Only blocked-MIME accepts either the platform's fail-closed unsupported_media or the receipt's timeout; blocked Open/Read still require timeout. A protected fixture call now releases its latch and acknowledges task exit before testing the next healthy stage. No application timeout, grant, assertion or safety guarantee was weakened.

The subsequent complete88-case run executed85PASS/3FAIL. Cold-text launch correctly reached the AI input destination before the test observed the transient home add button. Two strict OS-exit assertions still failed: Binder death was not an ESRCH completion barrier. This run is not final acceptance.

The cold Share fixture now explicitly awaits the AI input destination; ordinary launches still require home and all payload/zero-network/recreation assertions remain. Production ShareMediaInbox now confirms OS exit on its metadata worker for every handshaken PID (including pre-READ cancellation) before file mutation/callback/next stage. Only ESRCH succeeds; bounded failure quarantines active request and bytes, reports cleanup failure, and permits release retry without duplicate stage completion or starting a later writer. Added generated native fault-injection coverage for this failure/retry/queue boundary; no real process is killed by the injected main-PID failure.

**Production code changed for the retirement barrier.** The historical998/JVM144/typecheck/lint/build/signature/device checks above were not reused. New full regression, independent APK and complete installed-device evidence were actually rerun on the repaired implementation and are recorded in the final-results section. Keep30s read cutoff distinct from the bounded5s retirement confirmation budget; do not claim that OS reaping is instantaneous.
