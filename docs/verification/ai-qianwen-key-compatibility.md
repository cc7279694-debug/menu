# APK-4 Qianwen workspace key compatibility — 2026-10-05

Branch `feat/recipio-ai-intake`; starting clean HEAD `10f3362a33369e8b5483dc678e63cb250b8c355a`. Delivery commit pinned by Packet manifest. **APK_4_PENDING_DEVICE_TEST**.

## Cause / narrow repair

Earlier paste-boundary repair did not accept workspace dot-separated signed keys. Native input/envelope rejected them before HTTP; sole Beijing URL also did not match this platform. Generated fake credentials reproduce both defects. Official reference: [first API call](https://platform.qianwenai.com/docs/developer-guides/getting-started/first-api-call).

User approved minimal compatibility. AiSecretEnvelope is single syntax authority for input/encryption/decryption/HTTP. Legacy bounded sk- applications retain old rules; lowercase sk-ws- permits dots plus ASCII alphanumeric/underscore/hyphen;20–512 limit unchanged. sk-sp- Token Plan refused. Boundary-only normalization retained, no internal joining/substitution. Envelope version/AAD/Keystore/AtomicFile/noBackup/native password protection unchanged.

AiIntakeContract owns two fixed URLs: workspace `https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions`; legacy `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`. PreparedRequest selects by native credential; HttpsTransport checks same allowlist. No redirect/retry/arbitrary JS URL/probing/fallback/model change. Contract asset endpoint is legacy default; runtime choice native-only. qwen3.8-flash fixed.

Preflight exposes only safe status/model/service profile. Retained region field supports beijing/qianwen-platform, latter not geographic assertion. Strict Zod/UI reflect it. Cost consent now describes fixed text, not screenshot verification. Char wiping/mutex/cancellation and ordinary-Recipe Preview gate retained.

## Test-first / fresh final evidence

Logs `.superpowers/sdd/2026-10-04-apk-4-ai-intake/workspace-key-*.log`. Fixtures generated TEST/UUID; automated HTTP Fake/Mock only.

| Evidence | Actual result |
| --- | --- |
| Native red-jvm.log |37run/3failed: input, encryption, endpoint |
| Separate red-policy.log |1run/1failed: Token Plan reached Fake HTTP |
| Corrected green-jvm.log |38passed/0failed, included in final95 |
| Web red-web.log -> green-web.log |18run/3failed ->18passed, included in final878 |
| Workspace native dialog / Fake HTTP native boundary |compiled, **Not Run** |

| Final command | Result |
| --- | --- |
| `npm test -- --pool=forks --maxWorkers=1 --testTimeout=120000 --hookTimeout=120000 --reporter=default --reporter=json --outputFile=artifacts/ai-intake/test-results-workspace-key.json` |174files/878passed/0failed,961.36s |
| `npm run typecheck` |PASS |
| `npm run lint` |PASS0errors/5inherited image warnings |
| `npm run build:local` |PASS15.87s; inherited large-chunk warning |
| `npx --no-install cap sync android` |PASS1.668s, preceding fresh build |
| From android: `./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --rerun-tasks --no-daemon --console=plain --max-workers=1 '-PapkVersionCode=12' '-PapkVersionName=0.5.0-ai-intake'` |PASS239executed/5m4s; XML11suites/95tests/0failure/error/skip; lint0errors35warnings |
| Expanded workspace/Token Plan secret regex APK ZIP scan |12text/10DEX PASS; no matching credential/private-key; text assets no former cloud runtime URL |
| aapt/apksigner compiled audit |Same-v12 certificate; unchanged permissions; allowBackup=false/all5domains cloud/transfer excluded |

Immutable no-overwrite APK: `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-ai-intake-v12-qianwen-key-debug.apk`; **16573907bytes**, SHA256 **3a185094ca316c446d0f2c4c1d6328d07142330bca0d028442e6b4b756eb4214**. Package app.recipio.local /v12/0.5.0-ai-intake/SDK36; Debug, not release. Certificate SHA25629ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9 matches oldv12. Old APKs/Golden/backups retained; no DB clearing/export/restore in this repair.

## Real Provider / remaining evidence

Earlier user-approved desktop diagnostic:1realPOST/0automated, qwen3.8-flash/qianwen-platform/HTTP200/970ms/strict status-ok. Repair added0realcalls. Only safe metadata retained; no prompt/raw response/key. Revoke chat-exposed key and configure a new one only in native protected UI; never reuse it. Desktop authentication does not prove Android/image/Recipe/Preview save. At most3further agent-driven calls within original four-call budget, no automatic reset/retry.

Only another project's Mirra5554 online, not operated. Owned5580 historically repeatedlySystemUIANRed, not relaunched. Current connected/dialog/IME/install/phone/nativeProvider/Logcat/userDBscans **Not Run**. Old40connected/32pass/8IMEfail remains unresolved history; MainActivity unchanged, no native RED→GREEN claim.

Next: overwrite-install without uninstall/clear-data, new protected Key/save/explicit model access, then healthy-device eight Back cases/fullconnected and bounded generated-text/screenshot/Preview/save/temp/offlinecore/backup-start. SQLite4/Preview7/Backup2/dependencies/permissions unchanged. No merge/main/PR/deploy/APK5. Clean focused commit/feature push and ten-entry Packet readback deliver pending handoff; actual SHA in manifest.
