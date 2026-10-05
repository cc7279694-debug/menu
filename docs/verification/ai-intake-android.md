# APK-4 AI Intake verification

Approved plan `c8606e3`; inherited APK-3 `78f1877664db0b0015c132e970a4cfffe7ff03fc`. Work ran 2026-10-04–05 Asia/Shanghai on `feat/recipio-ai-intake`. Historical production repair: `1382974`; this closeout adds the fixed-text preflight and eight-case native harness from `1c3da828`. Packet manifest pins the final committed implementation.

Status: **APK_4_PENDING_DEVICE_TEST**. Implementation is not equivalent to real Provider or physical-phone acceptance. Real paid AI POSTs: **0**. No actual user key was read, stored in JS, or requested in chat.

## Latest final closeout — 2026-10-05 (supersedes the deferred handoff below)

User resumed the four final gates from clean HEAD1c3da828. Only fixed text preflight and native acceptance tests changed; MainActivity, SQLite4, Preview7, Backup2, permissions and Tasks1–9 remain frozen.

| Fresh command / closeout log | Actual outcome |
| --- | --- |
| Whole Vitest forks1; `test-results-closeout.json` / `closeout-whole.log` | 174 files / 875 passed, 0 failed/pending, 810.85s. Native50 files/287 included, not added. |
| `npm run typecheck` / `closeout-typecheck.log` | PASS |
| `npm run lint` / `closeout-lint.log` | PASS, 0 errors / 5 inherited warnings |
| `npm run build:local` and `npm run sync:android` / closeout-build/sync logs | PASS, inherited chunk warning |
| App Java tests + lint + assembleDebug + assembleDebugAndroidTest, `--rerun-tasks --max-workers=1`, quoted v12 properties / `closeout-gradle.log` | PASS, 239 executed / 3m58s; actual XML81 tests / 0 failed/error/skipped; lint0 errors/35 warnings |
| `:app:connectedDebugAndroidTest`, ANDROID_SERIAL and injected serial both5580 / `closeout-connected.log` | **FAIL: actual XML40 tests / 8 failed / 0 errors/skipped; 32 passed**, 4m9s. Not a completion gate. |
| Packaged resources / aapt compiled manifest versus originalv11 | 10 JS/HTML/JSON entries: no embedded credential patterns or old cloud runtime address. Only INTERNET added; allowBackup=false and both five-domain exclusions preserved. |

Preflight regression first failed3 of17 Mock tests, then passed17/17. Native bridge fixed-text Mock test also passed in the final connected32; no real paid calls. It sends fixed text only, validates original JSON tokens including duplicate rejection and never generates a recipe.

All eight `AiImeBackInstrumentedTest` cases remain non-green: firstBack, secondBack, draft, selected images, Preview edits, confirmation gate, repeatedBack, busy request. The harness uses real WebView/window insets, actual pointer/KEYCODE_BACK and actual SAF plus isolated generated KeyStore credentials/Fake HTTP (no JS fake Provider). Initial DOM-focus diagnosis failed before opening IME; real touch replaced it. One test-fixture cache namespace mismatch was corrected without relaxing the JS port.

Both generated-only Android captures show **System UI isn't responding**; timeouts/wrong-target-window/UI-condition failures persist after restoring the AVD's configured2GB RAM. Capture paths and complete failure logs are retained locally, not packaged. These observations do not establish a production Back defect; no guessed timer/debounce/global Back suppression or page IME state machine was added. Dedicated AVD5580 was closed with data retained; Mirra5554 was never operated. The user was asked to pause the other emulator or connect a phone; no physical device/real Key became available.

New final pending APK: `artifacts/recipio-ai-intake-v12-final-r2-debug.apk`, **16573867 bytes**, SHA256 **804de950006d5b2f61880b77a71eed36d8e4c00fcf3eab7c969e5e3c08389906**; package app.recipio.local / v12 / 0.5.0-ai-intake. Current connected target is this final build; its 8 failures are not hidden. Old APK/ZIP/Golden retained. Generated backup3350bytes / 7ff043ccf1c28ffb0e5575bce8b20d51d19a10bdc54f51511916ca0d354327a8 rehashed, not newly exported.

