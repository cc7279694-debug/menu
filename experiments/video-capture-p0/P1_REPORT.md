# RECIPIO Video P1 — Visual Recipe Probe

## Status and scope

`VIDEO_P1_PENDING_DEVICE_TEST`

This is an independent Android experiment, not a RECIPIO feature or a release.
Branch: `exp/recipio-video-visual-p1`, based on P0
`ddcfef3f19cfe47976efa09a9a0197d733d3875e`.
Stable main remains `649804a8209413f9d682f1079a4fd19ea84cd064`.
Only `experiments/video-capture-p0/` is changed. No production SQLite, Backup,
Manifest, AI Provider, dependency or APK version is changed.

## Evidence inherited from P0

The user reported physical-phone results: controlled source video/audio PASS;
Douyin, Xiaohongshu and Bilibili video PASS / internal audio FAIL.
`VIDEO_P0_PARTIAL_CAPTURE` applies only to that phone and those samples.
These are user reports, not tests executed by Codex. P0 reports/APKs are retained.
P1 respects the audio restriction: no microphone or playback capture is wired.

## Implemented experiment

- Fresh Android screen/window consent per session; one projection/token/display,
  callback registered first, mediaProjection foreground service, explicit and
  system stop, epoch-safe ImageReader replacement during resize.
- At most 120 seconds, one accepted frame per second, 120 candidates. Encoding
  and storage happen sequentially on one worker. No video or audio file is made.
- JPEG longest edge ≤2048, encoded size ≤1 MiB; preview thumbnails ≤240 pixels
  and ≤128 KiB. Compression tries 90/80/70/60, discarding an entire failed
  attempt. A frame that cannot meet the budget stops capture rather than
  silently reducing text dimensions further.
- Review offers ordered candidates, full single-image preview, add/remove,
  replace, selected-image ordering and a hard 1–6-image share gate.
- User-initiated Android Share uses JPEG `content://` URIs, ordered stream and
  ClipData entries, and read permission only. Choose RECIPIO in the system panel.
  The Probe never initiates AI; RECIPIO's existing deferred image Intake is used.
- A generated source cycles through six cooking scenes, 20 seconds each:
  ingredients, preparation, pan, seasoning, simmer and serving.

## Deterministic suggestions, not cooking-step detection

1. Sample a bounded 64×64 luminance grid; exclude almost-black or uniform frames
   from suggestions, but retain them in the reviewable candidate list.
2. Collapse **exact-pixel identical adjacent frames** only. This is not perceptual
   deduplication: slight movement and caption changes remain candidates.
3. Use mean horizontal/vertical luminance edge strength as a simple clarity
   heuristic. It is not a learned blur detector or text-recognition measure.
4. If more than six useful distinct candidates exist, divide their observed time
   range into six buckets and select the highest-clarity member of each populated
   bucket. Ties keep the first frame. Empty buckets are not invented.
5. Suggestions may number fewer than six and are always editable. No semantic
   inference about ingredients, preparation or actual cooking steps occurs.

One-second sampling can miss short captions. Edge strength can favor a textured
pan over important text. User video-quality assessment is required before any
production decision.

## Cache, share lease and privacy

- Private `cache/video-visual-p1/{candidates,exports}` only. No gallery/downloads,
  RECIPIO media, database, backup, network upload, or media committed to Git.
- All candidate JPEGs, thumbnails, selected copies, metadata and partial files
  share a 40 MiB hard budget. Candidate writes additionally reserve **6 MiB +
  1 KiB** for a first six-image export. Previously live export leases count
  against that same budget; reaching the candidate limit preserves share space.
- Only copies selected by the user enter the FileProvider root. Candidates and
  lease manifests cannot be read through it; write access is refused. The
  official AndroidX FileProvider is used rather than a custom URI file server.
- Export leases last at most six hours. Sharing does not immediately delete
  files. Cold start discards old candidates but retains unexpired export leases;
  expired or incomplete exports are removed at cold start, next capture or share.
  An idle process does not proactively delete files at the expiration instant;
  expired URIs are rejected. Android may reclaim cache earlier under pressure.
- Explicit deletion revokes read grants and deletes Probe cache only. Wait until
  RECIPIO displays all images before using it. Repeated shares can exhaust the
  bounded export budget and fail visibly without deleting candidates/live leases.
- Probe permissions: projection foreground service and notifications only;
  **no INTERNET / RECORD_AUDIO / broad storage / accessibility permission**.
  The merged AndroidX manifest additionally declares/uses Probe's own
  signature-only `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, not a new sensitive
  Android runtime permission. Profile install receiver requires system `DUMP`.
- AndroidX core 1.13.0 and cached transitive constraints are isolated to Probe.
  No production dependency is changed. No SDK/dependency upgrade is bundled.

Mandatory review warning:

> 本次只采集到了视频画面，未采集平台内部声音。口播中未出现在画面上的食材用量、时间和火候可能无法识别。

## Verification

Final fresh run on 2026-10-11, same final Java/Manifest/Gradle implementation:

```powershell
$env:JAVA_HOME='C:/Users/CDD/AppData/Local/RecipioAndroid/jdk/jdk-21.0.12.1+1'
$env:ANDROID_HOME='C:/Users/CDD/AppData/Local/MirraAndroid/sdk'
.\android\gradlew.bat -p experiments/video-capture-p0 `
  :probe:testDebugUnitTest :source:testDebugUnitTest `
  :probe:lintDebug :source:lintDebug `
  :probe:assembleDebug :source:assembleDebug :probe:assembleDebugAndroidTest `
  --rerun-tasks --offline --no-daemon --max-workers=1 --console=plain
