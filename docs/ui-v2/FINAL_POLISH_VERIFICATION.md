# UI V2 G1 — third-round final targeted polish

2026-10-23. Scope: the isolated DEV-only showcase, not production integration
or aesthetic acceptance. Starting clean local/remote feature revision:
`3b120bee4581a0d08be217605b577d5c0fa1f57e`. Stable main stays
`649804a8209413f9d682f1079a4fd19ea84cd064`.

## What changed, and what did not

The thick Home control container and equal large shortcut boxes are now a
flatter brand/search layer and two compact, differently weighted actions.
Both original labels, Add choices, search behavior and explicit online intent
remain. Recent content is still ordered by creation date, not viewing history.
The existing three destinations remain Home / Recipes / Settings.

Detail retains the same cover bytes and4:3 framing. Title/meta/ingredients
spacing is tighter; calories remain approximate and readable but smaller than
time/servings. Edit is a restrained transparent action, Start remains primary.
Cooking keeps the fixed deep reading surface and exact original instruction;
the generic step label is quieter, Previous weaker and Next primary. No invented
step title, timer, ingredient state, wake lock or completion automation.

Control borders/padding and common shadow strength are lighter, without extra
blur, opacity changes or gradient effects. Three frozen theme palettes/material
tables are unchanged. All layout changes are shared. Warm Ivory is only the
recommended preview, not an accepted product-default preference.

### Paired actual-browser measurements

All three themes share these390px results; no mockup or regenerated food image.

| Item | Before | After |
| --- | --- | --- |
| Home brand/search control height |163px |137px |
| Shortcut area height |143.09px |72px |
| Recent heading top |421.09px |308px,113.09px earlier |
| Cover height / aspect |292.5px /4:3 |unchanged |
| Detail title top |353.5px |349.5px |
| Detail metadata top |413.48px |401.48px |
| First content section top |489.45px |465.45px |
| Detail / Cooking action bar height |78px |70px |
| Generic cooking label |32px bold |16px normal; instruction stays20px |

The18 paired frames are in `evidence/final-polish/{before,after}/<theme>/`:
`home-390.png`, `detail-390.png`, `cooking-390.png` for warm-ivory,
pure-glass and soft-sage. Each capture uses390×844, DPR1, zh-CN,
Asia/Shanghai, light scheme, reduced motion, fixed fixture time and scroll0.
Cooking is **Guided step3**, reached by explicitly clicking Next twice in both
versions. No Focus-vs-Guided or viewport mismatch is used as a comparison.

## Test-first implementation and review repair

- A new real-DOM shortcut/authorization test first failed because the original
  screen had no labelled compact action group. It then passed with both labels,
  unchanged Add options and zero network calls. Scoped suite:34 tests/3 files.
- Actual-browser RED measurements found the original163px Home controls and
  generic32px label, then GREEN verified the requested density/hierarchy.
- The320px check exposed a4px expansion: the new compound control selector
  outranked the old narrow-width padding override. Matching selector specificity
  fixes the real width; no overflow hiding or breakpoint exemption was added.
- One final read-only engineering review found an Important contrast issue in
  the newly transparent Edit/Previous consumers. A new browser regression first
  failed Warm Edit at2.736:1 against the allowed black-underlay extreme.
  The minimal repair uses the scoped primary text color and weight500 on those
  two secondary actions, retaining transparency and unchanged material tables.
  All six consumers now pass both extrema: Edit worst7.86:1, Previous worst5.63:1.
  The distinction is fill/weight, not illegible alpha. No unresolved review
  Critical/Important remains after this verified repair; review is not user
  approval of appearance or production rollout.

## Fresh verification

Final showcase/QA source fingerprint:
`531adc7b01d9d96df016072ea6a27db4e652cc26d9b326132429aa70546d3a11`.
Before fingerprint:
`59c62730ceaa6fe6b285e77cff0eea70ca2afb00b2f24e6903c01b8f8178ccd5`.
Before app source was clean at3b120be; the new capture script has its own
separate SHA in the baseline record. Final records correctly say dirty against
the starting HEAD, not that3b120be contains this round's changes. Raw-file hashes
are preserved; documentation changes do not alter the tested input fingerprint.

