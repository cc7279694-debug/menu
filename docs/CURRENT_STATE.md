# Current State

## Current stage

2026-10-24 — **UI_V2_G2_ANDROID_READY_FOR_REVIEW** on
`feat/recipio-ui-v2-glass-minimal`, linked worktree `recipe-step-app-ui-v2`.
The approved targeted Android supplement A–E has passed; independent
ChatGPT/user G2 acceptance is still pending. No G3/G4 authorization.

G1 `9a17b1c` remains **UI_V2_G1_VISUAL_ACCEPTED — PASS WITH NOTES**.
Stable main remains `649804a8209413f9d682f1079a4fd19ea84cd064`,
release `v0.9.1-logo-refresh`; no merge, tag or deployment.

## Verified G2 scope

- Real local Home/Library/search/Detail/Editor/Focus/Guided/Completion/
  CookingHistory/ChangeHistory use accepted shared Warm Ivory presentation.
  Creation order/search/100-offset pagination, save/dirty/busy/uncertain gates,
  five-second undo, scroll return and explicit idempotent completion retained.
- Android supplement uncovered a real minified-CSS cooking displacement.
  One DialogContent className override removes inherited centering classes.
  Compiled regression RED→GREEN16 layouts; final APK actual panel(0,0)/360×734
  and touch-reachable controls verified. No second cooking/IME state machine.
- Fresh full198files/1079unit tests PASS; production browser11 groups PASS;
  compiled layouts16PASS; typecheck PASS; lint0errors/5 legacy warnings;
  local build, Capacitor sync, assembleDebug and APK signature/assets PASS.
- Dedicated Recipio_Backup_36 Android16/API36: preserving v19→originalv21→fixedv21,
  SQLite4/integrityOK/FK0, all8table data/IDs/times/order/image bytes retained.
  Actual IME-first Back, native leave dialog/picker cancel, search/filter/return,
  cooking/history, airplane cold start and Backup open/cancel PASS.
- All pre-existing data protected regardless of uncertain provenance; mutations
  only on new generated G2 fixtures. No uninstall/data clear/downgrade.
  No real AI/web/Finder request. Network/IME preferences restored.
- Dedicated emulator normally closed after completion; no other project,
  physical phone or existing host ADB server operated. No SDK install/polling.

## Candidate / evidence

Final fixed candidate:
`artifacts/recipio-ui-v2-g2-v21-layout-fix-debug.apk`,17,307,188bytes.
SHA-256 `ae343d4222c06dcb699fff5158d5f7171e86a26d4b338c967f331a6ec3e815e9`.
Package `app.recipio.local`,code21/name`0.10.0-ui-v2-g2-rc1`.
Original c2c770… v21 retained unchanged but superseded as review candidate.
See `ui-v2/G2_ANDROID_SUPPLEMENT.md` and `ui-v2/evidence/g2-android/`.

## Protected boundaries / limits

SQLite4 /Preview7 /Backup2, RecipeLibrary/Repository, media references, Native
IME/KeyStore, Provider/Finder/SSRF/Share/restore contracts and Logo unchanged.
No dependencies/permissions/fonts/production media/theme persistence/timers added.
G3 renderers and guarded entry/return unchanged. Raw safety copies ignored.

JVM188, Android lint0errors/38warnings and G1 themes41×3 are historical, not
newly rerun in this UI-only supplement. Full connected suite, physical/OEM,
TalkBack and destructive restore not run this task. Existing build/test warnings
remain documented. Browser evidence is not Native/device evidence.

## Next task

Stop for independent G2 review; do not replace this with self-acceptance or
start G3/G4/video. See `ui-v2/G2_EXECUTION.md`, historical `G2_CHECKPOINT.md`,
`G2_VERIFICATION.md`, current `G2_ANDROID_SUPPLEMENT.md` and evidence.

Local production preview http://127.0.0.1:5184/; compiled preview5186.
G1 http://127.0.0.1:5182/ui-v2-showcase/?theme=warm-ivory remains isolated.
Pure Glass /Soft Sage still non-persistent showcase candidates, not settings.
