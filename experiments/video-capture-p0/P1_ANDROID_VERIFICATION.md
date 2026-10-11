# Video P1 Android verification checkpoint

## Scheduling and ownership

User instruction (2026-10-11): queue RECIPIO runtime checks until Lithic finishes;
do not pause, stop or use its emulator. Observed device `emulator-5580` belongs
to AVD `Lithic_M01_API_36`; a reused serial is not RECIPIO ownership evidence.
No phone was connected during initial preflight.

Later readiness snapshot: Lithic thread completed/idle and `adb devices` empty;
no emulator process remained. Launch guard then saw 1,959,368 KiB free and
refused to run Start-Process. No RECIPIO emulator was launched. Thread heartbeat
`p1-android` historically queued readiness rechecks every 15 minutes, without
unchanged notifications. It was set to PAUSED after the scoped Android handoff
on 2026-10-11; the automation tool confirmed the applied status.

Before resuming: inspect the other thread status and available memory; verify
the AVD name/process and device serial. Only a RECIPIO-owned test environment
may be started or used, and only the generated Probe/Source fixtures may be
cleared. Do not operate Lithic data, device or task. Do not connect a user phone
or install onto one without explicit direction.

The root RECIPIO production code remains frozen. No AI calls, platform UI
automation, new SDK installation, main merge or release is part of this queue.

## Automated Android boundary suite

Runner: `app.recipio.captureprobe.P1Instrumentation` (13 checks).
Test package: `app.recipio.captureprobe.test`.

Checks: JPEG dimensions/bytes, thumbnail bound, overflow rejection, single/multi
share action, ordered ClipData/stream/read-only grant, seventh image rejection,
selected bytes read, write/candidate/lease denial, no network/audio permission,
cold-start lease retention and explicit cleanup. Uses generated pixels only.

Current runtime result: **PASS — 13/13 on 2026-10-11**, implementation/artifacts
from `6a71feaa1394e0900e991bcdc6eae19d0e8a3973`, without code changes.
The complete instrumentation output ended in `OK (13 tests)`, process exit 0.
This suite is not projection consent or cross-process RECIPIO receiving evidence.

Run on the explicitly verified RECIPIO device with its serial selected; capture
the complete instrumentation exit/status result. Do not run device-agnostic
connected tests while another project's device is connected.

## Controlled Android integration checklist

| Check | Result | Evidence source |
|---|---|---|
| P0 → P1 same-package/signature covering install | PASS | Actual P0 install followed by P1 `install -r`, both Success; installed code 2 |
| Fresh consent / refusal / one token | PASS for observed sessions | System single-app dialog Cancel produced consent_denied, 0 frames and no service; repeated sessions each requested fresh consent |
| Single-app projection / six-scene ordered candidates | PASS, generated source only | Six actual JPEG samples visibly contain ingredients/preparation/pan/seasoning/simmer/serving in order |
| 120-second automatic stop / candidate cap | PASS | auto_stop_120s; 117 accepted frames, 0 suspected black/uniform; projection null, service absent |
| User and system stop / repeated sessions | PASS | user_stop: 66 frames; stopping the controlled source task triggered system_projection_stop: 71 frames; no active projection afterward |
| Window resize / rotation / stale-reader release | PASS for observed rotation | Actual rotation 1, capture continued; c-20 JPEG 960x480, 43,949 bytes; portrait restored; no resize exception observed. Internal stale-reader race coverage remains JVM evidence |
| Process termination / cold candidate cleanup | PASS | Idle restart cleared candidates, reset review and retained live exports; force-stop during active projection immediately removed projection/service; subsequent cold start cleared candidates and kept two live leases |
| Suggested six / actual preview, replace, order / reject seventh | PASS | Actual UI preview, move, replace, remove/add; seventh rejected; zero disables Share; one/six launch matching system chooser |
| Share one and six JPEGs → existing RECIPIO, order preserved | PASS | Actual Android chooser selected existing v19; screenshot 1 and screenshots 1–6 loaded; six decoded-image comparisons preserve deliberate reorder |
| Cross-process grants / async read / live lease after Probe restart | PASS for observed receiver flow | Native receiver asynchronously copied six read-granted content URIs; six receiver images loaded; Probe restart retained export lease, receiver remained usable. Arbitrarily delayed reads after cache pressure/lease expiry not asserted |
| No automatic AI request | PASS | No Provider action invoked; existing airplane mode retained; UI showed Key configuration required and disabled Start AI; no Key configured or read |
| Explicit cleanup / bounded storage / no leftover service | PASS for generated fixtures | Delete confirmation emptied candidate/export directories and reset frame count; observed full-session cache 9,868 KiB < 40 MiB; projection/service absent |

