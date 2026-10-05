# APK-4 final Android Back / IME acceptance — 2026-10-05

Status: **APK_4_COMPLETE** under the latest approved closeout scope. Started clean `dd02fbcf79d7050baec35d1f0f367daf3fe82047` on `feat/recipio-ai-intake`; production remains `ad54de3dca3819d555ecee0dae4605cff3dba05e`. This document records fresh evidence, not another product plan or a Provider retest. Final record commit is pinned by the review packet.

## Scope and actual change

Only `AiImeBackInstrumentedTest.java` and acceptance documentation changed. MainActivity, Capacitor Back wiring, Provider/Key/parsing production code, SQLite v4 / Preview v7 / Backup v2, dependencies and permissions remain byte-for-byte unchanged in Git. Real AI requests this round: **0**. Single SOL implementation/self-review; no APK-5, deploy, merge, private phone-data inspection or operation on Mirra.

The existing dispatcher is retained: Android IME consumes the first system Back while visible; when closed, MainActivity forwards cancelable `recipio:back` into the current page. Test-only changes ensure a real focused editor and a published/nonempty generated MediaStore fixture, match DocumentsUI's full generated UUID filename plus metadata delimiter, tap its observed native bounds, and wait for the observed React checkbox state. Bounded condition polling is in the harness, not an arbitrary production delay/debounce or a second page IME state machine. No assertion was skipped or weakened.

Test source SHA-256 at execution: `eaa35f8fd471322ee297565bdbd4d8fe254322fcb09cb400d3de72d62d529288`. Tests were run on this final source; subsequent commit records the identical source and documentation only.

## Native eight-case matrix

API 36 / Android 16, `Recipio_Backup_36` / `emulator-5580`, actual WebView / WindowInsets IME / injected `KEYCODE_BACK`. Native SAF selects generated content; isolated test KeyStore and Fake HTTP replace only credentials/Provider, not IME, Picker or Back. All eight are included in the **45**, not added again.

| Actual test | Final outcome / observed assertion |
| --- | --- |
| keyboardOpen_firstBack_onlyHidesIme | PASS: IME hidden, zero page Back events, Intake stays and no discard dialog |
| keyboardClosed_secondBack_leavesIntake | PASS: next Back reaches page navigation / explicit abandonment flow |
| intakeDraft_survivesImeBack | PASS: generated Chinese/Emoji text unchanged; no request |
| selectedTempImages_surviveImeBack | PASS: native-selected temporary image URI remains; no discard or request |
| previewEdits_surviveImeBack | PASS: edited title retained; no page Back or abandonment |
| previewConfirmationGate_survivesImeBack | PASS: unconfirmed save remains blocked; later explicit checkbox state survives IME Back |
| repeatedBack_doesNotDoubleNavigate | PASS: one dialog after repeated Back; continuation retains draft |
| backDuringBusy_doesNotStartDuplicateAiRequest | PASS: Fake HTTP held in flight; repeated Back/continue still exactly one request |

Final XML: `android/app/build/outputs/androidTest-results/connected/debug/TEST-Recipio_Backup_36(AVD) - 16-_app-.xml`, timestamp `2026-10-05T09:05:15` UTC, **45 tests / 0 failures / 0 errors / 0 skipped**. Includes the Android context sanity test; not claimed as 45 separate product features.

## Fresh reproducible regression

Logs below are retained under `.superpowers/sdd/2026-10-04-apk-4-ai-intake/`. `JAVA_HOME` used the owned JDK 21, `ANDROID_HOME` the installed SDK, both `ANDROID_SERIAL` and injected serial explicitly `emulator-5580`. No network/paid Provider fixture was used.

| Command / log | Actual fresh result |
| --- | --- |
| `npm.cmd run test:apk -- --pool=forks --maxWorkers=1 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/ai-intake/test-results-back-final.json` / `android-back-final-native-suite.log` | 50 files / **290 PASS**, no failed/pending, 162.80s |
| `./gradlew.bat :app:testDebugUnitTest --rerun --console=plain --max-workers=1 --no-daemon '-Dorg.gradle.jvmargs=-Xmx512m' '-PapkVersionCode=12' '-PapkVersionName=0.5.0-ai-intake'` / `android-back-final-jvm.log` (android cwd) | **11 suites / 95 PASS**, 0 failure/error/skip; 49s; Test task forced, dependencies cached |
| `./gradlew.bat :app:connectedDebugAndroidTest --console=plain --max-workers=1 --no-daemon '-Dorg.gradle.jvmargs=-Xmx512m' '-PapkVersionCode=12' '-PapkVersionName=0.5.0-ai-intake' '-Pandroid.injected.device.serial=emulator-5580' '-Pandroid.injected.androidTest.leaveApksInstalledAfterRun=true'` / `android-back-final-connected-r2.log` | **45 / 45 PASS**, 2m14s; 142 tasks, 1 executed/141 up-to-date, native test APK built/installed/executed |
| `npm.cmd run typecheck` / `android-back-final-typecheck.log` | PASS |
| `npm.cmd run lint` / `android-back-final-lint.log` | 0 errors / 5 inherited legacy-image warnings |
| `npm.cmd run build:local` / `android-back-final-build.log` | PASS, 12.45s; existing chunk warning |
| `npm.cmd run sync:android` / `android-back-final-sync.log` | PASS; fresh build 1.18s / sync 0.954s; all six new dist files equal packaged files |
| `node scripts/verify-ai-intake-android.mjs <absolute adb> emulator-5580 offline <absolute final APK>` / `android-back-final-offline.log` | Two PASS checks: airplane-mode local CRUD/search/explicit cooking/history/cold restarts; missing-key AI fallback does not block core |
| Same script, `reinstall` mode / `android-back-final-reinstall.log` | Same immutable v12 `install -r` preserves generated entities/IDs/times/order/media SHA/restore metadata; credential was unconfigured |

