# APK-6 Find a Recipe — security and privacy boundaries

Date: 2026-10-06. Scope: the new Finder path and its reuse of the frozen AI Preview / saver. This is a code-backed boundary review, not a claim of a complete platform penetration test.

## Native-only credentials

- The React key port exposes only `saveAiKey()`, `hasAiKey()` and `deleteAiKey()`. It has no plaintext getter and accepts no key string: `src/native/ai/native-bridge.ts:19`.
- Key entry remains an Android password dialog. Input is cleared, Android view-state saving and autofill are disabled, and `FLAG_SECURE` is applied: `android/app/src/main/java/app/recipio/local/LocalAiSecretPlugin.java:25`.
- The existing store encrypts the credential using an Android Keystore AES-GCM key and writes the envelope under `getNoBackupFilesDir()`, not SQLite or Web storage: `android/app/src/main/java/app/recipio/local/AiSecretStore.java:16` and `:23`.
- Finder shares `AiNativeRuntime.secrets` and the existing request / key-mutation lifecycle. Only the Native worker reads the credential; its `char[]` is cleared in `finally`: `android/app/src/main/java/app/recipio/local/LocalRecipeFinderPlugin.java:46`.
- The HTTP client sets `Authorization` only on a fixed official Responses endpoint selected by the existing credential profile. Redirect following is disabled; there is no endpoint probing or user-controlled authenticated destination: `android/app/src/main/java/app/recipio/local/RecipeFinderClient.java:23` and `:86`.
- Raw and parsed Provider envelopes and the decoded assistant JSON are checked for reflection of the active credential before any result crosses the bridge. This is defense in depth, not a reason to disclose credentials to JS.

No change is made to the existing Android backup exclusions. `android:allowBackup="false"`, legacy backup exclusions and Android data-extraction exclusions remain present. Finder does not add a new key store, key profile, cloud account or database.

## Optional online action, bounded output

Typing in the home search remains a local Repository operation. Entering Find creates no paid request. The two explicit user actions authorize Search and then Selected Source Extract respectively. There is no automatic retry, alternative endpoint, third search supplier or background recommendation.

The client uses `qwen3.8-flash`, `store=false`, `stream=false`, and no `conversation` / `previous_response_id`. Both `web_search` and `web_extractor` are declared because the current official interface requires pairing them to enable extraction. The second-phase instruction forbids search, and the local result gate rejects any executed search or other unexpected tool call. This is rejection of an unacceptable result; it does not claim that the client can undo a Provider-side tool execution or charge.

