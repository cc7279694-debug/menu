# APK-6 RC2 verification

Date: 2026-10-06. Inherits feature `a2ee25ba094e9f31dc5e99546a1fd15c26c4509b`. Final committed implementation is pinned by the clean-HEAD Review Packet; no self-referential commit/hash is embedded here. All current verification uses the final production function handoff and local prompt correction.

## RED before behavior change

- Generated legacy diagnostic:1PASS before production changes, covering prose/fence, root/candidate key drift and unverified candidate URLs with six bounded scalar fields only. This is not the user's raw response or its confirmed live failure stage.
- Target Native function contracts:38 tests/21 failed against the legacy implementation. Shared diagnostic was green. Initial test compilation needed Gson structural equality because the Android JSONObject stub lacks similar(); that compile issue is not a production RED.
- New JS stable-code/message tests:11 tests/2 failed; old implementation mapped candidate_output_missing to generic invalid_output.
- Independent static review found the retained shared prompt banning tools/assistant result transport. Added request-body assertion:1 test/1 failure before the local correction; shared APK-4 asset unchanged.

## Fresh verification

| Check | Actual result |
| --- | --- |
| Final full repo tests after local prompt repair | 193 files /1029PASS /0failed;818.64s |
| Final test:apk | 69 files /441PASS /0failed;200.36s |
| Native `:app:testDebugUnitTest --rerun` | 22 suites /188PASS /0failures/errors/skips; Gradle1m3s |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS /0errors /5 inherited img warnings |
| `npm.cmd run build:local` | PASS,2193 modules; inherited >500kB chunk warning |
| `npm.cmd run sync:android` | PASS; repeated local build and unchanged SQLite/Filesystem plugins |
| `:app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest` | PASS; Gradle2m1s; lint0errors/37 inherited warnings |
| Debug APK signing | PASS,v2 signature |
| Full unfiltered connected Android | Fresh16classes/105PASS,0failures/errors/skips; Gradle8m4s; XML415.214s. First incomplete SystemUI ANR run retained separately |
| Actual installed v17→v18 preservation | PASS; eight-table rows/IDs/times/order, current/history/retained image SHA and key boolean unchanged; SQLite4 integrity/FK valid |
| Independent offline walkthrough | Five checks PASS at2026-10-06T14:04:36.555Z; network restored/read back exactly; see Android record |

A preceding web run193files/1029PASS in626.65s started before the final local Native prompt correction, so it is retained as a pre-final run rather than substituted for the fresh post-fix full run. Scoped31 JS /38 Native greens likewise remain implementation-stage evidence. No failed test was deleted or hidden.

## Static boundaries actually checked

- Changed/new23 text paths:0credential-shaped matches; final staged scan is repeated before commit and retained in delivery evidence.
- Immutable v18 APK:226 scanned text/DEX entries,0credential-shaped matches;16 copied packaged Web text assets byte-equal to the final local copies.
- No dependency/permission/shared Recipe schema asset/database/backup code changed against v17. The shared generic schema validator visibility alone is reused; behavior is unchanged. SQLite4 / Preview7 / Backup2 remain frozen.
- Scoped Finder Native source has no credential logger/storage/fetch/HTML sink; no plaintext JS getter added.
- Final logcat:13,823,318 characters scanned only in memory,0credential-shaped matches; no raw logcat saved. Clean-HEAD Packet builder checks its whitelist/content, every entry's bytes/SHA and actual ZIP readback; generated metadata records the final result. Bounded scans are not a universal non-disclosure guarantee.
- Original v17 APK SHA256 remains319c52b22c40169a310eee4e2bc8b68b6379a87a9dd5572e6106443469437ea7; original Packet remains16ec80565440433c46b3e5c885c46d6b62b77de2d6146dbab2e8757f0f7f2250.

## Commands / provenance

Web tests use `--pool=threads --maxWorkers=1 --no-file-parallelism` with JSON reports in ignored `artifacts/find-recipe-rc2/`. JVM/build use the existing JDK21/SDK36, `--offline --max-workers=1 --no-daemon`, bounded512MiB heap (final connected rerun384MiB/256MiB metaspace) and version properties18/0.9.0-find-recipe-rc2. Connected uses the owned emulator serial and leaveApksInstalledAfterRun. No new toolchain/dependency was installed. Warnings include inherited flatDir and SDK XML mismatch, not hidden errors.

## Provider / physical boundary

Real paid requests:0. No physical phone is attached; no key is read through JS, logged, pasted into new artifacts or reused from chat. The physical v17 failure is not accepted and the exact private envelope is unavailable. All automatic/fake evidence proves the strict handoff and gates, not qwen3.8-flash's live custom-function success for this device/account.

Only one physical Search for 土豆丝 using the already configured new key is authorized after final green regressions. It must reach Results with a verified candidate; do not auto-retry or issue paid Extract. If it fails, report the stable safe category without another paid attempt.

## Artifact

`artifacts/recipio-find-recipe-v18-debug.apk`:17,250,133bytes; SHA256701e58e61f2e6b58f0185dc59fb4222bc8b13605f96b0e89f527302bfd1fcec6. Package app.recipio.local /18 /0.9.0-find-recipe-rc2; Debug only, not a store release. Byte-identical to the tested final build. Packet is generated only after this final evidence and the clean feature commit; actual ZIP result belongs to generated metadata/delivery report. No main/tag/deploy/next module. Status: APK_6_RC2_PENDING_DEVICE_TEST.