True-account text/screenshot/multiple-image and real-response save gate, final upgrade/reinstall and physical-phone/offline/export smoke are **Not Run**. See [provider evidence](ai-intake-provider-smoke.md). Missing credentials/device is not AI_PROVIDER_ACCESS_BLOCKED. No production deployment/main merge/APK5. Final packet is an explicitly pending handoff; its manifest pins the committed HEAD and all ten entry hashes.

## Historical 2026-10-05 desktop continuation / Android explicitly deferred

User chose “暂时不要做 Android 验收”. No subsequent emulator/phone/connected run or paid Provider call is authorized in this continuation. The verified task-owned 5580 was closed with its data retained; Mirra_API_37 / emulator-5554 was left untouched. The first installed WebView diagnostic timed out while host free physical memory was about 300MB; it established neither root cause nor a passing keyboard case. Production MainActivity was not changed.

An installed-window `AiImeBackInstrumentedTest` uses actual WindowInsets IME visibility and KEYCODE_BACK. Its test APK compiles; execution is **Not Run**, not RED→GREEN. Only the first case is currently written; all eight requested native scenarios still require implementation/verification on an authorized dedicated device. Earlier connected31 is historical evidence and cannot cover this newly added test.

Fresh desktop evidence from the unchanged production repair baseline 1382974 plus the final delivery tools/tests:

| Command / log suffix under `.superpowers/sdd/2026-10-04-apk-4-ai-intake/` | Actual result |
| --- | --- |
| `npm test -- --pool=forks --maxWorkers=1 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/ai-intake/test-results-delivery.json` / `delivery-whole-suite.log` | **174 files / 875 PASS**, 441.34s; no test skipped |
| `npm run test:apk -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000` / `delivery-native-suite.log` | **50 files / 287 PASS**, 47.63s; subset of875, not additional |
| `npm run typecheck` / `delivery-typecheck.log` | PASS |
| `npm run lint` / `delivery-lint-final.log` | PASS, 0 errors / 5 inherited legacy img warnings |
| `npm run build:local` / `delivery-local-build.log` | PASS; inherited chunk-size warning |
| `npm run sync:android` / `delivery-sync.log` | PASS; included a fresh Vite build, build1.38s / sync4.999s |
| `node --check` both changed packet/Android verification scripts | PASS |
| New ten-entry packet real-builder tests | Actual RED2/2 → GREEN2/2; malformed/missing evidence rejected, SHA/bytes readback and no-overwrite verified. Earlier fork handshake timeout0 tests is not RED. Included in875/287. |
| Quoted `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --rerun-tasks --console=plain --max-workers=1 '-PapkVersionCode=12' '-PapkVersionName=0.5.0-ai-intake'` / `delivery-gradle-r2.log` | PASS, **239 executed tasks / 2m38s**. Actual ten JUnit XML suites: **77 tests / 0 failed / 0 errors / 0 skipped**; Android lint0 errors/35 warnings. Test APK compilation is not connected execution. |
| Fresh APK static-resource / compiled-manifest audit | PASS, **8** packaged JS/HTML/JSON/config entries: no matching embedded secret or old Supabase/Vercel runtime URL. Only INTERNET added versus retained v11; allowBackup=false and all five-domain cloud/device-transfer exclusions preserved. Static scan is not full runtime immunity. |

The first desktop Gradle invocation failed before test/build tasks ran because PowerShell split the unquoted versionName into an invalid `.5.0-ai-intake` task. `delivery-gradle.log` retains that failure; r2 quotes the properties and reruns the identical complete app targets. No dependency/task/test workaround. The former report's JVM87 total is **superseded by actual fresh XML77**; there are no skipped unit tests. Compiler session cache `android/.kotlin/` is ignored, not deleted or committed.

### Rebuilt pending artifact / file readback

Fresh copy: `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-ai-intake-v12-final-debug.apk`, **16573867 bytes**, SHA-256 **bdf7212457e1582b03f2b78af821d3b3432998e2295580ed5892c3b3e9031784**. Package app.recipio.local / code12 / 0.5.0-ai-intake. It was copied to a new path without overwriting the original pending APK and is byte-identical, because production code/resources remain unchanged. No installation or fresh device run is claimed.

The retained generated external backup was independently rehashed in this continuation: `artifacts/ai-intake/ai-intake-generated-1791131128968.recipio`, **3350 bytes**, SHA-256 **7ff043ccf1c28ffb0e5575bce8b20d51d19a10bdc54f51511916ca0d354327a8**. Historical export/restore is not a new device restore result.

