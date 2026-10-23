# Current State

## Current stage

2026-10-23 — UI V2 G2 Production Core UI Integration is implemented and handed
off as **UI_V2_G2_PENDING_ANDROID_TEST** on `feat/recipio-ui-v2-glass-minimal`, linked worktree
`recipe-step-app-ui-v2`. User approved G1 `9a17b1c` as
**UI_V2_G1_VISUAL_ACCEPTED — PASS WITH NOTES**. This explicitly supersedes the
old pending G1 gate; it is not acceptance of the new G2 implementation.

Stable main remains `649804a8209413f9d682f1079a4fd19ea84cd064`,
release `v0.9.1-logo-refresh`. No merge, tag, deployment or video work authorized.

## Implemented / verified delta

- Core Home/Library/search/Detail/Editor/Focus/Guided/Completion/CookingHistory/
  ChangeHistory use shared accepted Warm Ivory presentation and real local data.
- 125 unchanged G1 layout lines are shared; production-only CSS adapts document
  scrolling/forms and measured floating controls. No shipped fixture/demo UI.
- Existing local100/offset search/filter/order, media, save/dirty/busy/uncertain,
  five-second undo and explicit idempotent cooking semantics retained.
- List and short detail subroute return positions restored; asynchronous local
  media/summary layout changes handled without a guessed delay. User interaction
  immediately returns control of scrolling. Mounted sheets consume their own
  Back without also leaving the parent page.
- Fresh production browser11 grouped checks PASS; original G1 showcase41 checks
  per theme PASS. Real desktop browser evidence is not Android/IME evidence.
- Typecheck PASS; lint0 errors/5 existing legacy Next image warnings. Local
  build and Capacitor sync PASS. Production graph300 modules/sharedV2=6,
  showcase=0/fixtures=0. Final whole suite198 files/1079 PASS (491 native TS/JS
  subset,16 new G2 cases); Java188 rerun PASS. Android lint0 errors/38 warnings
  in unchanged native/dependency/resource code. Final v21 APK built and signed;
  all15 packaged public assets match the final web build. Sourcead4df5a,
  version0.10.0-ui-v2-g2-rc1; see metadata for bytes/hash/certificate.

## Protected boundaries

SQLite4 /Preview7 /Backup2, RecipeLibrary/Repository, Native IME/KeyStore,
Provider/Finder/SSRF/Share/restore contracts and existing Logo remain unchanged.
No AI calls, dependency/font/media generation for production, theme persistence
or second cooking state machine. G3 AI/Link/Finder/Backup/settings retain their
existing renderers and guarded entry/return. No feature expansion.

## Environment / unverified

A physical phone is connected but untouched. No emulator currently running;
available RAM is below safe headroom for the existing RECIPIO2GB AVD. Native
device installation/IME/Back/offline/cover-upgrade are NOT_RUN. Final free RAM
was about2.7GiB, below the4GiB headroom for a2GB AVD plus host. No other project's
device/process/data operated and no SDK installed.

## Delivery / next task

Stop for ChatGPT/user independent review and safely available dedicated Android
smoke; do not enter G3/G4. See `ui-v2/G2_EXECUTION.md`, `G2_CHECKPOINT.md`,
`G2_VERIFICATION.md`, `G2_ACCEPTANCE_MATRIX.md` and `G2_GALLERY.md`.

Production preview: http://127.0.0.1:5184/ (fresh origin starts empty).
G1 remains http://127.0.0.1:5182/ui-v2-showcase/?theme=warm-ivory.
Pure Glass and Soft Sage are still non-persistent showcase candidates, not
product settings. Historical G1/APK test counts remain in their checkpoints;
none are reused as this candidate's final pass count.