Record exact device/Android build, artifact SHA, commands and result, and distinguish
Codex-generated-source checks from user physical-phone/platform evidence. If UI
consent or integration cannot be safely automated, leave it NOT RUN and provide
P1_INSTRUCTIONS for user verification rather than substituting mock evidence.

## 2026-10-11 queued runtime continuation

Lithic was confirmed completed/idle. Only RECIPIO-owned AVDs were used, always
with explicit serial `emulator-5582` and fresh AVD-name verification. A serial
was reused only after the preceding owned emulator shut down normally.
No other project's process, emulator or data was stopped or used.

### Capture and boundary environment

AVD `Recipio_Acceptance_36_V6`; Android 16/API 36;
`google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.F3/13894323:userdebug/dev-keys`.

The initial 1536-MiB launch booted and covering installs succeeded, but host
free memory fell to 584,692 KiB. The owned emulator was shut down normally.
The interrupted first boundary installation is an environment interruption,
not a failing test. A guarded 1024-MiB/2-core/no-Vulkan low-resolution launch
then completed the runtime suite and capture checks. System UI showed an ANR;
the observed Wait action recovered it. No Probe crash was established.
Density was temporarily changed from physical 420 to 240 and reset afterward;
rotation settings 1/0 were restored after the landscape check. The emulator
was closed normally, without wipe or application-data reset.

Commands actually executed (SDK adb with explicit owned serial):

```text
install -r recipio-video-p0-capture-probe-debug.apk
install -r recipio-video-p1-visual-probe-debug.apk
install -r recipio-video-p1-six-scene-source-debug.apk
install -r recipio-video-p1-boundary-tests.apk
shell am instrument -w app.recipio.captureprobe.test/app.recipio.captureprobe.P1Instrumentation
shell dumpsys media_projection
shell dumpsys activity services app.recipio.captureprobe
shell run-as app.recipio.captureprobe du -sk cache/video-visual-p1
```

The complete generated-source run restarted the source at 19:22:27 +08:00,
shortly after single-app consent. At 19:24:49 the Probe reported auto_stop_120s,
117 frames and no black/uniform flags. Actual JPEGs c-10/30/50/70/90/110 were
visually inspected and show all six scenes. They remain ignored local generated
evidence, not committed media. The generated source's optional tone was
unavailable with emulator audio disabled; **no audio capability is asserted**.

Six selected export copies were compared against the complete candidate hash
set, not by assuming that displayed seconds equal candidate IDs. All six SHA-256
matched c-16, c-37, c-44, c-65, c-86, c-100, in that export order. An earlier
timestamp-as-ID comparison was invalid and is not used as pass/fail evidence.
The receiver may normalize images; export equality is not receiver equality.

Cold-start candidate cleanup was observed only after the restarted Activity
had loaded, not from a pre-onCreate directory listing. The alive export lease
survived; this alone does not establish foreign-process read success.

The existing RECIPIO in this AVD was v6/SQLite v2 and has no image Share Target.
It was not upgraded or used as a P1 receiver. An upgrade would change database
schema and may purge expired records, so no production install was performed.

### Existing receiver environment

