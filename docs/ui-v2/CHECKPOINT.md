# UI V2 G0/G1 checkpoint

Status: **UI_V2_VISUAL_READY_FOR_REVIEW** — awaiting user visual approval,
not ACCEPTED/FROZEN and not full UI V2 completion.

## Current location

- Worktree: `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2`
- Branch: `feat/recipio-ui-v2-glass-minimal`
- Base/stable main: `649804a8209413f9d682f1079a4fd19ea84cd064`
- Base tree: `2d1993bcab8dbb59c540b8225d51259562ad0316`
- Inspect this checkpoint's feature commit with `git log -1 --oneline`.
- Original recipe checkout stays clean on its existing experiment branch;
  this implementation does not descend from or edit the video experiment.

## Built

Imported the full final specification/execution/reference; mapped P01–P12 and
O01–O05. Native-scoped candidate tokens and Base UI presentation wrappers;
component six-state page; same-fixture Home/Library, full Detail, optional
Guided/Focus and readonly ingredient/photo Sheets. Four explicitly authorized
synthetic food photos are local demo-only assets with provenance.

Source: `src/native/ui-v2/`; isolated entry/config:
`ui-v2-showcase/index.html`, `vite.ui-v2.config.mts`.
Only package script addition; dependencies/lockfiles unchanged. Production
native/Next entries and existing shared primitives are not changed.

## Verified on final implementation

194 files/1049 whole-repo tests;70 files/461 native TS tests (subset);
20 new showcase tests included; typecheck, lint, normal local build and
production graph exclusion PASS. Browser41 checks PASS at Chromium151.0.7922.34;
all persistent stores/cookies and remote requests0. Detailed commands,
RED→GREEN repairs, comparison and limits: `G1_VERIFICATION.md`.

## Preview / acceptance request

Run `npm run dev:ui-v2` here. Open
`http://127.0.0.1:5182/ui-v2-showcase/`.
Check the Home → Detail → Cooking flow and component-state page; “样板设置”
provides long/no-image/name-only/broken/empty and large-text/solid options.
Formal actions are clearly demo-only; no real recipe/history writes.

The user should confirm visual hierarchy, warmth/green, shape/spacing and the
dark cooking treatment. Record that approval before starting G2; do not reopen
product/stack/concept choices or move the sample into production by assumption.

## Inherit / do not change

SQLite4 /Preview7 /Backup2, Native key/security/Back, Provider/SSRF/source
validation, media leases/cleanup, uncertain-save logic and Logo remain frozen.
No timers/favorites/scaling/cloud/video/new business state or persistence.
No APK/main/tag/deploy in this phase. Android/IME/TalkBack/phone/OEM/data retention
and same-device performance are NOT_RUN, not inferred from browser tests.

Next only after explicit visual approval: G2 production core presentation
wiring using existing services; G3 and G4 remain as specified, not implemented.
