# APK-3 Android verification

Status: **APK_3_COMPLETE**, 2026-10-04; final automated and dedicated simulator acceptance passed. User acceptance pending, stop before APK-4. Physical-phone/OEM: **Not Run**.

## Boundaries and final identity

Repo `E:\CODEX\VIBE CODING\recipe-step-app`, branch `feat/recipio-cooking-experience`; approved plan fa6aa4b, APK-2 accepted base b541d8a. Final runtime code includes native reply-order fix 0c55e3d. Dedicated generated-data AVD `Recipio_Backup_36`, Android16/API36, x86_64; final serial emulator-5554 after alias verification. Earlier serial5556 and unrelated Mirra serial5554 were not confused; the unrelated AVD/data was never controlled.

Final APK `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-cooking-experience-v11-debug.apk`, 16,523,535 bytes, SHA-256 **2dc868bb72b537798e17471e1a2621bc46cf4b9f2c15b9045f6590a3e02fb82d**. Package app.recipio.local, versionCode11/name0.4.0-cooking-experience, min24/target36. Same SHA for final copy, candidate-v11-r3.apk, connected target build and every final-v11 UI report.

Commands below ran from repo; version properties were quoted in PowerShell. SDK `C:\Users\CDD\AppData\Local\MirraAndroid\sdk`; JDK `C:\Users\CDD\AppData\Local\RecipioAndroid\jdk\jdk-21.0.12.1+1`. Commands/JSON retained under `.superpowers/sdd/2026-10-04-apk-3-cooking-experience/` and `artifacts/cooking-experience/`; no raw personal content in the review packet.

## Fresh final automated verification

| Actual command | Final result |
| --- | --- |
| `npm test -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/cooking-experience/test-results-final-r3.json` | 154 files / 739 passed, 0 failed; 233.80s |
| `npm run test:apk -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/cooking-experience/native-tests-final-r3.json` | 30 files / 151 passed; subset of 739, not additive |
| `npm run typecheck` | Passed |
| `npm run lint` | 0 errors / 5 unchanged legacy img warnings |
| `npm run build:local` | Vite passed; existing >500kB chunk warning retained |
| `npm run sync:android` | Passed, existing SQLite8.1.1 / Filesystem8.1.4 |
| `android/gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --rerun-tasks --console=plain --max-workers=1 -PapkVersionCode=11 -PapkVersionName=0.4.0-cooking-experience` | 239 tasks fresh; JVM5files/30 passed, lint0errors/34warnings, Debug/AndroidTest APK built; 1m12s |
| `ANDROID_SERIAL=emulator-5554 android/gradlew.bat -p android :app:connectedDebugAndroidTest --console=plain --max-workers=1 -Pandroid.injected.device.serial=emulator-5554 -PapkVersionCode=11 -PapkVersionName=0.4.0-cooking-experience` | Full14 passed /0failures/0errors/0skipped; tests8.603s, Gradle55s |

Connected covers original six real backup/provider tests, five incremental SQLite4/constraint/reference/reconciliation tests, two native callback-order tests and existing app-context test. Fixture SQL is checked against the production migration; failed migration retains schema3 and old rows. Native startup cleanup includes cooking-only files during Undo, and actual cover/step/history/shared-record references. Existing provider/staging failure and published-commit protections passed again, not inherited as old green.

Migration/v1/v2/shared references/rollback/Preview transactions/pins/cookedAt idempotence/20-row tie cursors/change no-op projections are included in the final whole suite. JVM strict Golden validation reads the original v1 bytes; original SHA remains 6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313.

## Actual installed-APK UI/device evidence

Invoked `node scripts/verify-cooking-android.mjs <absolute SDK adb> emulator-5554 <mode> <APK>`. Native system picker/SAF clicks plus inspection of the installed APK's actual WebView and SQLite were used, not browser mock storage. No image/record paths were inserted to replace UI proof. Destructive operations assert generated-only provenance and an already verified external backup.

