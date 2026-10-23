# G2 verification — current candidate

Scope: accepted G1 shared presentation in real production Home/Library/Detail/
Editor/Focus/Guided/Completion/CookingHistory/RecipeChangeHistory. G3 renderers
and all storage/Native/Provider contracts remain unchanged.

## Evidence boundary

Browser evidence uses a new ephemeral Playwright context at127.0.0.1:5184.
The real PreviewRecipeLibrary and local media service create103 controlled
recipes and a clearly labelled non-food image test pattern. No G1 demo asset,
private photograph, real API Key or external Provider is used. Test records are
not a production seed/fallback; no production page imports the verification tool.

`scripts/verify-ui-v2-production.mjs` freshly passed11 grouped browser checks:
empty library; real100/offset pagination; local name/ingredient search and filter;
list return scroll; full content/local image/Focus; three short detail subroute
returns; Guided read-only sheet/native event/explicit completion; detail end
clearance at320/390/412/768 and100/200% text; long name-only/Add Sheet; existing
AI/Link/Finder/settings entry/guarded return; home/editor/cooking/sheet200% and
solid material; reload persistence. Errors0, external requests0.

Root Back events in a desktop browser verify JS route ownership only. They do
not prove Android IME-first Back, TalkBack, picker grants, native SQLite or OEM.

## Red to green / actual issues fixed

- Before integration: production behavior8 cases =7PASS/1RED for lost list scroll.
- Detail/viewer new contract3RED on old rendering, then3PASS.
- Short detail subroutes: history, changes and edit-cancel each observed RED at
  expected780 /actual0; minimal existing-route restoration repairs the loss.
- Actual browser exposed a second layout case: async local images/overview
  clamped restored1329 to1045. ResizeObserver reapplies on real layout growth
  only until the first new user interaction; no timer/debounce.
- Actual Chromium window-target Back invoked the earlier Root listener before
  the Sheet despite capture=true (jsdom standalone did not expose this). Root
  now defers to a mounted V2 Sheet without consuming its event. Browser first
  Back closes only ingredients; Guided step remains; completion stays explicit.
- Source-only review found omitted G1 row/recent-title class hooks; actual Home
  capture confirmed inline metadata, then existing G1 class hooks repaired it.
- One browser harness needed existing G3 discard confirmations; they were not
  removed or bypassed. At text/viewport resize, clearance is checked after an
  actual user scroll reaches the real document end, not a transient old height.

Initial/final command logs are retained under output/playwright/ui-v2/g2.
Raw output is ignored; final compact evidence is copied into this docs tree.

## Final checks

- Full JS/TS:198 files /1079 tests PASS, exit0,490.92s. This includes the491
  src/native cases and16 new G2 cases; subsets are not added to the total.
- Typecheck PASS. Lint PASS with0 errors and5 pre-existing legacy Next image
  warnings; no new G2 lint warning.
- build:local PASS; existing500kB chunk threshold warning retained, not hidden.
- Production graph PASS:300 modules,6 sharedV2 modules,0 showcase modules,
  0 fixture assets. This is the fresh GREEN for the initial RED guard.
- sync:android PASS. Capacitor regenerated junction-resolved local paths;
  restored the original portable node_modules paths, with no Android source
  diff or dependency change. Both point to the same installed dependencies.
- Java unit tests:22 suites /188 tests /0 failures/errors. Android lint PASS,
  0 errors/38 warnings in unchanged native/dependency/resource files; no fresh
  baseline warning-count comparison claimed. Existing flatDir/SDK XML metadata/
  unchecked/SQLCipher-strip notes retained. No unrelated dependency/Native fix.
- :app:assembleDebug PASS; final combined Gradle run1m37s,51 executed/162
  up-to-date tasks. The app JVM188 explicitly reran with its task --rerun flag.
  Internal v21 /0.10.0-ui-v2-g2-rc1. v2 signature verified, certificate matches
  accepted v19. All15 packaged public files match final web-build SHA-256.
  No showcase/fixture asset in APK. See evidence/g2/apk-metadata.json.
- Device gate: NOT_RUN. After the build free RAM was about2.9–3.0GiB, below
  the conservative4GiB headroom for the existing2GB RECIPIO AVD plus host.
  No emulator started, no SDK installed, physical phone untouched.

The first whole run was stopped after two old Home-copy selectors failed. Only
their page-ready selectors were updated to the new Home landmark; all share,
key-failure, request-count and persistence assertions remain. The final complete
1079-test run above supersedes that failed partial run, not a sum of reruns.
Intermediate v20 was retained without overwrite after actual47px Home controls
were found. The48px override, stronger real-image/DB checks and final source
ad4df5a were then fully reverified;450.29s/old APK are not final v21 evidence.

## Android and safety

No phone operations are authorized. A physical phone was seen in read-only
host inventory; no device command, installation or data operation targeted it.
No emulator is currently running. Free RAM is below the safe headroom for the
existing RECIPIO2GB AVD; device installation/IME/Back/offline/upgrade NOT_RUN.
No SDK installed, no other project/device/process stopped or changed.

SQLite4 /Preview7 /Backup2 and LocalMediaLifecycle remain unchanged. No native
source, Android permissions, KeyStore, Provider, URL safety or Share contract
changes. No new dependency/font/image/Logo. AI calls0. No main/tag/deploy action.

## Deliberate visual boundaries

Production uses document scroll, real bounded rows, Android-safe local images
and the actual Editor/History fields. It has no showcase toolbar/theme switcher.
Warm Ivory is the G2 integration skin, not a persisted final theme preference.
Existing native/browser dirty/delete confirmations keep their original owners;
replacing their lifecycle with a new confirmation state machine is out of scope.
G3 pages intentionally retain their previous styling until separately approved.
Controlled image pattern screenshots prove layout/media loading, not food-photo
art direction. No claim of visual acceptance, final performance or G4 completion.

## Stopping gate

**UI_V2_G2_PENDING_ANDROID_TEST** — core integration, automation, build and internal
APK complete. Dedicated Android smoke remains unverified due safe-memory gate.
ChatGPT/user independent acceptance pending. Do not merge, deploy or enter G3.
See the checkpoint, gallery, engineering notes and compact command receipts.
