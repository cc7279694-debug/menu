# G3-0 foundation verification — 2026-10-24

**UI_V2_G3_FOUNDATION_PENDING_ANDROID**

Branch `feat/recipio-ui-v2-glass-minimal`, implementation base
`9e4bff3596d6efebadf93f6a4778b113efb3272e`. G2 was accepted/frozen by the
user on v21 layout-fix, PASS WITH NOTES; this is new G3 work. Stable main
`649804a8209413f9d682f1079a4fd19ea84cd064` is untouched.

## Scope delivered

- One enum preference hook, existing V2 context and root shell; no App key,
  reload or duplicated theme state. Only `recipio.ui-v2.theme.v1` persists.
  Invalid/storage-denied values cannot block local work. Not part of Backup2.
- Home/Library/Settings share navigation/material/background/safe-area. Settings
  title replaces its legacy Header. Same-root returns preserve query/filter/page;
  intentional different-root navigation retains page0. Editor/AI/Link/Finder
  drafts and explicit settings-return callbacks remain with existing owners.
- Theme explicitly applied to nav's own token scope, V2 Sheets, dark cooking
  outer/inner surfaces, existing key/restore confirmation portals. No new palette.
- Flat Settings groups preserve privacy/unencrypted-backup text, original
  BackupControls/AiSettings and actions. Finder shortcut now has a1px complete
  boundary, quiet solid surface, press feedback; click does not search the web.

Production files: `library-app.tsx`, `step-viewer.tsx`, `ui-v2/appearance.tsx`,
`ui-v2/production.css`, new `ui-v2/theme-preference.ts`/`settings-screen.tsx`,
and appearance-only opt-in props/portal attributes in `ai/ai-settings.tsx` and
`backup/backup-controls.tsx`. No deletion of product files.

Tests/tools: `ui-v2/theme-foundation.test.tsx`, foundation/dialog browser scripts,
isolated `scripts/fixtures/ui-v2-settings.tsx` and an extended production isolation
guard. The fixture contains generated data and fake non-network ports only.
Docs: current state/roadmap/decision, execution/checkpoint/this report and evidence.

## Fresh final-source checks

All rows below were actually run on the delivered production sources, before
the delivery commit; only documentation/evidence changed after verification.
Source blob fingerprints are recorded
in `evidence/g3-foundation/apk-metadata.json`. No production edit after APK build.

| Check | Actual result |
| --- | --- |
| Full `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=dot` | **199files /1095tests PASS**,0 failed/skipped,920.80s; started15:23:59 CST |
| Targeted foundation + G2 + existing key/backup tests |5files /48PASS,24.38s;16new foundation cases; subset of1095 |
| `npm.cmd run typecheck` |PASS |
| `npm.cmd run lint` |PASS,0errors/5existing Next img warnings |
| `VITE_RECIPIO_VERSION=0.10.0-ui-v2-g3-rc1 npm.cmd run build:local` |PASS; existing large-chunk warning |
| `node scripts/verify-ui-v2-isolation.mjs` |PASS,302production modules/8shared V2,0showcase/0fixture imports/assets; write:false |
| Compiled foundation browser |8groups PASS,18settings layouts;3themes×320/390/412×100/200% text, solid fallback; actual computed root/nav/Finder/portal/cooking and persistence checks;0runtime errors/0external requests |
| Compiled Focus/Guided browser |16layouts PASS,320/390/412/768×100/200%; accepted G2 position fix retained;0runtime errors/0external requests |
| Rendered Settings dialogs |9checks PASS,3themes×delete-key/preflight/replace-confirm at320px/200%;0mocked key writes/exports/imports/restores; **fake ports, NOT Native evidence** |
| Capacitor sync |PASS; generated environment-specific paths restored to portable originals; no tracked Android source/config change |
| Gradle `:app:assembleDebug --no-daemon --max-workers=1` |PASS,1m29s,113tasks(21executed/92up-to-date); explicitcode22/name flags |
| APK signature, version,15built Web assets byte/hash comparison |PASS; same debug certificate as accepted v21 |
| Read-only final source review |No remaining identified blocker; local agent review, not independent ChatGPT acceptance |

