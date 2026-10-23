# Current State

## Current stage

2026-10-23 — UI V2 G1 third-round final targeted polish is the current authorized work, on the independent
`feat/recipio-ui-v2-glass-minimal` worktree. The base was freshly verified as
local/remote main `649804a8209413f9d682f1079a4fd19ea84cd064`, tree
`2d1993bcab8dbb59c540b8225d51259562ad0316`, release `v0.9.1-logo-refresh`.
This supersedes the old main-promotion-pending documentation; it does not
turn any historical NOT_RUN phone/OEM test into a Codex PASS.

The user-provided `ui-v2/RECIPIO_UI_V2_SPEC.md` and `ui-v2/EXECUTION.md` are the
current design/execution authority, supplemented by the approved second-round
`ui-v2/THEME_REFRESH_EXECUTION.md` and current third-round inline brief. Only tokens, component states and the
Home → Detail → Guided/Focus **DEV-only showcase** are authorized now.
Production UI/data/Native/Provider remain unchanged. No APK is required at G1.

Delivery gate: **UI_V2_G1_FINAL_POLISH_READY_FOR_REVIEW**, not ACCEPTED/FROZEN.
Three same-layout skins (Warm Ivory / Pure Glass / Soft Sage), themed Portals,
memory-only theme selection and fixed deep cooking surface remain. The current
polish makes Home controls137px rather than163px, recent content113.09px earlier,
Detail hierarchy tighter and floating bars lighter. Generic cooking labels are
secondary to actual instructions. Cover4:3 framing/bytes and business meanings
are unchanged; high-contrast Edit/Previous text repairs the final review finding.
Fresh sample DOM34/34, browser41×3, theme/material74 and paired43 checks PASS.
Typecheck/lint/local build/production exclusion PASS, retaining5 legacy image
warnings and the existing chunk warning. Final whole suite196 files/1063 PASS
in932.71s, exit0. First run's worker-start error is retained as failure history;
its isolated recheck9 PASS is not a substitute for the final whole run. No browser errors,
external/API requests, persistence writes or database initialization observed.

See `ui-v2/FINAL_POLISH_PROGRESS.md`, `ui-v2/FINAL_POLISH_VERIFICATION.md`,
`ui-v2/FINAL_POLISH_CHECKPOINT.md` and `ui-v2/FINAL_POLISH_GALLERY.md`.
Original G1 and R2 theme-refresh records stay historical; their1049/461/41 and
1062/474/71 numbers are not this round's verification.
G2–G4 require explicit user approval of the rendered sample; no further product
work, main merge, tag, deployment or video experiment continuation is authorized.

## Delivery / next task

Start `npm run dev:ui-v2` in the UI V2 worktree and open
`http://127.0.0.1:5182/ui-v2-showcase/?theme=warm-ivory`, `?theme=pure-glass` or
`?theme=soft-sage`; “样板设置 → 外观主题” also switches the live skin. Nine actual
new screen captures and their nine same-state before counterparts are in
`ui-v2/evidence/final-polish/`, together with source/geometry/material records.
Warm Ivory is recommended for preview only, not an accepted product default.
Fixtures, image previews,
search and navigation use memory only. Formal editing/saving/AI/settings are
intentionally not connected at G1. Existing production entry remains unchanged.

Wait for the user's visual approval; do not replace default UI or start G2.
No G1 APK, version/signature change, main promotion or production release.

## Protected state / unverified areas

SQLite4 /Preview7 /Backup2, Repository/Native/Provider/key contracts, existing
business flows and Logo resources remain unchanged. No private data accessed,
no real AI/Provider calls and no other project's Android environment operated.

Android/IME/TalkBack/OEM, phone, offline cold start/cover install/data retention,
real backup transactions and same-device performance comparison are NOT_RUN in
G1. Historical APK-6/Logo evidence remains in its original checkpoints, notably
`checkpoints/2026-10-06-logo-integration.md` and `verification/find-recipe-rc2*.md`.
Its phone/OEM/short-lived splash limitations are not upgraded to PASS here.
