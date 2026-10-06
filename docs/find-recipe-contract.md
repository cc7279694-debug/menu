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

Phase2 must contain a completed `web_extractor_call` for the selected canonical URL only. Any search call, unrelated extractor target, missing/failed extractor or unreadable output prevents Preview. Advertisement of both built-ins is required by this Provider, but is not permission to replace the selected source.

`rawJson` → existing Native AI schema → existing JS Zod schema → deterministic normalization → fieldChecks (`explicit/inferred/missing`) → existing AI Preview. Uncertainty requires explicit human confirmation. Save uses existing `RecipeLibrary.createDetails` and its uncertain-save recovery. No AIRecipe/ImportJob/RecipeSource entity.

## Lifecycle

One in-flight action, generation fence and Native cancel acknowledgment. Late results cannot replace current state. Input Back leaves; results Back returns to input preserving query; extraction cancel returns to results; Preview uses existing editor guard. Native IME owner consumes first Back with visible keyboard; no guessed timers or parallel keyboard state.

Backup preview/restoring/uncertain blocks new search/extract/save. Restore beginning invalidates the session, candidates and late results. Query/preference/candidate/source/Responses metadata do not enter SQLite4, Preview7, Backup2 or ChangeHistory. Saved ordinary Recipe still participates in Backup2.

## Security and version

Native Keystore-only credential, same existing profile routing, one fixed official Responses endpoint per profile. `qwen3.8-flash`, `store=false`, no Provider conversation or previous response. Only web_search/web_extractor, no code interpreter. Existing ChatCompletions remains unchanged. `store=false` is not a claim about Provider operational-log retention.

Target version code17, name0.9.0-find-recipe. Main v15 and unmerged Logo v16 are preserved. Final real acceptance requires a new key configured through the app's Native settings, not a key pasted into chat. Automated tests and emulator Fake scenarios use zero real paid requests.
