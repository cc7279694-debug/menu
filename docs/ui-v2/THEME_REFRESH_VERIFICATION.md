# UI V2 G1 — second-round theme and material verification

This is an isolated showcase refinement, not production integration or visual
acceptance. It follows `THEME_REFRESH_EXECUTION.md` and the current inline brief.
Starting feature commit: `c956e59bc791ed1ea728f2af4092c19e38902eca`.
Stable main remains `649804a8209413f9d682f1079a4fd19ea84cd064`.

## Three skins, one structure

The original page hierarchy, three destinations, fixtures and interaction owners
are shared. Theme selectors assign semantic variables only. Theme selection is
held in React memory, never localStorage/IndexedDB/SQLite. The query initializes
the theme once; changing it in the live settings Sheet does not reload the page.
Unknown theme values use Warm Ivory.

| Token | Warm Ivory / 米色 | Pure Glass / 白色 | Soft Sage / 淡绿色 |
| --- | --- | --- | --- |
| canvas | #F6F4EF | #F7F9FB | #EFF5EE |
| surface | #FBFAF7 | #FFFFFF | #FAFCF9 |
| muted | #F0ECE5 | #EEF2F5 | #E3EDE2 |
| text | #1B1B1D | #171B20 | #1B2820 |
| secondary | #6E6A65 | #59616A | #56695C |
| caption | #716D65 | #626B75 | #5B6C60 |
| action | #49684F | #2D6266 | #365E45 |
| pressed | #3C5742 | #214B4F | #274A34 |
| soft | #E6EFE5 | #E4EFF0 | #DCE9DB |
| border | #DEDAD3 | #DEE5E9 | #CFDCCF |
| control | #858A82 | #7C8993 | #788F7B |
| cooking | #202420 | #19242A | #1D2B22 |

Success `#49684F/#E6EFE5`, warning `#815A23/#F7EEDD` and error
`#A2433D/#F8E9E7` stay common. Changing the theme action color never changes
the meaning or palette of success/error/uncertainty status.

## Material / typography changes

| Material | Warm Ivory | Pure Glass | Soft Sage |
| --- | --- | --- | --- |
| light navigation tint | rgba(251,250,247,.74) | rgba(255,255,255,.70) | rgba(248,252,247,.74) |
| light Sheet tint | rgba(251,250,247,.88) | rgba(255,255,255,.86) | rgba(248,252,247,.88) |
| backdrop blur / saturation | 24px / 120% | 26px / 125% | 24px / 120% |

Dark cooking uses the corresponding deep tint with the same opacity. A fine
highlight rim, lower edge and restrained shared shadow expose control boundaries.
Home header/search form one sticky control layer; floating navigation, detail
actions and cooking actions overlap actual scrolling content. Search has a
high-opacity inner shield, and Sheet contents use a solid inner surface so body
text does not rely on the picture underneath. Any open Sheet suspends background
control blur. There is no gradient wallpaper, refraction dependency, animation
loop or glass list-card stack. This is CSS frosted glass, not a claim of native
Apple optical Liquid Glass.

Same shared spacing/type refinements across themes: 32px section rhythm; 24px
detail body start; slightly tighter title tracking; cooking title weight600 and
instruction line-height1.7. Main content stays solid; only the control layers
change material. A ResizeObserver measures control height for scroll clearance,
including enlarged text. Base UI still owns focus, dismissal and modality.

## RED to GREEN and implementation repairs

- New theme suite first failed11 cases against G1 while20 existing cases passed.
  It covers initialization, live Portal appearance, DOM identity and state
  preservation, explicit completion/review and no Provider/storage writes.
- The new material Sheet consumer had a separate failing test before wiring.
  A safe-confirmation regression then failed before its focus repair. Latest
  targeted result:33/33, two files,12.39s (13 new cases plus20 existing).
- Browser no-overflow assertions exposed the new implicit grid column's
  min-content expansion (390px viewport became680px). Explicit
  `minmax(0,1fr)` fixes the track rather than hiding horizontal overflow.
- The all-Portal material check caught detail's small photo controls continuing
  to blur behind a Sheet; the common modal pause selector now covers them too.
