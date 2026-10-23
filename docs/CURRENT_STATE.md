# Current State

## Current stage

2026-10-23 — UI V2 G1 second-round theme/material refinement is the current authorized work, on the independent
`feat/recipio-ui-v2-glass-minimal` worktree. The base was freshly verified as
local/remote main `649804a8209413f9d682f1079a4fd19ea84cd064`, tree
`2d1993bcab8dbb59c540b8225d51259562ad0316`, release `v0.9.1-logo-refresh`.
This supersedes the old main-promotion-pending documentation; it does not
turn any historical NOT_RUN phone/OEM test into a Codex PASS.

The user-provided `ui-v2/RECIPIO_UI_V2_SPEC.md` and `ui-v2/EXECUTION.md` are the
current design/execution authority, supplemented by the approved second-round
`ui-v2/THEME_REFRESH_EXECUTION.md` and current inline brief. Only tokens, component states and the
Home → Detail → Guided/Focus **DEV-only showcase** are authorized now.
Production UI/data/Native/Provider remain unchanged. No APK is required at G1.

Delivery gate: **UI_V2_THEME_REFRESH_READY_FOR_REVIEW**, not ACCEPTED/FROZEN.
Three same-layout skins (Warm Ivory / Pure Glass / Soft Sage), explicitly themed
Portals/cooking, live memory-only theme selection, stronger CSS glass controls
over actual content and shared rhythm refinements are implemented. The component
confirmation's initial/return focus uses Base UI after a RED→GREEN regression.
Fresh browser41×3 and theme/material71 checks PASS;33 sample DOM tests PASS;
native TypeScript71 files/474 PASS (subset); whole repository195 files/1062 PASS.
Typecheck/lint/local build and production graph exclusion PASS;5 legacy lint
warnings and existing chunk warning retained. No browser errors, external/API
requests, persistence writes or database initialization in the browser matrix.

See `ui-v2/THEME_REFRESH_PROGRESS.md`, the three-task second-round plan and
`ui-v2/THEME_REFRESH_VERIFICATION.md` / `ui-v2/THEME_REFRESH_CHECKPOINT.md`.
Original G1 evidence in `G1_VERIFICATION.md` / `CHECKPOINT.md` stays historical;
its1049/461/41 numbers are not this round's verification.
G2–G4 require explicit user approval of the rendered sample; no further product
work, main merge, tag, deployment or video experiment continuation is authorized.

## Delivery / next task

Start `npm run dev:ui-v2` in the UI V2 worktree and open
`http://127.0.0.1:5182/ui-v2-showcase/?theme=warm-ivory`, `?theme=pure-glass` or
`?theme=soft-sage`; “样板设置 → 外观主题” also switches the live skin. Nine actual
screen captures, component/Sheet and glass/solid comparisons are in
`ui-v2/evidence/theme-refresh/`. Fixtures, image previews,
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