| Check | New actual result |
| --- | --- |
| Whole repository |196 files /1063 tests PASS,932.71s; final single-thread-pool run, exit0 |
| Targeted real-DOM sample suite |34/34,3 files,19.56s fresh final run; overlaps whole suite |
| Original G1 browser matrix |41 checks ×3 themes PASS; not123 unique scenarios |
| Theme/state/material matrix |74 PASS, including3 new footer contrast checks |
| Third-round paired geometry/flows/clearance |43 PASS |
| Typecheck |PASS |
| ESLint |PASS,0 errors,5 unchanged legacy image warnings |
| Local production build |PASS; existing large-chunk warning retained |
| Production graph isolation |PASS:281 modules,0 UI V2 modules,0 fixture assets,write:false |
| Showcase production build |Expected DEV-only rejection, exact safeguard checked |

Commands actually executed from this worktree (PowerShell uses `.cmd`):

```text
npm.cmd test -- --maxWorkers=1 --no-file-parallelism
npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism
node_modules/.bin/vitest.cmd run src/test/database/shopping-list-security.test.ts --maxWorkers=1 --no-file-parallelism
node_modules/.bin/vitest.cmd run src/native/ui-v2/showcase --maxWorkers=1 --no-file-parallelism
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build:local
node scripts/verify-ui-v2-isolation.mjs
node_modules/.bin/vite.cmd build --config vite.ui-v2.config.mts
node scripts/verify-ui-v2.mjs --theme=<each-theme> --out=output/playwright/ui-v2/final-polish --runtime=<installed-runtime>
node scripts/verify-ui-v2-themes.mjs --out=output/playwright/ui-v2/final-polish --runtime=<installed-runtime>
node scripts/verify-ui-v2-polish.mjs --capture-before --runtime=<installed-runtime>
node scripts/verify-ui-v2-polish.mjs --runtime=<installed-runtime>
```

The initial RED runs are retained in ignored output logs (dom-red, layout-red,
contrast-red). They are not claimed as a successful final run. Installed
Playwright1.62.1 / Chromium151.0.7922.34 is used; no package/browser/font download.
The Browser plugin was unavailable, so the existing installed fallback was used.

The first whole-suite invocation ended after1136.29s with195 files/1054 passing
tests and an unhandled worker startup timeout for the unchanged historical
`shopping-list-security.test.ts`. That run is explicitly **not PASS**. No test
assertion was weakened or historical business code changed. The isolated file
recheck passed9/9 in52.66s. The final fresh whole invocation used the supported
single-thread pool, with no concurrent browser jobs, and passed all196 files /
1063 tests in932.71s, exit0 and no unhandled error. The failed first run remains
historical failure evidence, not a replacement for the final full pass. Scoped
counts overlap the whole suite and must not be added to it.

All themes cover320/390/412/768 and320px/200% long content; no-image/title-only,
full ingredient amounts, complete last content, focus/keyboard, reduced motion,
solid material and unsupported-blur fallback remain covered by the existing
matrix. Live theme changes preserve search/filter/selection, Guided step,
completion/review state, component input and Portal DOM/focus. No storage writes,
IndexedDB opens/deletes, cookies, external/API requests or runtime errors were
observed across the audited documents.

The43-check record measures actual end-of-scroll content against the real
overlapping control rectangles, not just scrollHeight. The21 measured end
clearances are at least35.77px. At320px/200%, Home35.77px, Detail44.25px,
Cooking40px. Touch targets stay at least48px. This Chromium uses overlay/no-width
scrollbars; this is not proof of classic OS scrollbar styling. The74-check
matrix retains actual-photo scroll-under/glass-vs-solid material comparisons,
not flat-background screenshots or a claim of native optical Liquid Glass.

## Protected boundaries / not run

No production screen, business logic, data model, Repository, Native bridge,
Provider, AI/Finder/Link/Share flow, Logo or food asset was changed.
SQLite4 /Preview7 /Backup2 are unchanged. No dependencies/version bump,
Capacitor sync, APK, Android/JVM/instrumentation, phone/IME/TalkBack/OEM,
real AI, other emulator operation, deployment, tag, main merge or G2.
Browser results do not substitute for those unrun checks or user visual taste.

The next action is user/ChatGPT visual confirmation of this isolated sample.
Formal RECIPIO entry and the accepted stable main remain unchanged.