- QA correction: a portalled Sheet must not have the underlying cooking footer
  subtracted from its own visible region. Detail/cooking still subtract their
  actual overlapping controls. Focus return waits for Base UI's actual cleanup
  condition, not an arbitrary sleep/debounce.
- A distinct real confirmation issue was reproduced: React `autoFocus` moved
  focus before Base UI captured the invoking button, returning to an earlier
  Sheet trigger after Escape. Use the installed Popup `initialFocus` ref instead;
  safe cancel remains initially focused and Base UI owns return focus. No
  programmatic focus repair, global trap, delay or new state machine was added.
- A new source fingerprint records raw-file SHA-256 for all sample and QA inputs
  before/after browser runs. `revision` is the baseline HEAD while R2 is dirty,
  not a claim that the old G1 commit contains R2. Final evidence must match the
  committed file fingerprint; documentation-only additions do not alter it.

## Fresh final verification

| Check | Actual new result |
| --- | --- |
| Whole repository |195 files /1062 tests PASS;502.60s |
| Native TypeScript subset |71 files /474 tests PASS;168.57s; not Android/JVM tests |
| Targeted sample suite |2 files /33 tests PASS;12.39s; included in the above suites |
| Typecheck |PASS |
| ESLint |PASS,0 errors;5 unchanged legacy image warnings |
| Normal local production build |PASS; existing >500kB chunk warning retained |
| Production graph isolation |PASS;281 modules inspected,0 UI V2 modules,0 fixture assets; write:false |
| Attempted showcase build |Expected DEV-only rejection, verified error category |
| Original browser matrix |41 checks ×3 themes PASS; not123 unique scenarios |
| Additional theme/material browser matrix |71 checks PASS |
| Engineering review |READY FOR VISUAL REVIEW; no unresolved Critical/Important; not aesthetic acceptance |

Installed Chromium151.0.7922.34 / Playwright1.62.1, Windows loopback Vite server.
No packages/browsers were downloaded. The Browser plugin/skill was unavailable;
the existing installed Playwright fallback was used. Whole/native/targeted
counts overlap and must not be added. Original G1 numbers remain historical.

Commands actually run (PowerShell uses `.cmd` wrappers):

```text
npm test -- --maxWorkers=1 --no-file-parallelism
npm run test:apk -- --maxWorkers=1 --no-file-parallelism
npm run typecheck
npm run lint
npm run build:local
node scripts/verify-ui-v2-isolation.mjs
node_modules\.bin\vite.cmd build --config vite.ui-v2.config.mts
node scripts/verify-ui-v2.mjs --theme=<each-theme> --runtime=<installed-runtime>
node scripts/verify-ui-v2-themes.mjs --runtime=<installed-runtime>
```

The showcase build is intentionally prohibited. `test:apk` is the repository's
native **TypeScript** subset command, not an APK build or Android instrumentation.
Vitest's pre-existing CommonJS/native-loader future warning remains visible.

### Browser geometry, state and composite evidence

The71-check record and three41-check records live under
`evidence/theme-refresh/`. All36 combinations of theme×screen×width
(320/390/412/768, height844) have the same measured layout and no horizontal
overflow. Additional320px/200% cases verify full long final lines, amounts,
last ingredient, reachable controls and safe close; no-image/name-only content
is still complete. Settings, ingredients, cover/step images, actions and danger
confirmation use explicitly themed Portal roots. Hot theme changes preserve
query/filter/selected recipe, Guided step/completion, input/review confirmation
and the live settings dialog's DOM/focus. Reduced motion removes actual running
animations/transitions. Solid mode has opaque controls and no active blur.

Every visited document was audited before leaving it: storage writes0,
IndexedDB opens/deletes0, databases0, cookies0, business/API requests0,
external requests0 and relevant runtime/console errors0 in the final run.

Each theme has five real-photo overlap/scroll samples: Home header/navigation,
detail footer, cooking footer and component material sample. Pixel changes
accompany actual content scrolling under the same translucent control; no fake
glass screenshot or flat-background-only evidence. Cooking photo/footer overlap
is65.69px. Navigation glass-vs-solid mean channel difference is1.75/1.91/2.80
for warm/white/sage. These are renderer-specific material evidence, not perceptual
quality scores or device-performance measurements.