| Mode / final JSON | Actual result |
| --- | --- |
| prepare-v10-final-result-1791107412546.json | 1 check: fresh isolated original v10/schema3 UI restores unchanged Golden and freezes exact old six tables/metadata/media hashes |
| upgrade-final-result-1791107448907.json | 1 check: actual v10→finalv11 install-r, schema3→4, all old fields/IDs/times/order/metadata/media SHA exact, cooking empty |
| flows-result-1791107489148.json | 3 checks: Full Steps default; Focus arbitrary step + actual Back restores position/focus/zero records; Guided exit zero records; explicit minimum/final record, skip extras, sugar30→15 current and read-only history |
| media-result-1791107540661.json | 5 checks: real PNG picker/photo→same cover path/note/newline/Emoji/cold decode; delete cancellation unchanged; shared cover/history retained; cover removal retains historical image; 5sUndo children/images; expiry last-reference cleanup |
| backup-result-1791107670552.json | 7 checks: actual v2 external export/readback/counts/sizes/allSHA; valid staged cancel unchanged; corrupt hash rejected; cooking-row trigger failure rolls back all7tables/current media; original v1 changes/media + empty cooking + originalcommitHash; v2→clear generated data→Replace allIDs/times/order/SHA exact; restored search/image decode |
| offline-result-1791107716287.json | 2 checks: airplane/Wi-Fi/data-off cold launch, local image/view/edit/explicit complete/history, second cold persistence, integrity=ok/FK empty; no external network requests |
| narrow-result-1791107732261.json | 1 check: native WebView320px and systemfont1.5, ≥44pxbuttons/visible/nohorizontaloverflow; actual Android Back exits Guided; metrics/font restored |
| reinstall-result-1791107749881.json | 1 check: same-final APK install-r after cooking/restore/offline edits retains all7entities, original times, media and restore facts |

21 total closed-loop checks, including1 old-v10 baseline and20 final-v11. Each final-v11 result identifies this final SHA, alias/API/ABI/time and physicalPhone=Not Run. Screenshots `full-detail.png`, `cooking-history.png`, `restored-cooking.png`, `offline-detail.png`, `narrow-guided.png` inspected/retained as generated test evidence.

Full connected tests ran first: the Android UTP runner uninstalls target after testing, so its generated database is not treated as a production migration. The already readback-validated r2 backup remained external; fresh v10 restored original Golden through the real UI, then all upgrade/flows/media/backup/offline/narrow/reinstall tests ran again on final r3 bytes. No reset or wipe produced migration green. Final AVD/test data retained, emulator safely closed.

## Files and readback hashes

Test v2 `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\cooking-experience\cooking-v2-1791107599943.recipio`: **3154 bytes**, SHA-256 **efe5d4d014ac81031c985213dff3e778926e10e2817f96d54bde15f763013ded**. Format2/schema4; 3recipes/4ingredients/5steps/1preparation/1keyTip/3changes/3cookingRecords/3assets. Logical fields/IDs/timestamps/order and image bytes compared exactly before and after restored-generation path changes. Generated data only.

Original v1 `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\golden.recipio`: **2761 bytes**, SHA-256 **6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313**; unchanged strictv1/schema3 including required changes. v1 internal normalization adds only empty cookingRecords and retains original manifest/hash.

## Manifest audit / no cloud

Actual final APK `aapt dump badging`, manifest and compiled XML rule dumps verified allowBackup=false; all five root/file/database/sharedpref/external domains excluded in legacy full-backup, cloud-backup and device-transfer. Permissions exactly inherited from v10: USE_BIOMETRIC, USE_FINGERPRINT and app-specific dynamic receiver permission; no INTERNET/broad media permissions. Core network capture in airplane mode contained no external requests. No Supabase, Vercel, auth, AI or timers introduced; no cloud data/resources touched.

## Repairs and honest boundaries

- Test-first fixes: root Back/read-lock regression; stale Preview schema6 assertion updated to approved7; late completion navigation race (RED regression then protected exits); native backup reply-before-unlock race (real UI export/discard/restore failure, 2 native RED assertions then both final connected GREEN). After the last runtime repair, all final commands and device flows above reran; earlier r2 results were not reused.
- Environment failures retained: first dotted Gradle version argument needed PowerShell quoting; resource paging timeout occurred before candidate installation; SystemUI ANR dialog absorbed Back. Actual focused-window/native hierarchy diagnosed SystemUI, observed Wait button acknowledged and flows resumed. No app Back logic/production timeout/test deletion used to conceal those events.
- Physical phone/OEM: **Not Run**. Only PNG was real-picker tested; other MIME copy mappings are automated, not every device display. Hardware power loss, extreme-size/large-library and every Android release remain unverified.
- Preview browser cold offline start is not claimed (no new Service Worker). Draft/replaced/unknown orphan media is retained; backup is unencrypted and private safety copies cannot survive uninstall/clear. Warnings are recorded, not hidden.

No unresolved final functional failure or migration/backup/image-reference architecture blocker. Approval asks to stop here; user acceptance and any later module remain separate.