The official [Responses API reference](https://platform.qianwenai.com/docs/api-reference/chat/openai-responses) was checked by the main task in this implementation turn. `store=false` concerns the Responses storage / conversation path; it is **not** a guarantee that the Provider keeps no operational logs.

Request bodies are bounded to 256 KiB; success / error response reads are bounded to 2 MiB / 64 KiB. Strict UTF-8 and JSON parsing reject malformed content, duplicate object keys and excessive nesting. The existing 90-second Native lifecycle deadline, HTTP timeouts, disconnect-on-cancel and completion acknowledgment bound in-flight work. Errors crossing the bridge are stable allowlisted codes, not raw Provider text.

## Source and Preview gates

See [source-verification evidence](verification/find-recipe-sources.md). The implemented sequence is:

```text
completed structured search sources
  → full canonical URL membership
  → Native-owned candidate UUID
  → exactly selected completed extractor target
  → Native AI schema
  → JS Zod / deterministic normalization
  → existing explicit / inferred / missing Preview
  → explicit user confirmation
  → ordinary RecipeLibrary.createDetails()
```

The source URL does not become a credential-bearing request to that site from the device. APK-6 calls the fixed Provider endpoint; the Provider performs its search / extraction. APK-5A `SafeWebFetcher`, its DNS pinning and its SSRF rules are unchanged and are not reused as a claim about Provider-side DNS behavior.

Finder rejects URL-bearing or selected-host-bearing decoded model JSON before Preview, including JSON-escaped URL forms. Native and JS both enforce this boundary. Candidate text is rendered as ordinary React text; Finder adds no raw HTML sink, external browser, remote image or script renderer. A scoped static search of the new Finder TS / Native files found no `console` / Android log output, `fetch`, Web storage use or HTML-injection sink.

## Session ownership and persistence

- Query, preference, candidates, source URL / host and tool evidence remain process-local session material. Native `RecipeFinderSessions` contains only memory maps and generation counters; it has no file / database writer: `android/app/src/main/java/app/recipio/local/RecipeFinderSessions.java:4`.
- The bridge returns validated candidates, and later only bounded Recipe JSON plus selected-source text required by the existing normalizer. It does not return the full Responses envelope. The source text is consumed during normalization, not retained as AI input or Recipe notes.
- Cancel / discard / restore invalidate generations. Native cancellation acknowledgment and JS generation checks prevent late replies from activating results or Preview. Backup `preview`, `restoring` and `uncertain` block Search / Extract / Save: `src/native/find-recipe/service.ts:18` and `:36`.
- Finder does not overwrite another unfinished AI input. External-draft handoff reuses the existing Preview and saver; uncertainty cannot bypass confirmation or cause an unverified duplicate creation.
- `AiRecipeSaver` passes only validated ordinary `RecipeDetailsInput` to `RecipeLibrary.createDetails()`. Review checks, warnings, URLs, candidate ranks, query, tool output and Provider metadata are not passed to the Repository: `src/native/ai/save.ts:15` and `:33`.
- On successful save, Finder clears query / preference / candidates / selection and discards the Native session. Abandonment clears session material without creating a Recipe.

Frozen versions remain **SQLite 4 / browser Preview 7 / Backup 2**. No Finder table, persistent history, migration or extra backup collection is introduced.

## Executed privacy evidence

The following implementation-stage checks were actually executed with generated fixtures and zero real Provider requests:

| Check | Observed result |
| --- | --- |
| `vitest run src/native/find-recipe/backup-regression.test.mjs --pool=threads --maxWorkers=1 --no-file-parallelism` | 1 file, 3 tests passed |
| Finder privacy + existing AI backup + SQLite backup Repository regression | 3 files, 14 tests passed |
| `eslint src/native/find-recipe/backup-regression.test.mjs` | Exit 0 |

The three new tests exercise real `FindRecipeService → AiIntakeService → RecipeNameStore` using Node SQLite, with only Native / external ports faked. They verify: no writes before confirmed save; ordinary Recipe, manual Change History and Cooking Record preserved by validated Backup2 → a second SQLite database; and escaped source URL rejected before Preview. Generated query / preference / candidate / source / raw-warning / field-check / extractor sentinels are absent from all SQLite table rows and the portable backup.

These numbers are scoped implementation evidence, **not final frozen-HEAD totals**. They do not claim Android execution, ZIP/media-byte safety, full logcat / bundle / Review Packet scans or real account access. The main task owns final fresh regression, Android and archive safety evidence.

## Remaining assurance limits

1. A structured search source proves membership in the Provider's search output, not that a webpage is correct, safe or currently readable. Normalization and human Preview remain mandatory.
2. Public DNS-name source URLs are syntactically constrained locally; APK-6 does not itself resolve / fetch arbitrary source hosts. Provider-side extraction behavior cannot be represented as device-side DNS pinning.
3. Temporary plaintext necessarily exists in Native process / HTTP-header memory. Clearing the key array is best effort; immutable Java strings and HTTP implementation buffers cannot be promised zeroized.
4. Preview remains an editable personal Recipe form, not a generic data-loss-prevention system. The no-provenance rule applies to automatic Finder data transfer; deliberate user-entered notes are ordinary user content.
5. Physical-device / fresh-key Provider acceptance remains pending. ZIP readback is performed by the clean-HEAD delivery builder and captured separately, not replaced by a unit-test simulation. Previously exposed chat keys must not be reused or included in artifacts.

## Final static audit

After the final production build and Android fixture-only repair:35 changed/new text paths contain0 credential-shaped matches. The immutable v17 APK contains226 scanned text/DEX entries with0matches; all17 Native-copied Web assets are byte-equal to the packaged entries. Device logcat scanned in memory during final connected regression contains0credential-shaped matches; no matching values or raw logcat are placed in the Packet. These bounded static scans do not prove that arbitrary future credentials can never be exposed, and do not replace Native-only ownership/tests. Final Packet generation/readback is recorded separately after the clean committed HEAD.
