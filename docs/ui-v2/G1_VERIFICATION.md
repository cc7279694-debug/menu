# UI V2 G0/G1 verification — 2026-10-23

Scope: isolated interactive sample, **not** production UI acceptance or Android
validation. Authority: [specification](RECIPIO_UI_V2_SPEC.md) and
[execution contract](EXECUTION.md). Concept A is fixed; G2–G4 remain gated.

## Implementation and reproducibility

- Base: `649804a8209413f9d682f1079a4fd19ea84cd064`,
  tree `2d1993bcab8dbb59c540b8225d51259562ad0316`.
- Branch: `feat/recipio-ui-v2-glass-minimal`; independent sibling worktree.
- Start `npm run dev:ui-v2`, then open
  `http://127.0.0.1:5182/ui-v2-showcase/`. This serves localhost only.
- Query examples: `?screen=detail`, `?screen=cooking&mode=focus`,
  `?screen=components`, `?screen=detail&scenario=title-only`.
- “样板设置” changes the in-memory screen/scenario, 200% root font (16→32px),
  or solid-glass fallback. Refresh resets the sample; nothing is persisted.
- Four approved synthetic food photos, 1000×750 WebP, 487,062 bytes total.
  Provenance: `src/native/ui-v2/showcase/assets/README.md`. They are neither
  user media nor verified recipe information, and never enter the recipe store.
- Existing installed HR design/router and UI/UX playbooks supplied the component
  contract and validation gates. Existing React/Base UI/Lucide behavior reused;
  no dependency/lockfile/Skill installation, Compose rewrite or Logo redesign.

## Actual verification

| Check | Final result |
| --- | --- |
| New real DOM tests | 20 PASS; included in both regression suites below |
| Whole-repository Vitest | PASS:194 files /1049 tests,535.88s |
| Native TypeScript test subset | PASS:70 files /461 tests,158.70s; not Android instrumentation |
| Typecheck | PASS, exit0 |
| Whole-repository ESLint | PASS, 0 errors /5 existing legacy Next image warnings |
| Normal `build:local` | PASS; existing >500kB chunk warning retained |
| Normal production build module inspection | PASS:281 rendered modules,0 UI V2 modules,0 fixture photo assets; write:false |
| Isolated showcase production build guard | PASS: expected rejection, not a successful demo build |
| Browser | **41 PASS**, bundled Playwright/Chromium151.0.7922.34 |
| Browser persistence/network | IndexedDB0, localStorage0, sessionStorage0, cookies0, external requests0; relevant console/page errors0 |

Commands actually used:

```text
npm test -- --maxWorkers=1 --no-file-parallelism
npm run test:apk -- --maxWorkers=1 --no-file-parallelism
npm run typecheck
npm run lint
npm run build:local
node scripts/verify-ui-v2-isolation.mjs
node_modules\.bin\vite.cmd build --config vite.ui-v2.config.mts
node scripts/verify-ui-v2.mjs --runtime=C:\Users\CDD\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules
```

The Browser plugin/skill was unavailable; the existing bundled browser runtime
was used without downloading packages or browsers. The guard command must fail
with the explicit DEV-only error. Vitest's existing CommonJS/native-loader future
warning was retained rather than hidden. Whole-suite counts must not be added
to their native subset or the20 new tests.

### Browser matrix and evidence

[Exact41-check record](evidence/browser-results.json). The three screens were
checked at320/390/412/768 widths, height844. Additional320 cases cover no-image,
name-only, empty library, broken-cover fallback, long title/steps and 200% root text. Root-font scaling
is not a claim of Android system font/IME validation.

The combined320px +200% cases scroll the actual content's final character into
view, read the complete long ingredient amount/last row, reach/activate the
last Add Sheet choice, navigate Guided to its final explicit completion, and
check unclipped48px-minimum footer targets. Reduced-motion and solid fallback
retain navigation. Both detail and cooking step photos open local previews,
close safely, restore focus and keep the same step/content.