This continuation must not be labelled APK_4_COMPLETE. Current native preflight still uses the older generated image; the newest user request requires tiny nonprivate text. After keyboard acceptance, align this small contract with Fake HTTP RED→GREEN before any real request. Actual account/region/model access, semantic quality, real-response Preview/confirmed-save and physical-phone/OEM proof remain Not Run. No access error has occurred; AI_PROVIDER_ACCESS_BLOCKED would be false here.

## Final implementation / frozen boundaries

SQLite4 / Preview7 / Backup2 are unchanged; no migration, new business table or cloud dependency. Optional intake handles free text / 1–6 screenshots / combined input only. Strict JSON and deterministic normalization produce explicit/inferred/missing checks; shared editable Preview and Service enforce human confirmation before ordinary UUID-safe Recipe creation. Raw source, temporary screenshots, response, prompt and review metadata are not formal Recipe fields or backup data.

Key entry is an Android password dialog, FLAG_SECURE/autofill-off, AndroidKeystore AES-GCM + AtomicFile in noBackup. JS has only key status/configure/delete operations, no plaintext getter/setter. Native bridge alone reads key and sends fixed HTTPS requests. Redirects/custom endpoints/cookies/automatic retries are not enabled. Temporary screenshots are private cache, bounded copy/decode/compression, opaque owned handles and pins; failed discard remains actionable and retryable.

Candidate `qwen3.8-flash`, Beijing `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`. User-account/region access is **not frozen as verified**. No actual access error occurred, so AI_PROVIDER_ACCESS_BLOCKED is not asserted.

## Historical 1382974 automated / device evidence before this continuation

| Actual command / evidence | Result |
| --- | --- |
| `npm test -- --pool=forks --maxWorkers=1 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/ai-intake/test-results-final.json` | 173 files / 873 tests PASS, 696.34s; after both production review fixes |
| `npm run test:apk -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000` | 49 files / 285 PASS, 68.05s; subset of 873, not added again |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors / 5 inherited legacy img warnings |
| `npm run sync:android` (includes production Vite build) | PASS; inherited chunk-size warning |
| `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --rerun-tasks --max-workers=1 -PapkVersionCode=12 -PapkVersionName=0.5.0-ai-intake` | Historical build PASS, 239 executed tasks, 2m39s; earlier reported JVM87 is superseded by fresh actual XML77 above; lint 0 errors / 35 warnings |
| `:app:connectedDebugAndroidTest -Pandroid.injected.device.serial=emulator-5580 -PapkVersionCode=12 -PapkVersionName=0.5.0-ai-intake` | PASS, actual XML/runner 31 / 0 failed / 0 skipped, 2m3s; all existing and new app tests, Fake HTTP only |
| Packaged APK static-resource scan | PASS, 7 packaged JS/HTML/JSON/config entries; no embedded secrets or old cloud runtime URL |
| Compiled manifest / actual v11→v12 permission comparison | PASS; only new permission INTERNET; inherited biometric/fingerprint and signature receiver permission remain; allowBackup=false and existing all-domain cloud/device-transfer exclusions preserved |

Logs are retained under `.superpowers/sdd/2026-10-04-apk-4-ai-intake/`, prior whole-suite JSON under `artifacts/ai-intake/`. These repaired-production results are historical, not fresh coverage of this continuation's new tools/diagnostic test. Earlier APK-3 and intermediate pre-repair counts are not APK-4 final evidence.

## Android environment and actual UI results

Dedicated generated-data-only **Recipio_Backup_36 / emulator-5580 / API36 / x86_64**. SDK is the installed MirraAndroid SDK; JDK is RecipioAndroid JDK21. Only this AVD was controlled. Physical phone: **Not Run**. Another project's emulator-5582 was not stopped or modified.

Full connected tests ran before upgrade/UI validation. UTP removes the target; original v11 was installed, and the previously readback-verified external generated APK-3 Golden was restored through real SAF/Replace UI. Baseline validation additionally requires all portable data and media hashes to match that exact Golden, not just recipe names. No reset/wipe makes upgrade green.

