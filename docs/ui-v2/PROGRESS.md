# G0/G1 execution ledger

Plan: `../superpowers/plans/2026-10-23-recipio-ui-v2.md`.
Base: `649804a8209413f9d682f1079a4fd19ea84cd064`.
Worktree: `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2`.

## Verified before implementation

- Clean source checkout and exact remote baseline/tree; target branch absent. Separate worktree created from stable main, not experimental HEAD.
- Existing native subset: 69 files /441 tests PASS (335.53s). This is a baseline, not final verification.
- Complete user spec/execution read, reference hash verified, installed HR skills/Playbooks reused. No new dependencies/skill installation or production changes.

## Task status

- Task1 G0: implemented scope/source/phase map; original spec imported with its relative image link corrected and three metadata hard breaks converted from trailing spaces to equivalent CommonMark backslashes for Git whitespace hygiene. Requirements unchanged. Exact original execution and reference retained.
- Task2 controls and isolated serve-only entry: implemented. No NativeApp/Repository/Provider import. Base UI behavior with local styles; typed wrappers, no shared primitive changes.
- Task3 exemplars: implemented. Same generated recipe fixtures and four approved generated demo photos; source prompts in assets/README. No persisted data.
- Task4: final browser41 checks PASS;194 files/1049 whole-repo tests and70 files/461 native subset tests PASS (includes20 new sample DOM tests). Fresh typecheck/lint/local build/build guard/production graph exclusion PASS. Evidence and limits are in G1_VERIFICATION.md. This checkpoint accompanies the focused feature delivery; exact commit/remote/clean-tree checks are reported at handoff. No G2 work authorized.

## RED → GREEN evidence / rulings

- Initial feature tests were written first; module stubs allowed collection and all14 actual assertions failed (no navigation, controls or content). Implemented screens/controls;14/14 then passed.
- Imported gallery CSS made Vitest/Vite inherit the old Next PostCSS plugin-list shape. Reproduced invalid plugin error and browser500; existing native config separately defines PostCSS. Ruling: scope plain CSS to the G1 Vite config (`plugins: []`) and import styling only from the isolated entry, not component logic. No legacy config modification.
- Added two regression tests before repairs: empty cooking must not invent step1, and returning from Focus must restore the invoking step's keyboard focus. Both failed; repaired only the showcase.16/16 passed.
- Added single-main-landmark regression; observed2 versus expected1. Removed nested main from component gallery;17/17 passed.
- Visual comparison caught metadata wrapping and a narrow200% secondary CTA. Adjusted intrinsic metadata wrapping, rem-based step-number columns and flex-wrapping footer controls, not business logic. Final browser matrix passed.
- Bounded engineering self-review identified missing step-image preview, insufficient dark focus contrast and overbroad200% test wording. Added two failing photo-preview regression tests (18 PASS/2 FAIL in20), then repaired local image preview/focus behavior. Final20/20 PASS. No-image keeps no image action.
- Dark focus now uses an independent lighter token, without changing the primary fill. Browser41 checks include computed keyboard-focus contrast, long-content final-character visibility, complete ingredient amounts, last Sheet choice activation and final explicit completion at320px+200%.
- Expanded focus-loop assertion initially sampled Base UI's adjacent hidden guard before its requestAnimationFrame return. Diagnosis distinguished this from background focus; repaired only the assertion to recognize that exact guard and wait for the same-popup DOM condition. No arbitrary delay, production focus rewrite or weakened external-focus check.
- User explicitly allowed generated showcase photos after asset audit found no safe food fixture. No poster crop/private assets. These are the only image-generation calls; Qwen/recipe Provider calls remain0.
- Ruling: adapt bookkeeping to a persistent Markdown ledger in the worktree on Windows; no Git-bash-only helper or dependency installation. Task ownership/RED-GREEN/evidence and final fresh review remain intact. Cost: helper-generated briefs are not available; the short four-task plan is the exact source.

## Known gates

G1 does not validate Android IME/TalkBack/OEM, real SQLite/media/backup, same-device performance, private data or production paid AI. Those are protected and NOT_RUN here. G2–G4 require the user's visual approval. No APK/release/main promotion is authorized in this phase.
