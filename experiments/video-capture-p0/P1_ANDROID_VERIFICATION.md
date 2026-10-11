# Video P1 Android verification checkpoint

## Scheduling and ownership

User instruction (2026-10-11): queue RECIPIO runtime checks until Lithic finishes;
do not pause, stop or use its emulator. Observed device `emulator-5580` belongs
to AVD `Lithic_M01_API_36`; a reused serial is not RECIPIO ownership evidence.
No phone was connected during initial preflight.

Later readiness snapshot: Lithic thread completed/idle and `adb devices` empty;
no emulator process remained. Launch guard then saw 1,959,368 KiB free and
refused to run Start-Process. No RECIPIO emulator was launched. Thread heartbeat
`p1-android` now queues a readiness recheck every 15 minutes, with no unchanged
notifications. Stop the heartbeat after the scoped Android handoff is delivered.

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

Current runtime result: **NOT RUN — queued**. Compilation/build is not Android
runtime verification. This suite is not projection consent or cross-process
RECIPIO receiving evidence.

Run on the explicitly verified RECIPIO device with its serial selected; capture
the complete instrumentation exit/status result. Do not run device-agnostic
connected tests while another project's device is connected.

## Controlled Android integration checklist

| Check | Result | Evidence source |
|---|---|---|
| P0 → P1 same-package/signature covering install | NOT RUN | |
| Fresh consent / refusal / one token | NOT RUN | |
| Single-app projection / six-scene ordered candidates | NOT RUN | |
| 120-second automatic stop / candidate cap | NOT RUN | |
| User and system stop / repeated sessions | NOT RUN | |
| Window resize / rotation / stale-reader release | NOT RUN | |
| Process termination / cold candidate cleanup | NOT RUN | |
| Suggested six / actual preview, replace, order / reject seventh | NOT RUN | |
| Share one and six JPEGs → existing RECIPIO, order preserved | NOT RUN | |
| Cross-process grants / async read / live lease after Probe restart | NOT RUN | |
| No automatic AI request | NOT RUN | |
| Explicit cleanup / bounded storage / no leftover service | NOT RUN | |

Record exact device/Android build, artifact SHA, commands and result, and distinguish
Codex-generated-source checks from user physical-phone/platform evidence. If UI
consent or integration cannot be safely automated, leave it NOT RUN and provide
P1_INSTRUCTIONS for user verification rather than substituting mock evidence.

## Platform quality (user only)

Douyin: NOT_TESTED; Xiaohongshu: NOT_TESTED; Bilibili: NOT_TESTED for **P1**.
P0's user visual PASS does not establish P1 sampling or recipe quality. Do not
call real AI or select platform content automatically to complete this table.
