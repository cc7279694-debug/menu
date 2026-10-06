# APK-6 Find a Recipe contract

## User and data boundary

An optional online action, separate from local library search. Typing searches only the local Repository. Entering Find performs no Provider call. Explicit **开始寻找** authorizes search; explicit **按这个做法整理** authorizes extraction of the chosen verified source. No automatic retry or fallback.

Input: trimmed dish1–120 Unicode code points; preference0–500. Session memory only. Return0–3 candidates (zero is an empty result, not invented candidates). No ratings, popularity or authenticity ranking. Candidate source host is derived locally; unsupported durations and preparation hints stay empty.

Native API `LocalRecipeFinder`:

- `createSession() → {sessionId}`
- `search({sessionId,requestId,dish,preference}) → {candidates}`
- `extract({sessionId,requestId,candidateId}) → {rawJson,sourceText}`
- `cancel({sessionId,requestId})`
- `discardSession({sessionId})`

IDs are UUID request/session identities; selected candidate URLs are resolved from Native-owned verified candidates, not accepted from JS. JS receives no credential, complete Responses envelope or tool output. Extraction returns bounded selected source text for the existing deterministic normalizer, transient only; it is not retained after normalization.

## Verification before Preview

Collect only completed `web_search_call.action.sources` entries with `type=url`. Canonical membership compares the full URL: lowercase scheme/host, strip fragment/default port, preserve path/query. Never trust URLs found in assistant prose. Unmatched candidates are dropped, duplicates removed; all dropped or search not executed fails safely.

RC2 Search submits results through exactly one completed `function_call` named `submit_candidates`, whose string `arguments` is strict JSON matching the declared schema: only `candidates`, at most three objects, all eight candidate fields required, no extra fields. Ordinary assistant JSON/prose/fences are never a fallback. A verified search with no candidate function returns `candidate_output_missing` (搜索到了来源，但结果整理没有完成，请手动重试。); missing/failed sources remain independently rejected. Function arguments do not grant source membership.

Phase2 must contain a completed `web_extractor_call` for the selected canonical URL only. Any search call, unrelated extractor target, missing/failed extractor or unreadable output prevents Preview. Advertisement of both built-ins is required by this Provider, but is not permission to replace the selected source.

RC2 Extract additionally requires exactly one completed `submit_recipe_draft` function call. Its parameters directly reuse the frozen APK-4 Recipe schema; duplicate keys, malformed arguments, missing/extra fields and wrong function names fail locally. Only the expected draft function is exempted from the phase2 unknown-tool gate; it does not replace the selected-source extractor. Finder locally replaces APK-4's no-tools / assistant-output prompt wording while preserving its factual review semantics and unchanged shared asset.

`rawJson` → existing Native AI schema → existing JS Zod schema → deterministic normalization → fieldChecks (`explicit/inferred/missing`) → existing AI Preview. Uncertainty requires explicit human confirmation. Save uses existing `RecipeLibrary.createDetails` and its uncertain-save recovery. No AIRecipe/ImportJob/RecipeSource entity.

## Lifecycle

One in-flight action, generation fence and Native cancel acknowledgment. Late results cannot replace current state. Input Back leaves; results Back returns to input preserving query; extraction cancel returns to results; Preview uses existing editor guard. Native IME owner consumes first Back with visible keyboard; no guessed timers or parallel keyboard state.

Backup preview/restoring/uncertain blocks new search/extract/save. Restore beginning invalidates the session, candidates and late results. Query/preference/candidate/source/Responses metadata do not enter SQLite4, Preview7, Backup2 or ChangeHistory. Saved ordinary Recipe still participates in Backup2.

## Security and version

Native Keystore-only credential, same existing profile routing, one fixed official Responses endpoint per profile. `qwen3.8-flash`, `store=false`, no Provider conversation or previous response. Only web_search/web_extractor and the stage-specific result function, no code interpreter. Existing ChatCompletions remains unchanged. `store=false` is not a claim about Provider operational-log retention. No guessed `response_format` or undocumented `strict` option is sent; all result validation remains local and mandatory.

RC2 target version code18, name0.9.0-find-recipe-rc2; original immutable v17 delivery and its historical evidence are preserved. Main v15 and unmerged Logo v16 remain unchanged. After fresh automatic regression, at most one physical-device real Search for 土豆丝 is allowed using the new key already configured through Native settings. No automatic repeat or paid Extract is authorized by this repair. No physical device connected means pending user retest, not real Provider PASS. Automated tests and emulator Fake scenarios use zero real paid requests.