```

Result: BUILD SUCCESSFUL, 124 actionable tasks executed, no reused test green.

| Verification | Actual result |
|---|---|
| Probe JVM | 60 tests; 0 failures/errors/skips, including retained P0 tests |
| Generated source JVM | 3 tests; 0 failures/errors/skips |
| Probe lint | 0 errors, 9 warnings (5 dependency-version, 1 target-version, 3 i18n) |
| Source lint | 0 errors, 3 warnings (target-version, inherited draw allocation, i18n) |
| Probe / source / instrumentation APK build | PASS |
| APK signatures (all three P1 artifacts) | PASS, v2 signature |
| zipalign `-c 4` (all three) | PASS |
| Compiled Manifest `aapt dump xmltree`, permission inspection | PASS; no network/audio permissions |
| P0/P1 certificate equality | PASS: `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9` |
| Actual P0 → P1 covering install | NOT RUN; matching package/version/signature is not an install test |
| Android 13 boundary checks | NOT RUN — queued; built only |
| Actual controlled projection/share and lifecycle | NOT RUN — queued |
| User P1 six-platform-sample quality | NOT RUN — user acceptance required |
| Production Web/TypeScript/RECIPIO regression | NOT RUN — no production changes; independent Java experiment |
| Real AI requests | 0 |

The old `aapt dump badging` tool could print package/version but failed resolving
the inherited framework icon reference; it is not counted as a passing command.
Compiled Manifest inspection succeeded instead. Android icon rendering is still
part of pending runtime verification. Build also emitted SDK-XML mismatch,
Gradle deprecation and low-metaspace warnings; no dependency/SDK upgrades or
warning suppression were used to hide them.

Android boundary instrumentation uses generated pixels; it does not substitute
for actual projection or cross-process sharing.

Android runtime checks are queued by explicit user instruction until the other
project's Lithic task has finished and a safe RECIPIO test environment is free.
Its emulator will not be used, stopped or modified. Lithic subsequently completed
and its device was closed, but the next pre-launch check measured only
1,959,368 KiB available physical memory. The safety guard refused to launch a
new emulator. A thread heartbeat queues rechecks every 15 minutes, stays quiet
while unchanged, and must stop after the scoped Android handoff. See
[P1_ANDROID_VERIFICATION.md](P1_ANDROID_VERIFICATION.md).

## Review disposition

- Independent read-only SOL review found no Critical issue; Important: candidates
  could consume export space. A failing regression reproduced it, and export
  reserve was added, including still-live previous-session exports.
- Added real generated sharp/box-blurred pixel scoring regression (not only
  manually assigned clarity scores).
- Exact-only deduplication is an intentional conservative limitation and is
  documented above. No complex model was added.
- Added fail-closed bounded-encoder payload handling and Android overflow check;
  the Android check is pending execution, not reported as passed.

## Acceptance still required

1. Generated six-scene capture → editable selection → 1–6-image share → RECIPIO
   display, with **zero AI calls** during Codex checks.
2. Android stop/consent/rotation/repeated-session/process cleanup and cross-process
   read authorization on an owned test device.
3. User physical-phone tests: two user-selected lawful videos per platform,
   including caption-rich and predominantly spoken examples. Codex will not
   automate platform apps or request an API Key. Any AI call is the user's
   separate deliberate action inside RECIPIO.
4. Complete [P1_QUALITY_TEMPLATE.md](P1_QUALITY_TEMPLATE.md), distinguishing
   missing captured information from model misunderstanding.

No platform quality Gate is concluded yet. Do not integrate video import,
increase RECIPIO's image limit, merge main or create a release from this result.

## Artifacts and Git

Delivery directory (absolute):
`E:\CODEX\VIBE CODING\recipe-step-app\experiments\video-capture-p0\artifacts\`.

| File | Package / version | Bytes | SHA-256 |
|---|---|---:|---|
| recipio-video-p1-visual-probe-debug.apk | app.recipio.captureprobe / code 2 / 0.2.0-video-visual-p1 | 5,136,609 | 5eac57df1dd87a046c9f2a87bb6616417b67c5268b88f764a7f8fa62ea0f9ccf |
| recipio-video-p1-six-scene-source-debug.apk | app.recipio.captureprobesource / code 2 / 0.2.0-six-scene-source | 20,028 | 23a1e46038b5fb743fee7b25bdd42c1c737fda73c58002dd1e8c806ad7602039 |
| recipio-video-p1-boundary-tests.apk | app.recipio.captureprobe.test | 22,118 | b1040d0b3c5fcc418d6e4c95aa1ddbd3a81157ce47e79c30101a950b0da5e1fb |

Delivery copies were hashed after copying, signed/aligned checks run on those
copies. Old P0 delivery hashes are unchanged. APKs/build outputs and generated
media remain ignored, not committed. Test/source APKs are not the production App.

Focused implementation/verification commit and ordinary push are made only to
`exp/recipio-video-visual-p1`. Retrieve the exact delivery commit using
`git log -1 --format=%H -- experiments/video-capture-p0/P1_REPORT.md`; the final
handoff reports it and verifies remote/local equality. No tag/main merge/deploy.

Resume from Android boundary checks and controlled-source integration in
P1_ANDROID_VERIFICATION; do not repeat completed implementation or real AI smoke.
