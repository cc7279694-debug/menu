# APK-5A final verification

Final production implementation on `feat/recipio-link-import`, based on `d01589e3540d80eb48592a75cf391c79c4533631`. Tests below were rerun after all production and test fixes, not copied from APK-4. Subsequent changes only freeze documentation/evidence; final HEAD and file hashes are in Packet manifest. No paid AI request.

## Actual commands and results

Run from repository root unless marked Android. Local logs under `artifacts/link-import/` are retained and excluded from Git/Packet; the packet contains a concise results ledger instead of raw private/runtime dumps.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism` | 180 files,960PASS;970.21s | `full-tests-threads-final.log` |
| `npm.cmd run test:apk -- --pool=threads --maxWorkers=1 --no-file-parallelism` | 56 files,372PASS;199.40s | `apk-tests-final.log` |
| `npm.cmd test -- src/native/link-import src/native/ai src/native/backup --pool=threads --maxWorkers=1 --no-file-parallelism` | 36 files,278PASS;145.64s | `link-ai-backup-final.log` |
| `npm.cmd run typecheck` | PASS | `typecheck-final.log` |
| `npm.cmd run lint` | 0errors,5 inherited Next image warnings | `lint-final.log` |
| `npm.cmd run build:local` | PASS;26.71s | `local-build-final.log` |
| `npm.cmd run sync:android` | fresh build18.12s, sync6.814s;PASS | `sync-final.log` |
| Android `gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --console=plain` | PASS;2m41s; JVM14 suites/114PASS/0failure/error/skip | `android-build-final.log`, JVM XML |
| Android `gradlew.bat :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=app.recipio.local.WebLinkIntakeInstrumentedTest -Pandroid.injected.device.serial=emulator-5580 -Pandroid.injected.androidTest.leaveApksInstalledAfterRun=true --console=plain` | 8PASS;2m11s | `android-link-focused-3.log` |
| Android `gradlew.bat :app:connectedDebugAndroidTest -Pandroid.injected.device.serial=emulator-5580 -Pandroid.injected.androidTest.leaveApksInstalledAfterRun=true --console=plain` | full53PASS/0failure/error/skip;5m35s | `android-connected-final.log`, connected XML |

JDK21.0.12.1+1, Android SDK compile/target36/min24, AGP8.13, Gradle8.14.3. `ANDROID_SERIAL=emulator-5580` explicitly selects the owned `Recipio_Backup_36`; no other project's emulator used. Test counts are overlapping suites and must not be added. JVM test task actually executed in the final build, not historical up-to-date counts.

## Functional coverage

- Native URL/all-address safety, DNS pin applied to actual OkHttp/socket path, mixed public/private DNS rejection, per-hop validation, forbidden redirects and downgrade, loop/redirect limit, decoded gzip/body boundary, MIME/status/timeouts/cancel, no proxy/cookies/reuse. Owned local socket mapping exists only in JVM tests.
- Schema.org object/array/@graph and type arrays, nested HowToSection, duration/yield/nutrition parsing, literal quantities vs text-only amounts, key hints, deterministic candidate selection, missing data left blank and no remote media.
- Whole visible block / Unicode cap, explicitly reported truncation, recipe-priority text, hidden/script/style removal and bounded source-free AI wrapper. Hostile prose is untrusted input, not executable HTML.
- Parser0AI and explicit AI fallback, mandatory inferred/missing review gate, candidate/same-name confirmation, cancel/late-result guards, save UUID/readback, edit preservation through uncertain save and restore invalidation.
- Existing AI, recipe CRUD/search/cooking/history/images and Backup2/v1 regressions run against the same implementation. Source-free persisted recipe and backup assertions included.
- Actual installed WebView, IME, Capacitor and SQLite integration: see Android evidence. Real public TCP/TLS success is not inferred from fixture interception.

## Review fixes and safety

Read-only module review identified three lifecycle gaps: parser edits lost after uncertain save remount, owned AI release skipped when native cancel throws, and stale post-restore AI save/readback result activation. Three regression cases were observed RED before the minimal fixes, then GREEN; fresh full suites above include them. A Codex audit is not misrepresented as an independent ChatGPT review.

`git diff --check` and bounded credential scans cover module diff, final APK text/DEX and dedicated emulator Logcat. Key store/SQLite/Backup/temp boundaries reviewed without reading user private stores. The packet uses an explicit evidence whitelist and per-entry SHA-256/readback, not whole-workspace archiving. See security evidence for limits.

## Warnings / not run

- JS lint5 inherited image warnings, Android lint0errors/37warnings (35 existing +2 dependency-version hints), existing main chunk545.59kB warning. New parser service130.26kB is lazy-loaded. No broad dependency upgrade or unrelated image refactor.
- Live public pages: two minimal safe attempts failed closed because current VPN resolves public domains to198.18 reserved addresses; `dns_blocked` explicitly observed. No private page or protected content used. Approved §49 allows fixture regression as completion evidence when public sites are unstable.
- New real Qwen requests:0; no additional model preflight required. Real webpage→Qwen smoke NOT RUN. APK-4 user's earlier acceptance is retained under its own checkpoint, not attributed to this run.
- Physical OEM device testing NOT RUN; dedicated emulator verification completed. No Play Store/release signing/deploy/main modification.
- Initial focused Android failures and an intentionally terminated early Vitest attempt are retained as local diagnostic history; only the final green runs above establish completion. No failed test was deleted or hidden to obtain green.