Base UI modal focus may briefly pass through its own adjacent hidden focus
guard. The initial new test incorrectly sampled that transient as a leak.
Read-only diagnosis saw guard→popup recovery and no background control focus.
The repaired test only tolerates that exact adjacent library guard while
waiting for the DOM condition; other outside focus fails immediately. No UI
delay, debounce, focus-trap replacement or IME state machine was introduced.

### Contrast calculations

Relative-luminance calculation of the final CSS tokens (not accessibility
certification): body/canvas15.65:1, secondary/surface5.14:1,
caption/surface4.93:1, white/primary6.22:1, control-outline/surface3.38:1,
warning/surface5.33:1, error/surface5.23:1, cooking text/deep solid15.07:1.
Dark focus token `#D0DDCD` gives11.17:1 on `#202420` and8.25:1 on toolbar
`#353A34`; actual keyboard-focus outlines in cooking and portalled Sheet were
also checked in the41-check run. Primary button fill stays `#49684F`.

## Rendered comparison with Concept A

The reference and actual final screenshots were opened for visual inspection.
This is Codex implementation comparison, **not** the user's aesthetic approval.

| Reference relationship | Implemented sample / deliberate specification mapping |
| --- | --- |
| Warm off-white, graphite text, quiet green | Exact specified canvas/surface/action tokens; no gradients, wallpaper or decorative glow |
| Brand, search, two entry cards, recent strip | Same hierarchy; existing Logo retained. “最近查看” becomes creation-ordered “最近加入”, not new tracking |
| Rounded translucent root controls | Three existing destinations in a floating light control layer, not five new business tabs or a false center-tab |
| Large food cover and raised content panel | Actual local demo photo at4:3,24px panel radius with12px overlap. No-image and name-only views have no empty hero |
| Editorial detail, ingredient and full-step sections | Existing fields only; full steps default, no fake tags, favorites, scaling or ingredient completion state |
| Immersive cooking image and large type | Fixed deep solid under important text; actual demo step photo lower down, read-only ingredient Sheet, no timer |
| Quiet shape/spacing/icon language | 18px inputs/buttons,24px content shapes,28px Sheet/nav; Lucide controls,48px touch baseline; 200% wraps rather than clipping |

Six selected actual screenshots are under `evidence/`: home/detail/cooking390,
name-only detail320, long detail200%320 and component states390. Other generated
screenshots/logs remain ignored under `output/playwright/ui-v2/`. No whole-repo
ZIP, private media or duplicate APK was made.

## Review repairs and protected boundaries

- Real DOM RED→GREEN:14 initial tests, two empty-step/focus-return regressions,
  one single-main-landmark regression, then two failing step-photo preview
  cases. Final suite contains20 tests, including the no-image action guard.
- Read-only engineering self-review found missing detail step photos/preview,
  low dark-focus contrast and overbroad200% evidence wording. These were fixed
  only in the isolated sample/test script; expanded browser evidence now passes.
- Existing NativeApp/normal entry, shared Web primitives, Repository, SQLite
  schema4, Preview7, Backup2, AI/Link/Finder/Share services, key storage,
  Android Manifest/permissions/version/signature and Logo resources unchanged.
- No private data/service initialization, real AI/Provider call, data write,
  Android build, main merge, tag, force push, deployment or video work.

## NOT_RUN / next gate

Android builds/instrumentation, IME/Back, TalkBack, phone/OEM, offline cold start,
cover-install/media retention, real database/backup transactions and same-device
baseline-vs-V2 performance are **NOT_RUN** at G1. They belong to later authorized
production integration/final validation, not this browser demonstration.
Whole-product absence of regressions is not inferred from the showcase.

Wait for the user's three-screen visual approval. Do not label UI V2 ACCEPTED,
replace the production default, or proceed with G2–G4 automatically.
