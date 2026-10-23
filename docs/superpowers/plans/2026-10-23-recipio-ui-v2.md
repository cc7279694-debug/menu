# RECIPIO UI V2 G0 + G1 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Checkbox steps record the authorized G0/G1 work only; G2–G4 remain gated by user visual acceptance.

**Goal:** Deliver a DEV-only, interactive Glass Minimal showcase and component states for Home → Recipe Detail → Guided/Focus, without connecting to production data or online services.

**Architecture:** A separate serve-only Vite entry imports native-scoped UI V2 tokens, reusable presentation wrappers and in-memory generated fixtures. Production native/Next entries, repository/service implementations and the APK build graph remain unchanged.

**Tech Stack:** Existing React/TypeScript/Vite/Tailwind, Base UI/shadcn behavioral primitives, Lucide, Vitest/Testing Library. Browser verification uses the existing bundled Playwright runtime because the Browser plugin/skill is absent. No dependency install or upgrade.

**Spec:** `docs/ui-v2/RECIPIO_UI_V2_SPEC.md`; execution authority `docs/ui-v2/EXECUTION.md`; reference `docs/ui-v2/reference/concept-a.png`.

## Global Constraints

- Base commit `649804a8209413f9d682f1079a4fd19ea84cd064`, tree `2d1993bcab8dbb59c540b8225d51259562ad0316`; branch `feat/recipio-ui-v2-glass-minimal`.
- Scope G0 + G1 only. Stop `UI_V2_VISUAL_READY_FOR_REVIEW`; no production default wiring, APK, main merge/tag/deployment.
- SQLite4 / Preview7 / Backup2, native security/Back, Provider, owner/generation, media lifecycle and data services remain read-only.
- No favorites/timers/scaling/recommendations/video/cloud/account/new persistence; only three root destinations.
- Tokens: canvas #F6F4EF, surface #FBFAF7, text #1B1B1D, action #49684F, cook #202420. Glass navigation/control only, solid fallback, reduced motion.
- Generated fixture images explicitly approved by the user in this chat, for isolated demo use only. No crop from the reference poster, no private images, remote font or online image source.

## Review Focus

1. A showcase must never initialize real IndexedDB/native services or leak into the normal APK entry graph (entry/config and browser storage/network checks).
2. 320px and 200% root text scaling must not clip amounts, CTAs, tabs or sheet actions (browser overflow/touch/scroll checks).
3. Focus at its final step must not offer cooking completion; Guided requires a separate explicit action and double-click protection (DOM tests).
4. Base UI portal layers must inherit V2 tokens, trap focus, close safely and return focus to their trigger (DOM and browser tests).
5. Missing/broken image and title-only content are valid recipes, not blank hero space or invented food/fields (DOM and browser tests).

## Task 1: G0 baseline, scope and safe entry contract

Files: this plan; `docs/ui-v2/{RECIPIO_UI_V2_SPEC,EXECUTION,UI_V2_SCOPE_MAP}.md`; `reference/concept-a.png`.

- [x] Fetch and verify exact stable SHA/tree, clean checkout and absent target branch; inspect existing UI, model, scripts and documentation drift.
- [x] Create independent worktree from the exact stable SHA, not the experiment branch. Native app worktree tool returns `Not a git repository` because chat cwd is its parent; use the explicitly authorized Git fallback.
- [x] Import the full user spec/execution and byte-identical reference; retain one authoritative spec body.
- [x] Record P01–P12/O01–O05 owners and phase boundaries; retain old checkpoint evidence rather than relabeling it.

## Task 2: isolated entry, reusable controls and review tooling

Files: `vite.ui-v2.config.mts`, `ui-v2-showcase/index.html`, `src/native/ui-v2/{tokens.css,components.tsx}`, `showcase/{main.tsx,showcase.tsx,components-page.tsx,styles.css,vite-env.d.ts}`, new DOM tests.

Interfaces: `UiV2Showcase({initialScreen?,initialScenario?,initialMode?})`; `V2Button({variant?,busy?,...nativeButtonProps})`; `V2Sheet({open,onOpenChange,title,description,children,...})` via existing Base UI Dialog behavior, local V2 portal container.

- [x] Add failing real DOM tests for three root navigation destinations, four add choices with no network/write, disabled/busy controls, safe sheet dismissal/focus and component state rendering. Observe RED before implementation.
- [x] Implement serve-only config (build/preview rejection), entry DEV guard, local-scope tokens and reusable control/Sheet wrappers; no shared primitive modification.
- [x] Add explicit review controls: scenarios, large text, solid glass fallback, component states. Keep fixture identity visible, never mock production API.
- [x] Run targeted tests/typecheck/lint and record GREEN.

## Task 3: same-data Home, Detail, Cooking exemplars

Files: `showcase/{demo-data.ts,home.tsx,detail.tsx,cooking.tsx}` and scoped CSS/tests; approved fixture assets and provenance.

Interfaces: `DemoRecipe` wraps existing `RecipeDetails` with demo-only image URLs; screens receive callbacks and plain data, no repositories; `CookingScreen({recipe,mode,initialIndex,onClose,onComplete})`.

- [x] First add failing tests for title/ingredient local search, creation-order preservation, duration boundaries, title-only content, no-cover detail, full steps, Focus vs Guided and explicit completion once. Observe RED.
- [x] Implement three screens with three-root navigation, four-choice add Sheet, complete readable content and read-only ingredient Sheet. Demonstration actions report that they are not connected, never write a recipe/record.
- [x] Handle long/empty/title-only/no-image/broken-image fixtures; search navigation retains query and browser scroll; no per-step checked state or timers.
- [x] Run targeted suite GREEN; verify no production imports/data storage/provider calls.

## Task 4: rendered evidence, regression, handoff and stop

Files: `scripts/verify-ui-v2.mjs`, `docs/ui-v2/{G1_VERIFICATION,CHECKPOINT}.md`; small generated screenshot evidence. No whole-repo packet.

- [x] Exercise actual browser Home → Detail → Guided/Focus, controls/Sheets, keyboard focus and component states at 390×844; check 320/412/768, 200% root text, no-image/title-only/long/broken-image, reduced-motion/solid fallback.
- [x] Verify explicit production build exclusion, no IndexedDB/localStorage/cookies/remote requests for showcase, no relevant console errors. Use `view_image` on reference and final three screenshots; record at least five concrete comparisons and intentional spec-vs-poster differences.
- [x] Run fresh all-repo tests, native subset, typecheck, lint and unchanged `build:local`. Android/IME/TalkBack/OEM/performance/cover-install remain NOT_RUN at G1; no APK required.
- [x] Fresh bounded code/scope review; fix important defects with regression tests. Update checkpoint with actual numbers, commands and limits.
- [x] Focused commit and normal push feature branch; confirm local/remote SHA, clean tree and unchanged main. Leave runnable preview and stop for user visual review.

## Deferred, not authorized yet

G2 production core wiring; G3 AI/Link/Finder/backup/share visual unification; G4 final Android build/device gates. Their semantics remain protected and their tests are not claimed by this showcase.
