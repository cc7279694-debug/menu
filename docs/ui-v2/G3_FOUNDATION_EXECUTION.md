# G3-0 execution — 2026-10-24

Approved brief: user G3-0 theme switching/root-shell/settings/Finder-boundary
request. G2 9e4bff3596d6efebadf93f6a4778b113efb3272e is user ACCEPTED/FROZEN —
PASS WITH NOTES. Continue this linked worktree/feature branch; main649804a unchanged.

## Contract / sequence

1. RED: consumer tests for persisted themes, shared root/settings, portals and
   cooking, input preservation, guarded settings-return paths; rendered Finder
   boundary and responsive/solid-glass checks.
2. GREEN: one lightweight enum preference, shared appearance context/scopes,
   settings presentation reusing BackupControls/AiSettings, scoped Finder border.
3. Fresh full unit/type/lint/build/sync/assemble; bounded rendered screenshots;
   safe-memory/owned-device gate then preserving upgrade and Android smoke.
4. Checkpoint, evidence, APK hashes/signature; normal commit/push; stop at review.

## Frozen boundaries / rulings

- SQLite4/Preview7/Backup2 and all Native/key/provider/import/restore contracts
  unchanged. No real AI, production media, dependencies, main/tag/deploy or G3
  AI/Link/Finder redesign. Existing glass/material implementation wins over
  optional skill library-install suggestions; no new palette/design interview.
- No suitable existing preference mechanism was found. Use only
  `recipio.ui-v2.theme.v1` containing one validated enum; storage failures retain
  an in-memory choice without crashing. Not included in .recipio backups.
- Settings visits returning to the same root preserve query/filter/page. Choosing
  a different root (also hardware Back to Home from a Library-origin visit)
  retains the previous reset-to-first-page semantics, preventing Home from
  accidentally displaying Library page100 as its recent recipes.
- Browser plugin/skill is absent; use installed Playwright and existing native
  WebView tools, not new dependencies. Existing worktree isolation reused.
- v22 is unoccupied in this branch's artifact/evidence inventory. Candidate
  code22/name0.10.0-ui-v2-g3-rc1; version text supplied by non-secret build metadata.

## Progress

Baseline fetch/status verified. Consumer RED12/13 failures and transparent Finder
border reproduced before implementation. Initial consumer13 GREEN plus G2=29.
Placeholder token mismatch reproduced with real RGB pixels, then fixed locally.
Internal review found unthemed legacy confirmation portals:2 RED, then opt-in
appearance-only forwarding and existing AiSettings/BackupControls tests31 GREEN.
Page100 settings-to-Home regression RED reproduced, with same-root return tracked
by a presentation-only ref; no data/router/provider state owner changed.
Final source:199files/1095tests PASS; targeted5files/48PASS; browser8groups/
18settings layouts,16cooking layouts and9settings dialogs PASS. Typecheck,
lint0errors/5existing warnings, build/isolation/sync/assemble/signature PASS.
Superseded full runs were explicitly interrupted after source changes; none
counts as final evidence. No production source changed after the final build.

Final read-only Android gate after regression:3.408GiB free<4GiB, zero running
emulator processes. Do not launch. Runtime/data-preserving upgrade/native IME
checks NOT_RUN, no ADB or phone operation. Status PENDING_ANDROID, not self-
accepted. Evidence/checkpoint identify the exact candidate and remaining task.