- Baseline: PASS — all seven entities, IDs, timestamps, ordering, media SHA and restore facts frozen.
- Upgrade: PASS — actual original v11→final v12 install-r preserves exact baseline/schema4; INTERNET is the only new permission.
- Secrets: PASS — real native input of random invalid test credential only, encrypted file contains no plaintext; bounded system/app-log scan; replacement cancellation/restart preserved; same-v12 install-r preserves ciphertext/state. No Provider request.
- Picker3 / temporary cleanup1 / local flows1 / backup7 / offline2 checks: PASS on final APK; original v1/v2, corrupt rejection, SQLite rollback, generated-row clear/restore and key non-restoration verified. Generated external backup is `artifacts/ai-intake/ai-intake-generated-1791131128968.recipio`, 3350 bytes, SHA256 `7ff043ccf1c28ffb0e5575bce8b20d51d19a10bdc54f51511916ca0d354327a8`.
- Narrow keyboard: **NOT PASS**. Input keyboard opens, but actual IME visibility did not settle to false after first Android Back. Earlier fixed-delay assertion and an Android UiAutomation Bad-file-descriptor crash are retained, not treated as passes. Need root-cause diagnosis, not more blind retries or an app workaround. Last attempted run used real installed WebView touch and native IME-state checks. Final all-flows reinstall has not run (earlier key-configured reinstall passed).
- Prior execution stopped before final artifact evidence summary/packet/delivery commit/push. The current continuation generates pending summaries/packet only; unfinished modes must not be counted as passes. User deferral, not a successful keyboard fix, is the current stop reason.

The original pending APK hash identifies the historical v12 result JSONs. Generated credential marker stores only ciphertext SHA, never key bytes. Same-device Restore preserved it, and deleting it before restore left unconfigured as verified. Test image/source files and device captures must not enter the review packet. Fresh desktop tool lint/syntax/build checks are recorded above; these do not retroactively verify the new diagnostic on Android.

## Preserved original pending APK (historical device evidence)

`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-ai-intake-v12-debug.apk`

- Package `app.recipio.local`; versionCode12 / `0.5.0-ai-intake`; debug-signed.
- Bytes: **16573867**.
- SHA-256: **bdf7212457e1582b03f2b78af821d3b3432998e2295580ed5892c3b3e9031784**.
- Original v11 and accepted v1/v2 Golden backups are preserved, not overwritten.

## Review and non-green attempts

One fresh-context read-only SOL review pinned c8606e3..1ef2129: no Critical/Minor; two Important findings, both fixed in one pass with real RED→GREEN:

1. Numeric suffix/decimal regex could mark 5 vs source15, or 2.5 vs 12.5/2x5, explicit. Four regressions; observed RED3/13 → GREEN16/16. One exact escaped-number predicate is used for servings/total/preparation time.
2. Successful abandoned-file cleanup did not release failed-discard session capacity. Actual Android eight-owner recovery RED1 failure busy → GREEN1/1. Native cleanup retries owned pending IDs, releases only successful cleanup and retains failed ownership/warning.

Interrupted thread-pool/no-result runs and a paging-related earlier whole-suite failure are not passes. Final whole suite uses identical cases in forks1, no test deletion, dependency change or business workaround. Native subset still passes threads2. Earlier System UI ANR under low host memory was not accepted; only the verified idle task Gradle daemon/compiler were released, no other emulator touched. File-picker fixture/log harness failures were caused by bounded child-process output and binary log reading, not hidden as app successes; corrected targeted readers preserve old failed logs and use safe bounded capture. Original private/business data was not cleared.

## Not Run / continuation

- User's Beijing key entered on their Android device and latest tiny text+JSON preflight confirming actual qwen3.8-flash access; current older image implementation must first be aligned after the keyboard gate.
- Real text / single screenshot / conditional 2–3 screenshot smoke, AI semantic quality, actual Provider→Preview→confirmed-save on device.
- Physical-phone/OEM independent complete flow, genuine network-failure/cancellation with authenticated real Provider; release signing/distribution.

First wait for renewed Android acceptance permission, then prove the eight actual IME/Back cases. Align the original image preflight to latest tiny text with Fake HTTP tests before configuring the real key only through native secure dialog. Exactly one tiny text+JSON preflight; if actual access/model/region fails, record safe HTTP/error code and stop with AI_PROVIDER_ACCESS_BLOCKED, no fallback. If successful, freeze candidate for that account and allow at most text1 + single1 + conditional multi1, total ≤4 real POSTs. Automated/connected tests remain Mock/Fake. Any production change requires all final gates again. No APK-5, deploy, PR or main merge is authorized.
