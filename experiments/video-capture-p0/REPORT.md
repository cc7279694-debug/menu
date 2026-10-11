# RECIPIO Video P0 — execution ledger and evidence

Date: 2026-10-11. Binding spec: user's Video P0 capture experiment task.
Baseline: main / v0.9.1-logo-refresh = 649804a8209413f9d682f1079a4fd19ea84cd064.
Branch: exp/recipio-video-capture-p0. Independent packages/project only.

## Recovery / rulings

- Verified actual local/remote main and release match the approved baseline;
  worktree was clean. The older root CURRENT_STATE is pre-promotion history;
  release annotation records later user acceptance. No production document is
  silently used to downgrade the stable baseline or modified for this experiment.
- Recent referenced conversation was read; three assistant replies are reference
  placeholders, not recoverable full instructions. The full user-supplied P0
  contract is sufficient and is the sole current execution authority.
- Ruling: honor the requested branch and standalone directory in the existing
  checkout; main ref and all production files remain frozen. No extra worktree,
  production setup, npm dependency install or product rewrite is needed.
- Ruling: minSdk29 (playback capture), compile/target36 and cached AGP8.13.0;
  no AndroidX runtime dependency. Controlled source is a second tiny Application
  so cross-UID capture can be tested without any third-party content.
- Existing Mirra API37 emulator is not ours to occupy/stop. No phone connected;
  only ~0.8–1.1 GiB free. No new emulator started. Runtime/controlled/platform
  capture evidence remains NOT_TESTED unless actually run later.
- No AI, platform network/API/Cookie, INTERNET, MIC input, broad storage,
  accessibility, root, hook or protection bypass.

## Tasks

1. State/limits/files/quality Fake+JVM tests — implemented and verified.
2. MediaProjection foreground session / internal audio / private samples — built;
   Android runtime is not verified.
3. Minimal probe UI and generated cross-UID controlled source — built;
   actual controlled-source capture is not verified.
4. Independent unit/lint/build/package/security verification and source review — PASS.
5. Focused experiment commit/push and handoff; stop before device results/product work.

## Platform results

| Target | Classification | Evidence |
| --- | --- | --- |
| Controlled source | NOT_TESTED | Device runtime not yet performed |
| Douyin | NOT_TESTED | User phone test required |
| Xiaohongshu | NOT_TESTED | User phone test required |
| Bilibili | NOT_TESTED | User phone test required |

Automated unit results cannot establish real MediaProjection or platform support.

## Verified delta / checkpoint

- Two independent native Applications, no production dependency or file change.
- Single process-local session authority; new system consent per attempt, one-shot
  grant, callback registered before exactly one VirtualDisplay. Resize reuses it.
- Visible mediaProjection foreground notification and explicit Stop; 15-second
  deadline, START_NOT_STICKY, no auto-start/token persistence. UID-only playback
  capture with no microphone source or broad audio fallback.
- Permission denial, abandoned consent, stale sessions, duplicate starts/stops,
  bounded sample writes, unavailable audio, cache containment and cleanup have
  JVM/Fake evidence. Real Android permission/event behavior remains unverified.
- Private cache: three bounded PNG slots and 480,000-byte maximum PCM16 payload
  (WAV header adds 44 bytes); incomplete audio cannot be published as a valid WAV.
- Cache cleared on cold process start, not rotation; explicit Delete UI.
- Source uses generated moving colors/clock/circle and alternating 440/880Hz
  USAGE_MEDIA audio with allowed capture policy; optional deny-audio control.
- Human review requires current session, actual selected-target playback and
  matching authorization scope. Signal strength is never content evidence.
- Source/probe include explicit cloud/device-transfer exclusions. Probe packaged
  permissions are exactly RECORD_AUDIO, FOREGROUND_SERVICE,
  FOREGROUND_SERVICE_MEDIA_PROJECTION, POST_NOTIFICATIONS. Source has none.
- RECORD_AUDIO implies a microphone feature in Android packaging, but the code
  does not use microphone input; this permission is required for playback capture.

## Test-first execution evidence

- Initial state stub: 10 tests / 10 expected assertion failures (RED).
- State implementation: subsequent 23-test run proved all 10 state tests green;
  sample/cleanup stubs then produced 12 failures (RED; traversal refusal already passed).
- Full state/sample/cleanup implementation: 29 tests passed, both APKs built.
  First lint identified MissingPermission; explicit immediate permission check
  added at AudioRecord construction, without suppressing the check.
