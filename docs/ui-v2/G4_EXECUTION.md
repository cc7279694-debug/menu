# G4 execution ledger — 2026-10-24

Approved plan: user's “G3 冻结登记 + G4 最终综合验收” sections0–15.
Spec authority: `RECIPIO_UI_V2_SPEC.md`24–27 and V01–P01 matrix.
This is an execution/evidence ledger, not new product planning.

## Task contract / sequence

- Goal: register accepted G3; collect fresh G4-A engineering/data, G4-B Android,
  G4-C visual/accessibility/performance, G4-D final evidence and ordinary push.
- Scope: existing feature branch/worktree, test/evidence tools, reports; minimal
  TDD UI repair only if a reproducible product defect appears.
- Frozen: G32080f86/sourcee182a72, main649804a, SQLite4/Preview7/Backup2,
  services/Provider/key/SSRF/Native/media/restore, Logo and3themes.
- Out of scope: new feature/design, paid AI, phone ADB, other projects, main/tag/
  deploy/video, dependency or SDK installations, personal-data replacement.
- Accept: evidence matches V01–P01; required device/IME/TalkBack/performance
  missing =>PENDING_DEVICE_TEST, never compiler/browser=>device PASS.
- Verification: one final full JS/TS run includes Native subset (not twice-counted),
  type/lint/build/isolation/sync/JVM/lint/debug/testAPK, browser and owned-device
  checks where safe, exact unchanged candidate metadata, final Git equality.

## Pre-flight / rulings

- Clean entry2080f86, fetched feature matches, main649804a, ancestry verified.
  Existing linked worktree reused. Frozen v23 SHA matches522a943f…f58.
- Initial memory3.753GiB<4GiB; no emulator process; unreadable ADB PID14196
  left alone. No Android/device operation. One bounded gate after host checks;
  no automatic queue or other-process shutdown.
- Ruling: no extra baseline full-suite run or dependency install; this is existing
  validated workspace and the user asks for one fresh final G4 regression.
- Ruling: reuse committed existing QA harnesses with controlled Fake ports;
  Browser plugin absent, installed Playwright available, no new browser install.
  Device performance/TalkBack cannot be inferred from browser/fake evidence.
- Pre-flight interfaces: engineering rebuilt web assets must byte-match the
  accepted v23 before reuse; browser fixtures stay outside production graph;
  Android data preservation governs any device installation/testing.

## Progress

- G3 acceptance registered from user's formal decision; six checks not individually
  invented. No G3 historic failure/NOT_RUN overwritten.
- G4-A/B/C/D pending execution; do not read this ledger as a PASS report.
