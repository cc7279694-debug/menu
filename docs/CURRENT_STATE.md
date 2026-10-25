# Current State

## Current stage

2026-10-25 — G3 remains **ACCEPTED / FROZEN — PASS WITH NOTES**.
G4 is **UI_V2_G4_PENDING_DEVICE_TEST**, including unfinished final host
regression/build. This does not mean that only a phone check remains.

Branch: feat/recipio-ui-v2-glass-minimal. Worktree:
E:/CODEX/VIBE CODING/recipe-step-app-ui-v2. Resume entry:
aee5177fa1a03239e56532fe8de4c75b3943ec7f.
Stable main649804a8209413f9d682f1079a4fd19ea84cd064 / v0.9.1-logo-refresh unchanged.
No merge, tag, deploy or new product/video module.

G3 registration0541107 retains the user's/ChatGPT's v23 phone acceptance,
not Codex phone execution. Delivery2080f86/sourcee182a72 and earlier G2/G3-0
freezes/history remain intact. See the existing acceptance records.

## Current source patch

- Three image-placeholder CSS mappings now use existing secondary, fixing actual
  normal-copy contrast4.3739:1. No new palette/layout/Logo.
- Actual Android v24 immediate force-stop lost Pure/Sage. Separate disk
  observation confirmed delayed LevelDB writing (~914ms).
- Source now uses existing Filesystem/Data for one validated theme enum;
  Native write ACK confirms theme. Initial read and serial writes are ordered;
  latest intent owns UI; latest failure returns to last successful ACK.
  Missing can inherit legal legacy cache; malformed existing value→Warm.
  Web keeps localStorage; errors visible; no LibraryApp remount.
- Android ShareTarget test-only obsolete Home readiness selector corrected;
  downstream behavior assertions retained, runtime not yet executed.
- SQLite4/Preview7/Backup2, Key/Provider/SSRF/media/restore contracts,
  permissions and dependencies unchanged. Enum file outside Backup/media.

## Evidence and limits

Current frozen source: **2 focused files /44 tests PASS**,27.30s, with readonly
review of ACK-race repair. Full v25 JS/TS was **ABORTED_RESOURCE** at0.457GiB
free (12:35+08), without a final count; no Vitest remained after own run stopped.
Final post-patch typecheck/lint/build/graph/sync/JVM/Android lint/APKs and
Native105/IME8 are **NOT_RUN**. No v25 APK exists yet.

Earlier v24 passed203files/1133,188JVM and74browser groups; these predate the theme
patch and are not finalv25 results. Detailed evidence and failures:
[G4 resume verification](ui-v2/G4_RESUME_VERIFICATION.md).

Actual owned API36 v21→v24 preserving install passed: all28original recipes,
3images and8table rows/ID/time/order/history preserved. Subsequent controlled
native core smoke preserved every original; added only1generated recipe/image/
record. Navigation/SAF/search/filter/editor discard/Focus/Guided0→1 passed until
the real theme failure. These are v24 simulator facts, not v25/phone evidence.

Open observation: native cover screenshot shows fallback despite a successful
DOM decode check. Actual image presentation is NOT_CONFIRMED; distinguish late
presentation/loading failure in the next safe run, not by assuming screenshot PASS.

## Candidate and next position

Intended code25/name0.10.0-ui-v2-g4-rc2, only after fresh final checks.
Immutable v24 is diagnostic history; v23 retained. Actual TalkBack and valid P01
comparison remain NOT_RUN. TalkBack installed/not enabled; signed pre-V2 v19 is
available, but TTID/CDP-ready/rAF proxies do not prove all P01 requirements.

Resume [G4 checkpoint](ui-v2/G4_CHECKPOINT.md), not product development/replanning.
Keep host checks serial, emulator gate>=4GiB plus live ownership. Old5580 belongs
to VPN; owned5582 emulator now stopped. Restore original Warm preference after
next safe validation (RCA left legal Pure cache); protect original rows/media.

No other project/phone/process operations, SDK/new AVD, background queue,
paid AI, main/tag/deploy or next module. Dev/preview5184/5186 stopped; unrelated
showcase5182 untouched. Await safe resources/user continuation.