AVD `Recipio_Backup_36` was started only after the capture AVD closed and a
fresh guard found 5,360,120 KiB free with no other emulator. Installed RECIPIO
was verified as code 19 / 0.9.1-logo-refresh; device base.apk SHA-256:
`e0a4257ce46bddac8bed015f03ae7e81392f10388b44fee8afc0a3085f98e18d`.
SQLite was read with `sqlite3 -readonly`: user_version 4; counts in the order
recipes/ingredients/steps/preparations/key_tips/changes/restore_state/cooking:
`2 / 2 / 2 / 0 / 0 / 0 / 0 / 0`.
Pre-receiver database SHA-256:
`ea35172a4946271f6a28b1062a20cda0a62682f6d2ece8dda5b3afaaadaabdcf`.
No RECIPIO install, migration, recipe save, Key setup or AI request was performed.
The original density override 210 was restored after the temporary 240-density
test. This owned emulator was then closed normally, with no wipe.

The second actual full capture also stopped automatically with 117 frames and
0 black/uniform flags. Review started with six suggestions. The first two
selected images were deliberately swapped (00:38 before 00:02), then sent
through the real system chooser to the already installed RECIPIO.
Actual Android WebView inspection showed six loaded JPEGs, each 540x1200,
labelled screenshot 1 through screenshot 6. The receiver's JPEG normalization
changed byte hashes as expected; byte equality was **not** required or claimed.
To verify content order, a 32x48 RGB grid from each Probe export was compared
against **all six** receiver images in DOM order. Every unique closest match
was the same index (1→1 through 6→6); paired mean channel errors were
1.04, 1.05, 1.05, 1.01, 1.11, 1.15 / 255. This is generated-image identity/order
evidence, not OCR or semantic cooking-step validation. A one-pixel color
comparison alone is not used to establish image identity.

After force-stopping/restarting Probe, candidates were empty and the six-image
lease remained. All six images still loaded in RECIPIO. This verifies the
observed asynchronous native receiving and post-restart state, not hypothetical
reads delayed for hours. The user-facing Return → Abandon action discarded only
this known generated intake. A subsequent short capture (16 frames, user_stop)
was reduced to one selection and shared using ACTION_SEND/system chooser.
RECIPIO displayed one loaded 540x1200 screenshot. It too was explicitly abandoned.
Neither flow started AI or saved a Recipe.

A final fresh-consent session was force-stopped while projection was active.
Projection changed from active to null, the Probe service was absent, and restart
showed 0 candidates/no review while preserving both unexpired share leases.
Explicit Delete then removed those generated leases. RECIPIO ai-import and
share-inbox were empty after its generated sessions had been abandoned.

Final readonly database checks: same SHA-256 as before receiving, SQLite v4,
same eight counts `2 / 2 / 2 / 0 / 0 / 0 / 0 / 0`; foreign_key_check empty,
integrity_check `ok`. No database or production media cleanup was executed.

## Handoff limits and automation

Scoped queued Android checks are delivered. No production or experiment App
code changed, so frozen APKs and the existing fresh 63-JVM/build evidence remain
applicable to the identical implementation; they were not rerun or recounted
as new Android tests. The 13 native runtime checks above are new evidence.

Not run: physical-phone/platform P1 quality, actual calls/notification-arrival
interruptions, prolonged memory-pressure reclamation and hours-delayed external
URI reading. Rotation and switching to Probe/system notification shade were
observed; these do not prove all possible interruptions. No new SDK, phone,
platform app, real AI, production build, release, deployment or main merge.
Local generated screenshots/JPEGs and emulator logs stay ignored and are not
submitted. Earlier tooling quoting/array-shape errors were corrected; they do
not constitute product defects or passing checks.

`p1-android` is PAUSED after this scoped handoff; no unattended loop continues
into user quality assessment. Overall P1 remains VIDEO_P1_PENDING_DEVICE_TEST.

## Platform quality (user only)

Douyin: NOT_TESTED; Xiaohongshu: NOT_TESTED; Bilibili: NOT_TESTED for **P1**.
P0's user visual PASS does not establish P1 sampling or recipe quality. Do not
call real AI or select platform content automatically to complete this table.
