# Video P1 execution ledger

Authority: user-approved Video P1 contract (2026-10-11).
Base: P0 `ddcfef3f19cfe47976efa09a9a0197d733d3875e`; stable main
`649804a8209413f9d682f1079a4fd19ea84cd064`. Both fetched and verified.

## Contract

Independent captureprobe upgrade: consented visual capture → bounded candidate
JPEGs → deterministic six time-bucket suggestions → editable 1–6 selection →
user-initiated FileProvider share to existing RECIPIO image Intake. No AI,
INTERNET, production changes, audio, video download or main merge.

## Continuity

P0 user phone evidence: control picture/audio PASS; Douyin/XHS/Bili picture PASS,
audio FAIL. Classification VIDEO_P0_PARTIAL_CAPTURE, only this phone/samples.
This is user evidence, not Codex-executed verification. P0 REPORT remains historical.
Root CURRENT_STATE predates approved promotion; fetched refs govern this isolated
experiment. No production document rewrite is authorized here.

## Tasks

1. Pure sampling, frame scoring/recommendation and ordered selection (RED→GREEN).
2. Bounded private JPEG storage, selected export leases and read-only sharing
   (RED→GREEN), retain live leases across cold starts.
3. Reuse consent/service lifecycle for ≤120s visual-only capture and review UI.
4. Six-step controlled source and Android boundary checks; no platform automation.
5. Fresh full experiment tests/lint/build/signature/security checks, independent
   final review, report and focused commit/push. Stop for user phone quality tests.

## Pre-flight interfaces

- Sampling consumes the existing single session authority; configurable lifecycle
  duration leaves all P0 default tests and token/stop semantics intact.
- Candidate files are private. Only selected export copies enter FileProvider.
- Receiver already accepts JPEG ≤2048px / ≤1MiB, 1–6 images, deferred AI.
- Cache cleanup must retain export copies for asynchronous receiver reads.

## Rulings

- Work in the requested experiment branch/current checkout, not a new worktree:
  clean baseline plus isolated directory protects production; cost if wrong is
  possible concurrent checkout interference, checked before commits.
- Keep P0 core/tests/report and remove audio only from P1 executable wiring:
  preserves historical evidence without requesting unnecessary permission.
- No other project's running emulator is used. Android runtime checks are pending
  if no safe RECIPIO-owned device is available; a successful JVM/build is not proof.
- Exact adjacent-pixel deduplication is intentionally conservative, preserving
  small subtitle changes; this is not perceptual or semantic keyframe detection.
- Candidate writes reserve 6 MiB + 1 KiB for export and count earlier live leases.
  Six-hour export leases survive cold start; explicit deletion is user-controlled.
- User explicitly requested queued Android checks after Lithic. Its task finished
  and device closed, but pre-launch free memory was 1,959,368 KiB. Safety guard
  prevented emulator launch; no other process/device was stopped or modified.
  Heartbeat `p1-android` checks readiness every 15 minutes; unchanged state quiet.
  Stop that heartbeat after this scoped Android stage, then wait for user quality
  results. This is not authorization for real AI or formal video development.

## Evidence / progress

- Tasks 1–4 implementation complete; scoped Android runtime/controlled integration
  delivered on 2026-10-11. User physical-phone six-sample quality is pending.
- TDD policy run: 48 tests / 10 failures from expected policy stubs.
- TDD storage run: storage stub failures reproduced before implementation.
- TDD source: 3 tests / 2 failures reproduced missing scene behavior.
- Review regression RED: 60 tests / 2 failures, showing exhausted export space
  and partial encoder payload still available. Both fixed; measured sharpness
  regression also added. No failed test deleted or safety boundary weakened.
- Final fresh experiment run `--rerun-tasks`: 63 JVM tests (Probe 60 + Source 3),
  0 failures/errors/skips, lint 0 errors / 12 warnings, three APK builds PASS,
  all 124 Gradle tasks executed. Exact command and warning disposition in report.
- Delivery signature/alignment/hash/compiled Manifest checks PASS; P0 certificate
  matches, P0 artifact hashes unchanged. Actual covering install subsequently PASS.
- Independent SOL read-only review: one Important fixed, one Minor test improved,
  conservative exact-dedup limitation documented; Android/platform judgments
  explicitly declined without runtime evidence. No production change/AI call.
- Queued Android handoff: frozen implementation `6a71feaa1394e0900e991bcdc6eae19d0e8a3973`
  unchanged; fresh 13/13 Android runtime PASS on owned API36 AVD; controlled
  single-app capture (117 frames/auto_stop_120s), manual/system/process stop,
  rotation, 0/1/6/7 selection boundaries, editable review, native one/six sharing
  to existing v19, decoded-image order and cold lease/cache checks PASS for
  observed cases. v6 capture AVD was not upgraded. v19 receiver database retained
  exact original hash, schema4/eight counts and readonly integrity PASS.
  Test sessions were abandoned without Recipe save/AI, generated caches deleted,
  temporary environment settings restored and owned AVDs closed. No production
  App code changed; 63 JVM/build evidence is retained, not newly rerun.
- The queue heartbeat is PAUSED at this scoped handoff. Next: user six-sample quality
  assessment only. `VIDEO_P1_PENDING_DEVICE_TEST`. Exact limits and commands in
  P1_ANDROID_VERIFICATION; no phone/platform testing or usefulness claim by Codex.
