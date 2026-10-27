# UI V2 G1 second-round refinement checkpoint

Status: **UI_V2_THEME_REFRESH_READY_FOR_REVIEW** — not ACCEPTED/FROZEN.

## Location / inherit

- Worktree: `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2`
- Branch: `feat/recipio-ui-v2-glass-minimal`
- Starting G1 commit: `c956e59bc791ed1ea728f2af4092c19e38902eca`
- Stable main: `649804a8209413f9d682f1079a4fd19ea84cd064`
- Delivery commit: inspect `git log -1 --format=%H -- docs/ui-v2/THEME_REFRESH_CHECKPOINT.md`.
- Original checkout stays clean on `exp/recipio-video-visual-p1`; no experiment work continued.

## Built / modified scope

One appearance context, three exact token skins and labelled settings radio
choices. Query initialization plus live memory-only selection; explicitly themed
nested cooking and every Portal. Same Home/Library, Detail, Cooking and component
states, not three UI implementations. CSS tint/blur/rim/shadow is stronger over
real scrolling content. Shared small typography/spacing changes and measured
control clearance keep long/enlarged content reachable. Component material sample
uses existing demo photos. Safe confirmation uses Base UI initialFocus after a
test-first repair of the native-autoFocus return-target bug.

New source: `appearance.tsx`, `use-control-clearance.ts`, showcase theme picker,
material sample and13-case regression file. Existing source changes are only
under `src/native/ui-v2/`. QA scripts add themed original regression, additional
theme/material matrix and raw-input fingerprinting. Docs add frozen execution,
plan/ledger, verification and separate screenshots; CURRENT_STATE/DECISIONS/
ROADMAP updated. No source files deleted; no production entry wired.

## Fresh evidence

- Whole repository:195 files,1062 tests PASS,502.60s.
- Native TypeScript subset:71 files,474 tests PASS,168.57s; not Android tests.
- Sample tests:33 PASS (13 new +20 prior), included above, not extra counts.
- Browser: original41 checks rerun in each theme; additional71 PASS.
- Typecheck/lint/local build PASS. Five old lint warnings and old chunk warning retained.
- Production graph281 modules,0 V2 modules/fixture assets; expected DEV-only build rejection PASS.
- Chromium151.0.7922.34;320/390/412/768 and200%/long/empty/no-image/name-only cases.
- Actual glass overlap/scroll and solid/reduced-motion checks;0 runtime errors,
  external/API requests, persistent writes or database initialization in the matrix.
- Same28 showcase/QA inputs across all successful browser runs:
  `59c62730ceaa6fe6b285e77cff0eea70ca2afb00b2f24e6903c01b8f8178ccd5`.
  JSON baseline HEAD/dirty state is explicit, not mislabeled as an R2 commit.
- Read-only technical review plus narrow focus/frame followup: no remaining
  Critical/Important. This does not substitute for user/ChatGPT visual approval.

Details, commands, exact semantic/material tables, local composite contrast,
review repairs and nine-screen matrix: `THEME_REFRESH_VERIFICATION.md`.
Selected actual captures/JSON: `evidence/theme-refresh/` (27 PNGs +7 JSONs).
Prior G1 checkpoint and screenshots are preserved unchanged.

## Try it / next gate

Run `npm run dev:ui-v2`, open `http://127.0.0.1:5182/ui-v2-showcase/`.
Use `?theme=warm-ivory|pure-glass|soft-sage`; combine with `&screen=detail`,
`&screen=cooking&mode=focus`, `&screen=components`. Or use
“样板设置 → 外观主题”. Scroll photos behind controls and compare “实体玻璃回退”.
All demo work resets on refresh; there are no real recipe writes.

Wait for explicit user/ChatGPT visual confirmation. Do not enter G2–G4, wire
formal pages, declare aesthetic acceptance, merge main, tag or deploy.

## Frozen / NOT_RUN

SQLite4/Preview7/Backup2, Native/Repository/Provider/Key, AI/Link/Finder/Share,
Logo/Android Manifest/version/dependencies/lockfiles unchanged. No new food image,
paid AI request, private media, APK or operation on other project environments.
Android/WebView/IME/Back/TalkBack/phone/OEM, unsupported browser and same-device
performance NOT_RUN and not required for this showcase gate. No claim of full
accessibility certification or Apple native optical refraction.
