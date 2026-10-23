# UI V2 G1 final targeted polish implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Test first, one final fresh-context engineering review; stop at the user's visual gate.

**Goal:** Reduce chrome weight and improve real-content hierarchy in the same three G1 screens/themes, without product development or G2.
**Architecture:** Keep existing appearance context, state owners, Base UI behavior and measured control clearance. Change only showcase presentation/semantics and browser evidence tools.
**Tech stack:** Existing React/TypeScript, Vite, scoped CSS, Base UI/Lucide, installed Playwright. No dependencies, assets/fonts or APK.
**Spec:** User's approved “RECIPIO UI V2｜G1 第三轮定向视觉精修” message; the requirements and measurable implementation choices are preserved below. Prior UI V2/second-round docs remain the unchanged baseline for other behavior.

## Global constraints / task contract

- Feature branch `feat/recipio-ui-v2-glass-minimal`, start `3b120bee4581a0d08be217605b577d5c0fa1f57e`; stable main `649804a8209413f9d682f1079a4fd19ea84cd064` unchanged. Existing isolated worktree reused; preserve unknown changes.
- Locked: Warm Ivory/Pure Glass/Soft Sage color/blur tables, shared layout/behavior, Logo, existing four food assets, three root destinations, creation-date ordering, source meanings, explicit network/AI/review/completion gates.
- Warm is the recommended preview, not the accepted production default. No fourth theme, new conceptual direction, font download, invented recipe step title, timer/ingredient-completion/notification/wake-lock, Provider/Share/Finder/data/SQLite4/Preview7/Backup2 change.
- Allowed: spacing/proportion/type weight, compact asymmetric quick actions, restrained control border/shadow and secondary-action expression; all three skins receive the same changes.
- Keep cover4:3 with the same bytes (no new crop); tighten title/meta/first-section gaps instead of risking the food subject. Calories visually secondary, data/“约” unchanged. Detail edit remains48px but text-style; primary start remains52px.
- Home: thinner flat sticky brand/search control (roughly136px at390 instead of163); compact primary soft shortcut + unframed secondary shortcut, same labels/handlers; reduce entry-to-recent gap. Target recent title at least50px earlier at390 without shrinking content/targets.
- Cooking: generic step label16px/normal instead of32px/bold; actual instruction20px remains foreground on fixed deep solid. Previous is a weaker text-style48px action; Next/completion semantics unchanged. Reference photo stays real, bounded and openable; lighter padded control bar plus measured final clearance, no permanent obstruction.
- Verification: fresh targeted tests; original browser matrix for each theme, theme/state/material matrix, R3 baseline comparisons;320/390/412/768,200%/long/no-image/title-only; reduced motion/solid; typecheck/lint/local build/isolation and necessary whole suite. No Android/real AI/other emulator operation.
- Deliver nine new screenshots plus same-state390×844/DPR1 before comparisons (Guided step3, not Focus); docs/checkpoint, focused commit/ordinary feature push, clean status/read-back, stop with `UI_V2_G1_FINAL_POLISH_READY_FOR_REVIEW`. No merge/tag/deploy/G2.

## Review focus

1. Compact shortcuts must preserve visible labels, keyboard targets, Add choices and explicit online intent, not just save space.
2. Calories cannot disappear or lose readable contrast; missing values and long text must still work without fabricated zero/defaults.
3. Weak Previous/Edit actions remain48px and focus-visible, including dark composite surfaces; no alpha shortcut that damages readability.
4. Thinner floating bars must still reserve measured clearance at200%; home sticky chrome cannot permanently hide a final row or empty-state action.
5. Before/after frames must use the same Guided step/state/viewport; actual tested-source fingerprints must not imply that old HEAD already contains new code.

## Task 1 — Preserve, test and refine the three screens

Files: `src/native/ui-v2/showcase/{home,detail,cooking}.tsx`, `styles.css`, optional scoped `tokens.css`; new `final-polish.test.tsx`. Browser tool `scripts/verify-ui-v2-polish.mjs` owns snapshot/measurement assertions.
Interfaces: existing callbacks/state unchanged. Home exposes one labelled shortcut group; calories use a presentation class; generic cooking label uses a presentation class. No new business entity/hook/state machine.

- [x] Capture fresh nine “before” frames and metrics while source is clean at3b120be. Expected: identical layout across themes, errors/remote/persistence0.
- [x] Add meaningful real DOM shortcut/authorization regression and browser hierarchy/density assertions. Observe RED on old implementation; no source-text assertions.
- [x] Implement bounded shared CSS/markup changes above. Keep labels, complete steps and existing services disconnected.
- [x] Run new+existing sample tests GREEN and inspect same-state actual390 before/after images. Expected: no lost behavior and requested hierarchy improvements, not a new style.

## Task 2 — Fresh validation, comparison and delivery

Files: existing QA scripts accept a separate `--out` so previous R2 evidence remains; source fingerprint helper includes new QA script; new `docs/ui-v2/FINAL_POLISH_{VERIFICATION,CHECKPOINT,PROGRESS}.md`, selected `evidence/final-polish/`; narrow CURRENT_STATE/DECISIONS/ROADMAP changes.
Interfaces: reuse `uiV2EvidenceSource(root)` for dirty/committed provenance; baseline file is immutable, final records separate.

- [x] Run original41-check matrix ×3, existing theme/material matrix and focused R3 comparisons; retain meaningful assertions, adapt only selector/path assumptions changed by authorized presentation.
- [x] Run final whole tests/typecheck/lint/build:local, production exclusion and expected DEV-build rejection. Report new actual numbers; no old1062/474/71 reuse.
- [x] One read-only final engineering review; fix any Important/Critical with a failing regression. Keep user/ChatGPT visual acceptance separate.
- [x] Save nine new and nine before frames with exact state/viewport/source evidence; document ≥5 concrete before/after comparisons, visible copy and limitations.
- [x] Scope/secrets/diff checked; focused feature delivery prepared. Execute ordinary commit/push and verify remote equality/clean worktree/main untouched before the completion reply; record actual Git outcome there. Stop without G2.

## Execution rulings

- The current detailed brief is the approved design/execution direction; no repeat interview/concept alternatives or new design gate. Only ordinary presentation details are delegated to implementation.
- Existing CSS glass remains: the glass Skill's new-library/refraction gates would conflict with this narrow continuation. No optical-Apple claim, no extra blur.
- Keep the repository's durable Windows ledger instead of introducing Bash-only workflow tooling or installing anything. Existing wrappers/semantic tokens are reused; no shadcn/Native API migration.
- Baseline browser capture runs in parallel with read-only planning; no app edit until capture confirmation. One bounded QA-tool helper and one final reviewer are not duplicate product development.
