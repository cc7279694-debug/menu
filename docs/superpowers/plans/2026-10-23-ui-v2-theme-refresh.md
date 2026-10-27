# UI V2 G1 Theme Refresh Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, with test-first changes and one fresh final technical review. This is the already-authorized second G1 refinement, not a new product-planning gate.

**Goal:** Three same-layout theme skins, visible but restrained glass controls, and refined type/spacing in the isolated G1 showcase; stop for user visual review.

**Architecture:** One in-memory appearance context feeds semantic CSS tokens to the showcase, nested cooking root and Base UI portals. Existing screen/component/state owners remain; no theme-based React keys. Control layers overlap actual scrolling content, with measured clearance protecting its last line; content surfaces stay solid.

**Tech Stack:** Existing React/TypeScript/Vite, Base UI/Lucide and scoped CSS. No install, image generation, Provider call, production/Native/database change or APK.

**Spec:** `docs/ui-v2/THEME_REFRESH_EXECUTION.md` (full supplied attachment) plus the user's current inline prompt. Existing UI V2 spec/contract still governs unchanged semantics. The inline final marker `UI_V2_THEME_REFRESH_READY_FOR_REVIEW` takes precedence over the attachment's additional G1 spelling.

## Global Constraints / Task Contract

- Continue `feat/recipio-ui-v2-glass-minimal` from verified `c956e59bc791ed1ea728f2af4092c19e38902eca`; main stays `649804a8209413f9d682f1079a4fd19ea84cd064`.
- Locked: page structure, three destinations, search/filter/recipe/Guided/Focus/completion/overlay behavior, Logo, existing four demo photos, SQLite4/Preview7/Backup2, production isolation.
- Adjustable: semantic colors/materials; shared small spacing/type refinements; control-layer overlap necessary for visible glass. Never three separate page implementations.
- Themes exactly `warm-ivory`, `pure-glass`, `soft-sage`; unknown falls back to warm. URL is initialization only; selection uses memory, not any browser/database storage.
- Fixed status colors stay common; theme action color is not a success-status replacement. Match the supplied full color and glass tables.
- No new timer, notification, ingredient checked state, favorites, scaling, AI/Link/Finder/Share logic or G2–G4. No main merge/tag/deploy/RC APK.
- Acceptance: nine actual three-screen screenshots, themed Sheet/component examples and glass-vs-solid comparison, no state loss, responsive and enlarged-text controls reachable, actual rendered contrast evidence and zero external requests/persistence.
- Verification: fresh whole-repo/native TS tests, typecheck/lint/build:local, production isolation, original browser matrix plus all-theme checks. Android is NOT_RUN and not required here.

## Review Focus

1. Portals and nested cooking roots must get theme/solid/dark explicitly rather than resetting to warm; test appearance while a Sheet remains open.
2. Theme selection cannot remount cooking, clear a query/filter or bypass the existing explicit completion/review state; exercise those consumers.
3. Glass must cover real scrolling images/text, not only a flat canvas; verify overlap and before/after pixels, then last-content clearance at200%.
4. Theme/dark selectors must not beat solid/no-support/reduced-motion fallbacks; inspect computed styles across all themes and portals.
5. Translucent surfaces need composite-background legibility, not just opaque token ratios; measure real rendered surfaces and protect text if needed.

## Task 1 — Theme state and consumers

Files: new `src/native/ui-v2/appearance.tsx`, `showcase/theme-picker.tsx`, `showcase/theme-refresh.test.tsx`; modify `showcase/{main,showcase,cooking}.tsx`, `components.tsx`.

Interfaces: `V2Theme = "warm-ivory" | "pure-glass" | "soft-sage"`; `resolveV2Theme(value?:string|null):V2Theme`; appearance context carries `{theme,solid}`; `ThemePicker({theme,onChange})` uses a labelled native radio group; `UiV2Showcase` accepts `initialTheme?:string|null`.

- [x] Add real DOM tests for known/unknown initialization, switching without query/filter/step/completion/review loss, same live Sheet, Portal attributes and empty persistence; observe RED.
- [x] Implement the minimal state/context/URL wiring and theme swatches in sample settings. Preserve existing keys and service-free entry.
- [x] Run targeted new+old showcase suite GREEN; typecheck.

## Task 2 — Shared material and rhythm refinement

Files: `tokens.css`, `showcase/{styles,components-page}.css`, `showcase/{home,detail,cooking,components-page}.tsx`; optional small `use-control-clearance.ts` presentation hook.

- [x] Apply the frozen three token tables and common status colors; portalled/nested roots use the same values. Shared theme selectors assign variables only.
- [x] Use tint/blur24–26px/saturate120–125%, subtle highlight rim and restrained shadow for navigation/search/Sheets/detail controls/cooking controls only. No refraction library or continuous animation.
- [x] Let actual content pass under control layers; measure their height and reserve real final-line clearance. Reuse the original hierarchy and same typography/spacing across themes.
- [x] Make solid/no-support fallback win at the material consumer, and pause background large blur for every open V2 Sheet; no custom focus trap or IME logic.
- [x] Add component material comparison with existing local photos; inspect rendered effect and controls before claiming the visual goal met.

## Task 3 — Fresh evidence, regression, handoff

Files: `scripts/verify-ui-v2.mjs`, new `scripts/verify-ui-v2-themes.mjs`, `docs/ui-v2/{THEME_REFRESH_VERIFICATION,THEME_REFRESH_CHECKPOINT}.md`, selected `evidence/theme-refresh/`; narrow CURRENT_STATE/DECISIONS/ROADMAP update.

- [x] Parameterize the original browser matrix for the three frozen dark backgrounds; retain meaningful old assertions, not old pass numbers. Save R2 output separately from G1 evidence.
- [x] Test all themes at320/390/412/768,200% text, long/no-image cases, live theme/Portal changes, reduced motion/solid, no persistence/network, visible real glass overlap and safe final content. Capture nine actual screens plus component/Sheet and solid comparisons.
- [x] Run fresh all tests/native subset/typecheck/lint/normal build/isolation and expected DEV build rejection; report exact numbers and old warnings.
- [x] Fresh read-only engineering review, repair Important/Critical with regression tests; preserve independent user/ChatGPT visual gate.
- [x] Focused commit/ordinary feature push, verify remote equality/clean worktree/unchanged main; stop without G2. Delivery identity is the commit containing the checkpoint; read-back results are reported with that commit.

## Execution rulings

- Approved precise brief supplies the design and execution direction; no new concept interview or approval round before implementation.
- The glass Skill's package/refraction gates conflict with the user's no-library/no-new-design constraint. Reuse controlled CSS material and validate it; do not claim Apple native optical refraction. Cost: CSS frosted glass is not physically accurate Liquid Glass.
- Use the persistent project ledger below on Windows rather than Bash-only ephemeral helpers; no unrelated install. Existing clean isolated worktree is reused, not recreated.
