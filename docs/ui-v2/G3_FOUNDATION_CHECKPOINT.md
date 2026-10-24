# UI V2 G3-0 checkpoint — 2026-10-24

Status: **UI_V2_G3_FOUNDATION_PENDING_ANDROID**. Implementation/build/browser
verification complete; Android runtime NOT_RUN because safe-memory gate failed.
User accepted/froze G2 9e4bff3596d6efebadf93f6a4778b113efb3272e (v21 layout-fix)
as PASS WITH NOTES. This is a new G3 commit, not a rewrite of that history.

## Delivered scope

- Warm Ivory/Pure Glass/Soft Sage use unchanged G1 tokens. Only the enum in
  `recipio.ui-v2.theme.v1` persists; blocked storage falls back/in-memory switches.
- Home/Library/Settings share the existing root/navigation and measured safe-area
  clearance. No copied navigation or old brand header on Settings. Same-root
  settings returns preserve query/filter/page; intentional root switches retain
  the prior first-page behavior. Editor and AI/key-settings drafts stay owned by
  their existing components/services; appearance never keys/remounts LibraryApp.
- Current theme explicitly reaches nested nav, existing portals, Focus/Guided
  and opt-in key/restore confirmation dialogs. Cooking remains dark/read-only
  until explicit completion; settings controls retain their service owners.
- Settings order: appearance → local data/backup → AI → about/version. Important
  local-data/privacy/unencrypted-backup warnings retained. Cards flattened into
  solid groups and dividers; no accounts/cloud/timer/provider functionality added.
- Finder gets a1px token boundary/quiet surface/press state, no new request.

## Verification already executed

- Consumer RED12 failures on missing themes/shell; Finder transparent-boundary
  RED; placeholder RGB-token RED; key/restore portal2RED; page100-to-Home RED.
- Final targeted5files/48PASS includes16 new foundation cases and existing
  G2/key/backup behavior, not a second additive whole-suite total.
- Final compiled browser8groups/18settings layouts, cooking16layouts, actual
  rendered confirmation dialogs9checks at320px/200% text PASS. Dialog ports are
  fake/non-network; these are browser evidence, never Android claims.
- Final whole-suite199files/1095tests PASS,920.80s, zero failed/skipped; targeted48
  is a subset, not an additive total. Typecheck/lint0errors5existing Next img
  warnings PASS. Build/sync/assembleDebug PASS; code22/name0.10.0-ui-v2-g3-rc1,
  signature and15packaged assets verified. Production graph302modules excludes
  G1 showcase and experimental fixtures. Local source review has no remaining
  identified blocker; it is not ChatGPT independent acceptance.
- Android runtime NOT_RUN. After tests finished,2026-10-24T07:39:39Z free RAM
  3.408GiB<4GiB, zero running emulator processes. Earlier gate1.398GiB with two
  unoperated emulator processes also failed. No launch/ADB/phone/process shutdown.
  Preserving upgrade/data/images/theme restart/Android IME-Back remain pending.
  JVM/connected suites not rerun; no historical count reused as fresh evidence.

## Candidate

`artifacts/recipio-ui-v2-g3-v22-debug.apk`,17,459,114bytes.
SHA-256 `9c477c7322b750099bed70b1c83fff6920d5aadd99416ecf6249011bfc0db84b`.
Package app.recipio.local; min24/target36; accepted debug signing certificate
`29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
Version text comes from VITE_RECIPIO_VERSION supplied with the Gradle version
flags; builds without that non-secret metadata explicitly say 开发预览.

## Frozen boundaries / stop

SQLite4/Preview7/Backup2, repository/media/Native/key/provider/SSRF/share/restore
transactions unchanged. Theme is NOT a .recipio backup field. No dependency,
permission, logo or production media change;0real AI. Test fixture stays out of
production graph. No main merge/tag/deployment, no G3 intake/finder redesign.
Stop for ChatGPT/user review after this foundation handoff.

## Continuation

Use `G3_FOUNDATION_VERIFICATION.md` and evidence in `evidence/g3-foundation/`.
Only resume the approved G3-0 Android smoke on a safe, explicitly owned RECIPIO
device. Do not clear data or start the remaining G3/G4/video work. Candidate is
not yet Android accepted. Final commit is the commit containing this checkpoint;
feature push/remote identity is reported in the handoff, not self-embedded here.