Actual local text/tint pairs are measured with their alpha composited against
both black and white extrema; the lowest tested text ratio is5.14:1. Dark
keyboard focus outlines separately retain≥3:1 in each original matrix. This
checks the named local pairs, not every pixel or complete WCAG compliance.

All four successful browser runs have the same28-input source fingerprint:
`59c62730ceaa6fe6b285e77cff0eea70ca2afb00b2f24e6903c01b8f8178ccd5`.
The JSON explicitly records `dirtyAtRun:true` and baseline G1 HEAD. Those input
files are checked again at delivery; the fingerprint is not a whole-repo hash.

### Actual screenshots / comparison

| Theme | Home | Detail | Cooking |
| --- | --- | --- | --- |
| 米色 |[Home](evidence/theme-refresh/warm-ivory/home-390.png)|[Detail](evidence/theme-refresh/warm-ivory/detail-390.png)|[Cooking](evidence/theme-refresh/warm-ivory/cooking-390.png)|
| 白色 |[Home](evidence/theme-refresh/pure-glass/home-390.png)|[Detail](evidence/theme-refresh/pure-glass/detail-390.png)|[Cooking](evidence/theme-refresh/pure-glass/cooking-390.png)|
| 淡绿色 |[Home](evidence/theme-refresh/soft-sage/home-390.png)|[Detail](evidence/theme-refresh/soft-sage/detail-390.png)|[Cooking](evidence/theme-refresh/soft-sage/cooking-390.png)|

Each theme folder also contains component states, Add Sheet, ingredient Sheet,
danger Dialog, and the same-state Home glass/solid pair. All27 PNGs are actual
browser captures of the existing synthetic demo fixtures, not private media.
The selected evidence is3.63MB including seven JSON records; the rest of the
captures/logs stay ignored under `output/playwright/ui-v2/theme-refresh/`.

Concept A, prior G1 and all nine new screens were opened for Codex comparison:

| Relationship | Prior G1 → second refinement |
| --- | --- |
| Color atmosphere |Warm only → warm/white/sage skins with identical geometry; the new frozen table supersedes earlier palette suggestions |
| Brand and hierarchy |Existing Logo, search, two entrances, recent strip and library retained; no five-tab/new feature interpretation of Concept A |
| Header/search |Flat sibling controls → one sticky translucent layer with shielded search; photo scroll proves its material |
| Bottom navigation |Largely flat canvas behind controls → floating glass over real scrolling content, measured final-line clearance |
| Editorial detail |Same cover/content overlap and full steps; slightly more title/meta/section breathing room, inset floating actions |
| Cooking focus |Same solid deep reading surface and large text; calmer weight/leading, bounded420px photo frame exposes real footer glass; full photo still opens |
| Sheets |Theme-correct tinted outer control layer, solid readable body, one shared focus/dismissal mechanism |
| Deliberate omissions |No reference-image timer, notification, extra tabs, favorites, scaling or ingredient completion state; frozen business semantics win |

This is implementation self-inspection. User/ChatGPT independent visual approval
is still required. No claim of aesthetic acceptance is made.

## Preview

Run `npm run dev:ui-v2` in the UI V2 worktree. Existing loopback server:
`http://127.0.0.1:5182/ui-v2-showcase/`.

- `?theme=warm-ivory`
- `?theme=pure-glass`
- `?theme=soft-sage`

Combine with `&screen=detail`, `&screen=cooking&mode=focus` or
`&screen=components`. “样板设置 → 外观主题” changes the live skin; “实体玻璃回退”
compares the same layout with an opaque material. Refresh resets in-memory work.
The component page has an independently scrollable real-photo material sample.

## Protected boundaries / NOT_RUN

No production app page, Native bridge, Manifest, permissions, Provider request,
AI/Link/Finder/Share flow, Logo, version, dependency or lockfile changed.
SQLite4 / Preview7 / Backup2 remain frozen. No private recipe/media accessed,
new image generation, real AI, Android operation, main merge/tag or deployment.

Android WebView/IME/Back/TalkBack, physical phone/OEM, unsupported-browser
rendering and same-device performance are NOT_RUN. Browser enlarged text is not
Android system font testing. This is not a full accessibility certification.
User/ChatGPT aesthetic approval remains pending; do not proceed to G2–G4.
