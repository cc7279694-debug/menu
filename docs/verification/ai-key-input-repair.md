# APK-4 native key input repair — 2026-10-05

Historical paste-boundary repair below. The later approved workspace-key/official-endpoint correction supersedes its character/single-Beijing assumptions; current evidence is [Qianwen compatibility](ai-qianwen-key-compatibility.md). Old counts/artifact/zero-call statements are retained history, not current acceptance results.

Branch: `feat/recipio-ai-intake`; starting clean HEAD `2d0ab5b4c3ab417ad300ec47a17515f0cc800482`. Final committed HEAD is pinned by the review-packet manifest. Status: **APK_4_PENDING_DEVICE_TEST**.

## Problem and narrow correction

The phone screenshot reports the native dialog's local format rejection, before any Provider request. The user confirms lowercase sk- prefix; their actual key was not read, echoed, logged or requested. Generated keys reproduce rejection when NBSP/BOM/zero-width characters surround the ASCII key. This establishes a copy-compatibility defect class, not the actual contents or validity of the user's credential.

AiKeyInput removes only boundary Character.isWhitespace/isSpaceChar and U+FEFF/U+200B. Internal whitespace/control/format characters, masked displays, wrong prefix, quote/Bearer/lookalike characters and invalid lengths remain rejected. No internal joining or arbitrary string acceptance. It copies native Editable directly to char[] without an extra plaintext String, wipes failed arrays and invokes unchanged AiSecretEnvelope.validate. Existing Keystore/AES-GCM/AtomicFile/noBackup, input clearing, FLAG_SECURE, autofill exclusion, cancellation, mutation mutex and JS three-method status interface remain unchanged. Format errors are static reasons plus “尚未连接百炼；输入已清空，请重新粘贴”; they are not Provider unauthorized responses.

## Changed files

- Added native `AiKeyInput.java` and10 JVM regression cases.
- Modified only the value-preparation/error branch in `LocalAiSecretPlugin.java`.
- Added3 generated-only `AiKeyInputDialogInstrumentedTest` cases: Unicode boundary paste/native encrypted save/status-only reply; masked/internal rejection + cancellation preserves old ciphertext; corrected paste after rejection.
- Updated CURRENT_STATE, DECISIONS, ai-intake contract, checkpoint and verification. No dependencies/permissions/SQLite4/Preview7/Backup2/model/region changes; no AI/URL feature expansion.

## Fresh verification, final implementation

Logs: `.superpowers/sdd/2026-10-04-apk-4-ai-intake/key-input-*.log`. No real paid HTTP request; automated Provider tests remain Fake/Mock.

| Command / evidence | Actual result |
| --- | --- |
| `:app:testDebugUnitTest --tests app.recipio.local.AiKeyInputTest`, extraction of original trim/validate behavior / key-input-red.log | Behavioral RED:10 cases /7 failures. Not a compilation-only failure. |
| Same input tests + `AiSecretEnvelopeTest` / key-input-green.log | GREEN:10 new +7 encryption =17 passed. Included in final91, not added twice. |
| `npm test -- --pool=forks --maxWorkers=1 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/ai-intake/test-results-key-input.json` |174 files /875 passed,771.29s;0 failed/pending. No skipped or removed case. |
| `npm run typecheck` |PASS |
| `npm run lint` |PASS,0 errors /5 inherited legacy image warnings |
| `npm run build:local` |PASS, inherited chunk warning |
| `npm run sync:android` |PASS, fresh build and sync included |
| `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --rerun-tasks --no-daemon --console=plain --max-workers=1 '-PapkVersionCode=12' '-PapkVersionName=0.5.0-ai-intake'` |PASS,239 executed /3m8s. Actual JUnit XML11 suites/91 tests,0 failures/errors/skips; lint0 errors/35 warnings. Test APK compilation is not device execution. |
| Packaged resource + compiled manifest/signature audit |10 JS/HTML/JSON resources: no embedded credential/private-key/old cloud-URL patterns. Certificate identical to retainedv12. Only pre-existing APK4 INTERNET delta versusv11; allowBackup=false and all5 domains excluded from cloud backup/device transfer. |

The only stopped background process was a freshly identified idle recipe Gradle daemon, PID7368 with the latest completed recipe-step-app/android build in its log. No emulator or other project process/data was operated. Expensive checks used bounded workers; no system-memory settings, dependency/test workaround or database clearing.

## New immutable pending APK

- Absolute path: `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-ai-intake-v12-key-input-debug.apk`
- Bytes: **16573867**
- SHA-256: **c64fc897949e68e566d5116cadb11d26e5a437b66b0854ccd2e2e17271275679**
- Package: app.recipio.local; versionCode12 /0.5.0-ai-intake; compileSDK36; Debug-signed, not a release APK.
- Copied with no-overwrite, independent bytes/hash readback. Previousv12 APKs and Golden/test backups remain intact. No new backup export/restore was performed in this input-only task.

## Not Run and remaining gates

**Connected tests /3 new native-dialog scenarios /8 existing real IME-Back scenarios /fresh overwrite-install /physical-phone paste-save /actual Provider: Not Run.** Only another project's Mirra5554 is online. The task-owned5580 previously repeatedly produced SystemUI ANR, host resources remained constrained; it was not blindly relaunched. Prior40 connected cases with8 IME failures are historical unresolved evidence, not a fresh pass or this repair's failure count.

No actual key or private data was read. Consequently the user's individual credential, region/account permissions and qwen3.8-flash access remain unverified; no AI_PROVIDER_ACCESS_BLOCKED assertion is justified. Old auth/storage/backup device evidence is not substituted for new proof.

Next: user covers the existing installation with this Debug APK, without uninstall/clear-data; paste only inside native protected dialog. First verify local save, then explicitly select “验证模型访问”. Report only new error wording/HTTP category, never key content. A healthy dedicated device must still run full connected and non-destructive upgrade/offline/local-core/backup-start smoke before APK4 completion. Real Provider maximum4 manual calls remains frozen; no automatic paid retry or fallback.

No deployment, merge/main change, force push, reset/clean, real-cloud change, user-data deletion or APK5.
