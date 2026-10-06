# APK-5B Android verification

Status: APK_5B_PENDING_DEVICE_TEST — final native/installed emulator verification PASS; only physical OEM Share Sheet Not Run. Generated fixtures only, zero real AI calls.

## Controlled environment

Only `Recipio_Backup_36` / `emulator-5580`, Android API36, generated recipe/text/image/URLs. No physical phone attached. Do not operate Mirra `emulator-5554`, wipe devices, clear personal data, retrieve a plaintext Key or call a real Provider. Owned AVD state preserved; flight/network state must be restored after verification.

JDK21 at `C:/Users/CDD/AppData/Local/RecipioAndroid/jdk/jdk-21.0.12.1+1`; existing SDK at `C:/Users/CDD/AppData/Local/MirraAndroid/sdk`; Gradle8.14.3/build-tools36. No installs required. Debug package `app.recipio.local`, target versionCode14/versionName0.7.0-share-target.

## Final build evidence — same final production implementation

Fresh `testDebugUnitTest lintDebug assembleDebug assembleDebugAndroidTest --rerun-tasks --offline --max-workers=1` with explicit version properties:125 JVM tests/16 suites,0 failure/error/skip; lint0 errors/36 warnings;239 tasks executed,2m3s. Final `connectedDebugAndroidTest` explicitly targeted5580:64 tests,0 failure/error/skip,5m1s. XML reports and successful command exits checked. Final production and instrumented source did not change afterward; acceptance helper adaptations were rerun separately.

Final delivery: `E:/CODEX/VIBE CODING/recipe-step-app/artifacts/recipio-share-target-v14-delivery-debug.apk`,17206915 bytes, SHA-256 `ea79ef10e1287fe056a5f1f4bbe90029a852dfa901c10bca24d6d5be1e7e313f`. `app.recipio.local` / versionCode14 / `0.7.0-share-target`. Equals current tested debug build;13 synchronized Web assets match APK bytes;222 text/DEX entries scanned with0 credential matches. APK signature verifier PASS, v2 Debug, not Play Store release signing. Prior `v14-final-debug.apk` is pre-lifecycle-fix diagnostic, not this delivery; v13/v12 and earlier candidates retained without overwrite.

## Final native and installed results

ShareTargetInstrumentedTest11 scenarios PASS in the full64 suite: real cold SEND/late JS/recreation; warm onNewIntent/dedupe/query/fragment; dirty editor deferral/explicit Open; AI text retained/Provider0; unsupported MIME/VIEW/attachments/HTML ignored; multiple links; no URL; destroyed old Bridge cannot consume new receipt; explicit Read uses existing Fake HTTP Parser exactly once/AI0; actual Android chooser lists and clicks RECIPIO for text only; actual IME first Back hides keyboard, next Back navigates. Existing APK-4 eight IME/Back and APK-5A tests remain in the final suite with original assertions.

Independent actual installed workflow PASS:

- v13 generated recipe/ingredient/step/Chinese/newline/Emoji/notes/one-pixel PNG → snapshot eight tables plus all current/history image SHA and configured-Key boolean. No plaintext getter. Immutable baseline preserved.
- v13 exact generated-cover decoding confirmed separately; real `install -r` v14 → all rows/IDs/timestamps/order, image bytes and Key configuration state identical; SQLite user_version4 and FK check valid. Exact generated recipe alt/complete/naturalWidth assertions also pass in v14; header icon cannot satisfy them.
- Warm detail share prefills original URL/query/fragment; second share cannot overwrite active URL; hostname-only pending/Ignore;320px no overflow and buttons≥44px; snapshots unchanged.
- Real force-stop cold SEND → local app ready and prefilled;0 automatic Read/Parser/AI/save, snapshot unchanged.
- Airplane mode1/Wi-Fi0/data0, force-stop cold MAIN → exact local cover/detail/Guided/Back work; no implicit cooking record. Actual DocumentsUI CREATE_DOCUMENT opens; hardware Back cancels, current data unchanged. No restore or existing backup overwrite.
- WebView external requests0/uncaught runtime errors0. Original network settings1/0/0 restored and read back exactly, restorationErrors empty. Generated screenshots visually inspected; one-pixel white cover is intentionally a byte-level fixture, not a real photo.

Logs: `installed-baseline-final.log`, `exact-cover-v13-final.log`, `installed-upgrade-final.log`, `installed-share-offline-final.log`; corresponding generated JSON evidence under `artifacts/share-target`. Browser/CDP checks run inside the installed native WebView/SQLite, not a browser substitute. Physical OEM phone Share Sheet remains Not Run: no phone attached, no personal phone operated.

## Earlier diagnostics

First focused attempt4/8 passed,3 lifecycle failures from changing Intent ACTION_SEND to MAIN before AndroidX resumed identity matching; real log/bytecode diagnosed cause. Payload removal now preserves action. Share Sheet condition-based locator also awaits current window. Subsequent AVD attempt was interrupted before tests when boot competed with JS suites; not a test PASS or production failure. No arbitrary production Back delay/debounce/disable was added.

Fresh focused first attempt8/10passed: Share Sheet and IME blocked by `Application Not Responding: com.android.systemui`. Actual window/Accessibility XML verified that overlay, not a speculative app defect. Clicked its observed Wait button on owned5580 only; confirmed MainActivity focus then reran all10, PASS. No app code, test assertion or timeout changed for this stabilization. Failed log retained as share-android-systemui-anr.log.

Final boot had another observed SystemUI ANR before tests started; Accessibility XML showed its Wait control. Selected Wait on5580, verified launcher focus; final64 then passed. Database-lock/IME-overlap diagnostic runs are preserved separately; test readiness and AndroidTest-only platform animation observation fix invalid fixtures, not production SQLite/Back routing. Old-Bridge race has deterministic native RED→GREEN. No arbitrary production delay/debounce or widened test timeout.

Installed helper initially rejected ADB's doubled CR, then API36's topResumedActivity representation despite real DocumentsUI being resumed. Only those exact parsing assumptions were corrected; no history-line match or weakened foreground/cancel/data assertion. Coverage was then tightened to the generated cover and the full installed workflow reran PASS. Failed helper logs remain diagnostics, not product failure or completion counts.

Final bounded Logcat `-d -t1500` returned1724 formatted lines,0 credential matches; raw logs excluded from Packet. Static scans are bounded pattern checks, not proof against arbitrary encodings/root/hostile OS. Fake HTTP/AI tests do not prove real network/TLS/provider success; APK-4 existing real user acceptance remains separately attributed. This module adds no permission/dependency/schema/backup version, does not delete user data and stops before5C.
