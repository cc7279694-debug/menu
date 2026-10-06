# Current State

## Current stage

2026-10-06 — User accepted APK-6 RC2, frozen at
`880b0e8e7b75793f5439103a70b1faa4dfa3c35a`. This is user-reported phone/Provider
evidence, not a new Codex AI call. The subsequent authorized task integrates the
already approved Logo into that feature lineage on `feat/recipio-logo-integration`.
Implementation, resource/build/signing and narrow emulator checks passed.
Status: **RECIPIO_LOGO_REFRESH_PENDING_DEVICE_TEST**.

Stable local/remote main remains `8b2246dbfac674aa837cb25675893fbbef2d79c5` /
`v0.8.0-share-intake`. APK-6 main promotion and release tagging are deferred while
this newer visual deliverable awaits separate acceptance. Frozen APK-6/Logo
branches and all historical delivery files remain intact. No merge, tag, deploy
or next product module.

## Verified delta

- Exact approved1254×1254 PNG preserved; header, Launcher/Round/Adaptive,
  backgrounds,11existing splash images and legacy Web/PWA brand assets replaced.
  No redraw, recolor, crop, header layout change or ordinary UI icon replacement.
- Source +32derived byte checks passed (old header RED → new source-conversion
  GREEN); dark symbol inside the33dp safe zone.
- Packaged27active PNGs match conversion pixels;16JS/CSS and9non-resource DEX
  are byte-identical to accepted v18. Only the remaining183-class AndroidR DEX
  changes for resource IDs. Manifest changes only the two version values.
- Fresh typecheck/lint/local build/Capacitor sync/Android lintDebug and
  assembleDebug/signature/package checks passed. Web lint:0errors/5existing
  warnings; Android lint:0errors/38warnings. Existing large-chunk warning remains.
- Actual v18 SHA/name checked before install-r to v19. After an observed SystemUI
  ANR and one inherited hierarchy-reader failure, both retained, the fresh
  continuation passed6checks against the independent already-proven v18
  preservation reference:8tables,2generated recipes,1current/history/retained
  image, schema4/integrity/FK unchanged. No data clear, downgrade or SQL mutation.
- Flight-mode cold startup, exact new40px header, local detail and second startup
  passed. Actual Launcher and stable Recents system task icon were visually
  checked. Device network settings1/0/0 unchanged. Observed connected WebView
  external requests0; real AI calls0. No phone or other project environment used.
- SQLite4 /Preview7 /Backup2, business logic, Native plugins, AI safety, keys,
  dependencies and permissions are unchanged. Bounded secret-format scans0;
  credentials/private snapshots are not included in Git.

## Delivery and evidence

`artifacts/recipio-logo-integration-v19-debug.apk`, package `app.recipio.local`,
versionCode19 / `0.9.1-logo-refresh`, **17,238,136bytes**.
SHA-256: `e0a4257ce46bddac8bed015f03ae7e81392f10388b44fee8afc0a3085f98e18d`.
Same debug signature as v18; unique file, no prior delivery overwritten.

Evidence: `checkpoints/2026-10-06-logo-integration.md`, `brand-assets.md` and
ignored `artifacts/logo-integration/`. Historical RC2 full-suite/Provider evidence
stays in its original checkpoints; it is not relabeled as fresh Logo testing.
Full business/connected suites and real Provider smoke were intentionally not
rerun for the visual-only scope. Splash pixels are verified; its transient
onscreen display was not independently photographed.

## Next task / limits

User covers v18 with this v19 APK and checks home, Launcher and Recents branding.
Do not uninstall or clear local data. Physical/OEM/theme-mask acceptance remains
unverified. After that acceptance and explicit main authorization, use a promotion
target that retains both accepted APK-6 and this Logo integration; silently
promoting only the old880b0e8 would lose the Logo again.

Inherited SystemUI/low-memory emulator instability and legacy lint warnings are
documented; no production defect is inferred from the test-environment ANR.
Do not enter video or any next module.