- Review regression stubs: 7 tests / 6 failures (RED), then implemented GREEN.
- Session-bound review stubs: 2 tests / 2 failures (RED), then implemented GREEN.
- Final complete run: **38 tests, 0 failures, 0 errors, 0 skipped**.
  Fresh JUnit timestamps: 2026-10-11T06:49:08Z (14:49:08 Asia/Shanghai).

| Suite | Tests | Result |
| --- | ---: | --- |
| CaptureLifecycleTest | 10 | PASS |
| SamplesAndCleanupTest | 13 | PASS |
| SessionBoundariesTest | 6 | PASS |
| ReviewRegressionTest | 9 | PASS |

## Final executed verification

JDK: existing Temurin 21.0.12.1+1. SDK: existing Android36 / build-tools36.0.0.
Gradle8.14.3 wrapper read from existing repository; independent project AGP8.13.0.
No SDK, emulator, runtime dependency or npm package installed.

Final command, from repository root:

```powershell
./android/gradlew.bat -p experiments/video-capture-p0 :probe:testDebugUnitTest :probe:lintDebug :source:lintDebug :probe:assembleDebug :source:assembleDebug --rerun-tasks --offline --no-daemon --max-workers=1 --console=plain
```

Result: BUILD SUCCESSFUL in 1m48s; 94 actionable tasks, all 94 executed.
All final Java/manifest/resources match this run; subsequent changes are reports only.

- Probe lint: 0 errors / 8 warnings (target36 compatibility and Chinese inline text).
- Source lint: 0 errors / 2 warnings (target36 compatibility and draw allocation).
- Existing SDK XML/tool version and Gradle9 deprecation warnings recorded;
  not hidden by baselines or upgraded in this isolated task.
- Both Debug APKs: `apksigner verify --verbose` PASS, APK v2 signature verified,
  one signer; `zipalign -c 4` PASS.
- `aapt2 dump badging`: distinct package IDs, min29/target36, versionCode1,
  expected labels and permission sets, no INTERNET.
- `git diff --check` and staged equivalent: PASS.
- Experimental source/docs secret-pattern scan: no credential/private-key hits.
- Static source review: no remaining Critical/Important blocker after repairs.
- Production exclusion diff against649804a: empty; local/origin main still649804a.
- Whole RECIPIO tests, TypeScript/lint, Capacitor sync, RECIPIO APK build:
  **Not Run — production frozen and unmodified, independent Java experiment.**
- Android installation / controlled source / MediaProjection / real audio / FGS
  notification / rotation / interruption / device process restart / third-party
  platform testing: **Not Run — no safe P0 device available.**
- Real AI calls: **0**. Platform API/network calls: **0**.

## Source review and repairs

An independent read-only reviewer inspected staged and working experiment code.
Resolved: failed reader replacement ownership; abandoned consent; audio read
fallback preserving video; playback premises; shared-UID visibility limitations;
stale Stop idle service; previous-reader queued callbacks; recorder/WAV independent
release; stale UI confirmations across sessions (singleTask + session binding).
Regression helpers are used by the actual service/UI, not duplicate test-only logic.

Reviewer declined to judge Android runtime, controlled media and platform support;
these remain pending, not passed by review. Localization/target warnings are
non-blocking limitations of this deliberately small experiment.

## APK delivery metadata

Both APKs are local ignored artifacts, not committed media or signing material.

### Probe

- Path: `E:\CODEX\VIBE CODING\recipe-step-app\experiments\video-capture-p0\artifacts\recipio-video-p0-capture-probe-debug.apk`
- Package: `app.recipio.captureprobe`
- versionCode1 / versionName `0.1.0-video-p0`
- Bytes: **72,210**
- SHA-256: `3030037aafbb1be0dd75472a5b3450f4704710abd1760c8f61b2ecfea938d6e3`

### Controlled source

- Path: `E:\CODEX\VIBE CODING\recipe-step-app\experiments\video-capture-p0\artifacts\recipio-video-p0-controlled-source-debug.apk`
- Package: `app.recipio.captureprobesource`
- versionCode1 / versionName `0.1.0-controlled-source`
- Bytes: **17,596**
- SHA-256: `ee76e8ad6a7d6e7040400bb254e9355400aeb1af53209f816948b00d1e8982cf`

## Inherited boundaries / next continuation

Do not merge main or convert this probe into product functionality.
No RECIPIO schema, backup, logo, version, AI or production dependency changed.
No sample media/private URL/user content/API Key/keystore included in Git.
Installation and exact manual checklist/classification template are in README.md.
Next: user installs both APKs and validates controlled source, then each platform
and lifecycle checklist. Retain package/OS/authorization mode and observed results
only; delete media locally. Do not infer NO_GO or feasibility from absent evidence.

Status: **VIDEO_P0_PENDING_DEVICE_TEST**.