Browser scripts use the installed Playwright runtime via `--runtime=...`.
Foundation/cooking use freshly built preview5186; dialog fixtures use dev5184.
Both temporary servers were stopped after verification. No dependency install.
Raw command logs remain in ignored `output/playwright/ui-v2/`; compact results
and screenshots are committed in `evidence/g3-foundation/`.

### RED→GREEN evidence

Consumer initial13cases:12FAIL/1PASS before implementation. Actual Finder border
was transparent. Missing-image surface RGB was still legacy warm. Review found
unthemed key/restore portals (2RED), then page100 leaking from Library/Settings
to Home (1RED). Corresponding production fixes now pass the16consumer cases,
real computed-style checks and final full suite. Superseded full runs stopped
after source changes do not count as final PASS evidence.

Existing test output includes mocked Provider failures, IndexedDB cleanup
diagnostics, jsdom scrollTo diagnostics and older unawaited assertions; final
runner exit0. Build retains existing chunk/Gradle configuration warnings.
These were not hidden or relabelled as new functional failures.

## Android runtime — NOT_RUN

Final environment gate2026-10-24T07:39:39Z, after tests finished:
**3.408GiB free < approved4GiB**,0running emulator processes.
An earlier gate had1.398GiB and two unoperated emulator processes. Dedicated
Recipio_Backup_36 registration exists, but registration alone is not permission
to touch another active device. No emulator launched, no ADB/device interaction,
no physical phone connected/operated, no other project process stopped.

| Requested Android smoke | Result |
| --- | --- |
| Preserving v21→v22 install; recipes/IDs/images retained |NOT_RUN |
| Home→Library→Settings→Home; current themes and return |NOT_RUN |
| Theme cold restart/persistence; cooking open/return |NOT_RUN |
| Real Android IME / Back |NOT_RUN |

These remain required before G3-0 Android acceptance. Browser reload is not
Android cold-start evidence. No fresh JVM/native/connected suite; prior G2
device/JVM counts remain historical. No user data/database/image was read,
changed, cleared, uninstalled or copied in this G3 task.

## APK

- Absolute path: `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2\artifacts\recipio-ui-v2-g3-v22-debug.apk`
- Bytes: **17,459,114**
- SHA-256: **9c477c7322b750099bed70b1c83fff6920d5aadd99416ecf6249011bfc0db84b**
- Package: `app.recipio.local`; code**22**, name**0.10.0-ui-v2-g3-rc1**; min24/target36.
- Certificate SHA-256: `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
- Kept outside Git under ignored artifacts; no signing key/private media committed.
- VITE_RECIPIO_VERSION supplied with matching Gradle version flags. Dev builds
  lacking that non-secret display metadata say 开发预览 rather than inventing a version.

## Actual browser screenshots

Controlled fresh browser profile only; generated recipe, no private content.

| Theme | Home390 | Settings390 |
| --- | --- | --- |
| Warm Ivory |[Home](evidence/g3-foundation/warm-ivory-home-390.png) |[Settings](evidence/g3-foundation/warm-ivory-settings-390.png) |
| Pure Glass |[Home](evidence/g3-foundation/pure-glass-home-390.png) |[Settings](evidence/g3-foundation/pure-glass-settings-390.png) |
| Soft Sage |[Home](evidence/g3-foundation/soft-sage-home-390.png) |[Settings](evidence/g3-foundation/soft-sage-settings-390.png) |

[Warm Ivory Finder shortcut crop](evidence/g3-foundation/warm-ivory-finder-entry-390.png).
Screens inspected visually; they are not generated design mockups or Android images.

## Safety / handoff

SQLite4/Preview7/Backup2, repositories/media/Native/key/provider/SSRF/share and
backup transaction contracts unchanged. Theme is the only new persisted value.
No secrets, raw Provider responses, private media, DB snapshots, dependency,
permission or Logo changes. **Real AI calls0**. No new web search/AI request.
Normal feature commit/push only; no main merge/tag/deploy. G2 frozen history kept.

The commit containing this report is the final source delivery. Final SHA and
remote/clean-tree verification are reported after push rather than embedded
as a circular self-reference. Stop; only pending approved G3-0 Android supplement
may resume when safe. Remaining G3/G4/video need separate authorization/review.
