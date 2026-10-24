# Current State

## Current stage

2026-10-24 — **UI V2 G3-1 / G3-2 / G3-3 in progress**, on
`feat/recipio-ui-v2-glass-minimal`, linked worktree `recipe-step-app-ui-v2`.
G3-0 `6cc631af1888270f508e12d0ba69ce76b462a220` is now user/ChatGPT
**ACCEPTED / FROZEN — PASS WITH NOTES**, on the exact v22 candidate. User phone
acceptance and retained NOT_RUN notes are recorded in
`ui-v2/G3_FOUNDATION_ACCEPTANCE.md`. This is not Codex-run phone evidence.
The new approved task is AI Review, Web Link, Finder/share presentation only.
No G3-0 test rerun just for this documentation registration.

User accepted/froze G2 `9e4bff3596d6efebadf93f6a4778b113efb3272e`
(v21 layout-fix) as **PASS WITH NOTES**. This user phone acceptance is distinct
from historical Codex G2 simulator evidence. G2 history remains unchanged.
Stable main remains `649804a8209413f9d682f1079a4fd19ea84cd064`, release
`v0.9.1-logo-refresh`. No merge, tag or deployment.

## Verified G3-0 delta

- Existing Warm Ivory/Pure Glass/Soft Sage selectable in V2 Settings and
  immediately propagated to root, nested nav, existing V2 portals and dark
  Focus/Guided. Only a validated enum persists in `recipio.ui-v2.theme.v1`;
  invalid/unavailable storage safely falls back. No LibraryApp remount.
- Home/Library/Settings share the existing root/nav/safe-area system. Settings
  has its own title, not the old Logo header. Same-root settings visits retain
  search/filter/page; changing root retains first-page behavior. AI/Link/Finder
  key-settings return/draft ownership and hidden root-nav behavior retained.
- Settings uses flat solid groups: appearance → data/backup → AI → about.
  Original BackupControls/AiSettings and important local-data/privacy/unencrypted
  backup warnings retained; their confirmation portals opt into current theme.
- Finder shortcut has a1px boundary, quiet solid surface and press state in
  all three themes, without new/automatic network requests.
- Fresh full199files/1095tests PASS; targeted48 is a subset. Compiled browser
  8groups/18settings layouts, cooking16layouts and mocked-port rendered settings
  dialogs9checks PASS. Typecheck, lint0errors/5existing warnings, local build,
  isolation302modules, Capacitor sync, assembleDebug, signing/15assets PASS.

## Candidate / evidence

`artifacts/recipio-ui-v2-g3-v22-debug.apk`,17,459,114bytes.
SHA-256 `9c477c7322b750099bed70b1c83fff6920d5aadd99416ecf6249011bfc0db84b`.
Package `app.recipio.local`,code22/name`0.10.0-ui-v2-g3-rc1`, same debug
certificate as accepted v21. Build supplies non-secret VITE_RECIPIO_VERSION
alongside matching Gradle flags; unlabelled dev builds explicitly say 开发预览.
See `ui-v2/G3_FOUNDATION_VERIFICATION.md`, `G3_FOUNDATION_CHECKPOINT.md` and
`ui-v2/evidence/g3-foundation/` (seven actual controlled browser screenshots).

## Boundaries / limitations

SQLite4/Preview7/Backup2, repositories/media references, Native key/IME/Provider/
SSRF/share/restore contracts and Logo unchanged. Theme is not a backup field.
No dependencies, permissions, private media, real AI or network smoke added.
G1 showcase/test fixtures excluded from the production graph.

G3 preserving v21→v22 install/data/image verification, Android restart/theme,
native IME/Back and cooking navigation are **NOT_RUN**. JVM/connected suites
were not rerun; earlier counts are historical. Browser/fake-port evidence is
not Android/Native evidence. Existing test/build warnings are documented.

## Next task / stop

Implement G3-1 AI input/review/recovery → G3-2 Web Link → G3-3 Finder/share,
using existing services and theme scopes. Each module gets targeted tests and
a focused commit; one fresh full final regression/build and one v23 candidate.
Only safe owned-device Android smoke; no other project/phone operations or
automatic queue. Stop for independent review; no G4/video/main/tag/deployment.

This task's local ports5184/5186 were stopped after screenshot checks. To preview:
`npm.cmd run dev:local -- --host 127.0.0.1 --port 5184 --strictPort`.
The separate G1 showcase remains isolated and was not stopped/repurposed.