Frozen production's earlier whole-suite **174 files / 878**, Gradle239 rerun/5m4s and Android lint0errors/35warnings remain historical evidence, **Not Run this round**. The latest user instruction explicitly permits relevant final regression without full rerun when production is unchanged. Do not add the native subset to 878, or convert old figures into fresh results. No production delta triggers the full-rerun condition.

## Failed attempts / environment, kept as evidence

The owned AVD initially displayed a SystemUI startup ANR; the observed system Wait control was selected, no private data was changed. The first isolated keyboard case then passed. A later complete run had **45 / 44 passed / 1 generated SAF fixture failed**, retained as `android-back-final-connected.log`; it is not the final result. DocumentsUI compound label and MediaStore publication were corrected in the test fixture. A native tap at the observed tile bounds and actual focus/checkbox conditions made the fixture pass; this is not proof of a production Back defect or grounds for changing MainActivity.

The failed connected runner's default UTP cleanup uninstalled the generated-only app on this dedicated AVD. The same immutable v12 was reinstalled; final run explicitly retained installed APKs and verified package presence. No user phone, real SQLite, `adb clear`, AVD wipe or destructive upgrade was used. Only generated test roots/fixtures were cleared by tests. The task-owned AVD was closed after the offline/reinstall checks with data retained. `Mirra_API_37` / `emulator-5554` was never controlled or stopped.

## User real-phone Provider evidence — separately attributed

Unchanged source: [user acceptance checkpoint](../checkpoints/2026-10-05-ai-intake-user-acceptance.md), committed in `dd02fbc`. API Key input, qwen3.8-flash account access, Text Intake, Screenshot Intake, Preview editing and ordinary Recipe save: **PASS, user-reported**. No new Provider Smoke, no Key reuse, no invented HTTP/request count/phone fingerprint. Agent automated real requests remain zero; prior authorized desktop fixed-text diagnostic count1 is historical and separately recorded in provider evidence.

## Security / artifact freeze

- Tracked source and final diff, 12 APK text entries / 10 DEX, retained generated Backup v2, and final packet use the expanded dotted-workspace-key/private-key secret scan. No matching real credential. Generated backup remains 5 entries / schema4 / Format2, not newly exported/restored.
- Native secret storage stays Keystore AES-GCM + AtomicFile/noBackup; JS has no plaintext getter/setter. No credential in SQLite/IndexedDB/localStorage/Backup; generated native tests exercise dialog/encrypted boundary/Fake HTTP and no logging of supplied secrets. Capacitor bridge logging remains disabled. No scan of private phone DB/Logcat and no claim of root/hostile-OS immunity.
- AI source screenshots remain owned private cache, not Recipe Cover/Step Image or media-reference/Backup member; source/schema and relevant native/application tests pass. Raw input/response/prompt excluded from formal Recipe and packet.
- Compiled manifest keeps allowBackup=false; all five domains excluded for cloud and device transfer. Existing INTERNET/biometric permissions unchanged; no newly added sensitive permission.
- APK: `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-ai-intake-v12-qianwen-key-debug.apk`; **16573907 bytes**, SHA-256 **3a185094ca316c446d0f2c4c1d6328d07142330bca0d028442e6b4b756eb4214**; `app.recipio.local`, code12, `0.5.0-ai-intake`, Debug certificate. Same production binary tested and frozen; no production rebuild needed.
- Final ten-entry packet pins clean committed final record HEAD and each entry's size/SHA; old pending packet is archived, not overwritten. Only feature branch is pushed; no main merge/deploy/APK-5.

## Explicit Not Run / stop

No new physical OEM Back/IME eight-case run, v11→v12 retention run, paid 2–3-image semantic/order Smoke, Key rotation confirmation or private-device runtime audit. User daily AI feedback does not imply these. Same-v12 generated reinstall is not cross-version upgrade. These limits are disclosed, not quietly substituted for this round's approved eight-case and relevant-regression gates.

Stop at APK-4 delivery for user acceptance. Do not restart paid testing or start APK-5.
