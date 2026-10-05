# APK-5A Android verification — generated data only

Environment: Android16/API36 `Recipio_Backup_36`, serial `emulator-5580`, bundled local Web resources, actual Capacitor/WebView/SQLite/IME. Dedicated AVD started without wipe or snapshot save. Other project `Mirra_API_37`/5554 remained untouched. No physical phone attached or personal recipe/database used.

## Automated Android evidence

`WebLinkIntakeInstrumentedTest` final8/8PASS and complete connected53/53PASS; final connected XML53 cases,0failure/error/skip. Fresh debug application and androidTest assemblies pass. JVM14 suites/114PASS include real OkHttp client/DNS/socket tests. Exact commands/logs in `link-import.md`.

New eight actual Android scenarios:

1. `completeParser_zeroAi_edit_save_realSqlite`
2. `partialParser_explicitAi_reviewGate`
3. `noJsonLd_readable_doesNotCallAiUntilClicked`
4. `multipleCandidates_explicitSelection`
5. `inputImeBack_onlyHidesKeyboard_thenPageBack`
6. `previewImeBack_keepsEditedTitleAndReviewGate`
7. `busyBack_andCancel_doNotDoubleFetchOrSave`
8. `nativePrivateTargets_areRejectedBeforeAnyHttp`

Native fixture integration uses fake validated DNS and an owned interceptor supplying generated HTML, before external network connection. Fake Qwen is isolated generated-key HTTP testing; it does not access the user's configured key. These eight prove installed routing/IME/bridge/parser/review/local SQLite behavior, not external TLS or real model behavior. SSRF/DNS connection, redirects and transparent gzip also have JVM socket evidence; neither layer claims unreachable public pages succeeded.

IME first Back closes keyboard without leaving or discarding input/preview; next Back enters existing page routing. Busy repeated Back never duplicates read/AI/save. Existing APK-4 IME suite remains in full53. No production Back handler changes, arbitrary delay/debounce or second keyboard state machine.

Initial focused attempts encountered an Android SystemUI ANR overlay (actual dumpsys window focus, owned screenshot) and test viewport/focus preconditions; first and second failed logs retained. Test now waits for actual Activity focus/IME and scrolls target into view, with current native input event time. Once overlay dismissed on this dedicated AVD, final8 and full53 pass. This is explicitly test/environment stabilization, not a masked production defect.

## Manual installed-app checks

| Check | Evidence / actual result |
| --- | --- |
| v12 → v13 overwrite without clearing data | Install preserved v12, create generated upgrade recipe, install finalv13; same recipe detail readable. `manual-seed-evidence.json`, `manual-smoke-evidence.json` |
| Independent link entry / read error recovery | Entry renders; actual localhost Native input rejected before HTTP; manual editor still usable. WebView0runtime errors. `manual-smoke-evidence.json` |
| Public structured recipe page attempt | Current network rejects public-domain resolution; no parser save falsely claimed. `manual-public-evidence.json` |
| Public plain page attempt | Actual Native `dns_blocked`, safe UI explanation;0runtime errors. `manual-plain-public-evidence.json` |
| Flight-mode force-stop cold start | Enable airplane via `cmd connectivity airplane-mode enable`, disable Wi-Fi/data, force-stop then start app; old generated v12 recipe readable. `manual-offline-evidence.json` |
| Imported recipe persistence / cooking | Native fixture parser-saved ordinary Recipe remains after that actual process cold start; detail and Guided Cooking usable offline. Same offline evidence,0runtime errors |
| Final packaged resources | 13 synced files under final Android public assets compared byte-for-byte with tested APK; all equal |
| Installed metadata / artifact | `app.recipio.local`, versionCode13, versionName `0.6.0-link-import`;17,204,359bytes; SHA-256 `1f9ee38dd781b61d36ddd2552718f6dbed959ca4cbcb30a18c391dd43bac157f` |

Host DNS diagnostic returned198.18.0.50 for a public recipe host, consistent with the Native reserved-range refusal. This is a current VPN/Fake-DNS limitation; no benchmark-range exception added. Successful external imports and webpage AI fallback are NOT RUN, as allowed by approved public-site stability gate. Qwen paid calls0; APK-4 user acceptance kept separately.

All sample data/screenshots are generated on the dedicated AVD. No uninstall/clear-data/destructive restore on real user data. Existing Backup destructive regressions execute only their owned fixtures in connected suite. Final AVD network restored to original airplane-on/Wi-Fi-off; app data preserved. Owned temporary adb forwarding and AVD process are released at delivery, never another project's device.

## Not run / residual boundary

Physical OEM Back/keyboard/file-picker behavior, non-VPN public-site success, release-signing distribution, real webpage→Qwen request: NOT RUN. Browser preview is not substituted for Android SQLite. No cloud/main/Play Store changes. Completion reflects the approved module and emulator gate, not universal network/site/device compatibility.
