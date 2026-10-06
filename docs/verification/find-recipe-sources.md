# APK-6 — structured-source verification

Date: 2026-10-06. This note records the actual Native / TypeScript gates and the available test mapping. It does not add a new parser, Provider or persistent source entity.

## Search authority

`RecipeFinderSources.search()` accepts source authority only from a completed `web_search_call` whose `action.type` is `search`; it collects `action.sources[]` entries with `type="url"`. Failed / missing search calls, assistant prose and invented model URLs cannot establish membership: `android/app/src/main/java/app/recipio/local/RecipeFinderSources.java:39`.

Search output is bounded and validated. Proposed candidates must have the exact expected JSON keys and at most three entries. Each proposed `sourceUrl` must be in the verified canonical set. Invalid / unsafe / unmatched candidates are dropped, duplicate canonical pages are deduplicated, and all-invalid proposals fail safely. Zero reliable proposals is an empty result only after a completed search with at least one verified source; it is not three invented recipes.

RC2 only reads one completed `submit_candidates` function's string arguments. Candidate schema requires every field and rejects additional properties/type/array drift before membership filtering. Assistant messages, including valid or fenced JSON, cannot replace the handoff. Verified sources without the function report `candidate_output_missing`; malformed/duplicate function calls remain invalid_output.

Native creates each candidate UUID and derives `sourceHost` locally. Native-owned session candidates are the selection authority. JS submits only `sessionId`, request UUID and `candidateId`; it cannot replace the selected URL in the extraction call: `android/app/src/main/java/app/recipio/local/LocalRecipeFinderPlugin.java:27` and `android/app/src/main/java/app/recipio/local/RecipeFinderSessions.java:11`.

## Canonical equality

Both boundaries compare a **full URL**, never only a domain:

- scheme and hostname lowercase;
- default port normalized, arbitrary port / credentials rejected;
- fragment removed;
- raw path and query retained, including path case, encoded bytes and dot segments;
- no equivalence between different paths or different query values;
- no automatic removal of query tokens or insertion of an empty-root slash for matching.

Implementation: `android/app/src/main/java/app/recipio/local/RecipeFinderSources.java:13` and `src/native/find-recipe/contract.ts:6`. The JS boundary deliberately accepts public DNS names only; it rejects IP literals, local / reserved-name forms and credential-bearing URLs. Native additionally applies the existing URL safety rules and blocks excluded video / social-platform hosts. Public source identity is not a claim that the device performed a DNS-pinned page fetch.

## Time and preparation evidence

Candidate minutes are retained only when the same verified page has bounded search snippet / completed extraction evidence containing the quoted total-time expression and unit. Without this evidence the minutes stay `null`.

Preparation text must exactly equal its quoted evidence and occur in the same page's evidence. It cannot strip a negation from “不需要提前…” and publish “提前…”. Without valid evidence it becomes empty. This is a deterministic check of Provider-returned evidence; it does not turn an excerpt into an authoritative nutrition / timing database.

## Selected-source gate

`RecipeFinderSources.extractedText()` requires at least one completed, nonempty `web_extractor_call`. Every extractor has exactly one URL, and that canonical URL must equal the frozen selection. A failed / missing extractor, unrelated target, multiple targets or any executed `_call` item other than `web_extractor_call` or the expected `submit_recipe_draft` function blocks Preview. The draft function is separately required and strictly validated.

Consequently an executed `web_search_call`, `code_interpreter_call`, unexpected function or unknown tool-call item in phase 2 is rejected, even if a valid selected extractor is also present. Only `submit_recipe_draft` passes this transport-specific gate; it grants no source authority. Non-tool metadata does not authorize a different source. The selected source text is bounded to 30,000 Unicode code points for normalization; it is temporary evidence, not a stored webpage.

The current official [Responses API reference](https://platform.qianwenai.com/docs/api-reference/chat/openai-responses), checked in this implementation turn by the main task, requires `web_extractor` to be paired with `web_search`. Therefore both are declared in phase 2, but instructions prohibit search and the local gate refuses any result in which it executes. This does **not** claim Provider-side tool permission isolation or that an unwanted upstream call can be reversed.

## From extraction to ordinary Recipe

`RecipeFinderClient` requires a completed response for the fixed model, no Provider error, one completed `submit_recipe_draft` function result and the existing Native Recipe AI schema directly reused as its parameters. Strict argument parsing rejects malformed / duplicate-key JSON; ordinary assistant JSON is not a fallback. Native blocks credential reflection and source-URL / selected-host leakage, including decoded nested JSON.

JS independently validates bridge data, decodes Recipe JSON before its source-leak check and hands it to `AiIntakeService.acceptExternalDraft()`. The existing Zod schema, deterministic normalizer, `explicit / inferred / missing`, Review checkbox, editable Preview, duplicate warning and uncertain-save recovery remain the sole save path. No third Provider call is used to build Preview: `src/native/find-recipe/service.ts:62` and `src/native/ai/service.ts:144`.

The output is a normal `RecipeDetails`, without source URL / host, search query, candidate ranking or Provider metadata. Search / source data are released on save or abandonment. SQLite 4, Preview 7 and Backup 2 stay unchanged.

## Test coverage map

These test files were read during the scoped audit. Final pass counts for the Native / Android tests must come from the main task's execution record, not from this inventory.

| Boundary | Test evidence location |
| --- | --- |
| Structured sources, nine sources / up to three candidates, unmatched / duplicate pages, failed search, zero proposals | `android/app/src/test/java/app/recipio/local/RecipeFinderSourcesTest.java` |
| Exact path / query membership, address / credential / port safety, same-page timing, preparation negation | `RecipeFinderSourcesTest.java`; `src/native/find-recipe/contract.test.ts` |
| Selected canonical URL, missing / failed / multi-target extractor, search and unexpected tool calls | `RecipeFinderSourcesTest.java` |
| Fixed endpoint / model / tools / store flag, no conversation, strict JSON, bounded output, safe errors, cancel, deadline, no redirect retry | `android/app/src/test/java/app/recipio/local/RecipeFinderClientTest.java` |
| Native-owned selected candidate / generation | `android/app/src/test/java/app/recipio/local/RecipeFinderSessionsTest.java` |
| Late results, cancel acknowledgment, restore invalidation, escaped-source URL, Review / uncertain-save gate | `src/native/find-recipe/service.test.ts` |
| Home input remains local; explicit action required | `src/native/find-recipe/library-entry.test.tsx` |
| Real SQLite save and Backup2 roundtrip without source / query / candidate / tool provenance | `src/native/find-recipe/backup-regression.test.mjs` |

## Tests actually run by the privacy audit

1. New privacy integration file: **3 tests passed**, 2026-10-06 implementation-stage run.
2. New privacy file + existing AI Backup regression + SQLite Backup Repository: **14 tests passed across 3 files**.
3. New privacy file ESLint: **exit 0**.

These were generated fixtures only, **0 real AI requests**. They used actual Node SQLite, the production services and a validated portable Backup2 restoration into a separate database. They were not Android, physical-device or ZIP image-hash verification.

Historical v17 evidence only:full193files /1027PASS, native-app69files /439PASS, JVM174PASS, real WebView/IME specialist16PASS and unfiltered Android105PASS; actual v16→v17 image-byte preservation and flight-mode walkthrough passed. See `find-recipe.md` and `find-recipe-android.md` for the historical scope. User subsequently reported real Search invalid_output, so these numbers do not accept APK-6. Fresh RC2 evidence is in `find-recipe-rc2.md` and `find-recipe-rc2-android.md`; fake envelopes do not establish real Provider acceptance.
