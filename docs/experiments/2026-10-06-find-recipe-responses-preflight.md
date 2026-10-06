# APK-6 Stage 0 — Responses / Web Search Provider Preflight

## Baseline

- Date: 2026-10-06
- Stable `origin/main`: `8b2246dbfac674aa837cb25675893fbbef2d79c5`
- Release: `v0.8.0-share-intake`, resolving to the same stable commit.
- Experiment branch: `exp/find-recipe-responses-preflight`, created directly from the verified stable baseline.
- Initial working tree: clean. The independent logo-refresh branch was preserved.

## Initial device gate — superseded for desktop testing only

- Initial result was `FIND_RECIPE_PREFLIGHT_NEEDS_DEVICE_KEY`: no RECIPIO device was connected, and another project's emulator was not used to read credentials. No request was made at that gate.
- The user subsequently explicitly declined connecting a phone, supplied a credential, and requested that Codex test it. This authorizes a **desktop-only Provider capability experiment**; it does not change production credential storage or establish Android test evidence.
- The other project's emulator was normally shut down under separate explicit user authorization, without clearing its application data.

## Verified Provider / request configuration

- Provider profile: `workspace`, classified from the newly authorized credential in process memory; no previous credential was reused.
- Endpoint: host `maas.qianwenaiapi.com`, path `/compatible-mode/v1/responses`. Only this HTTPS endpoint was used.
- Model: `qwen3.8-flash`.
- Tools: `web_search`, `web_extractor`, in one request; no code interpreter.
- `store=false`, `stream=false`, no `conversation` or `previous_response_id`; `reasoning.effort=low`, output limit 2048 tokens.
- Official evidence checked before the call: [Responses API](https://platform.qianwenai.com/docs/api-reference/chat/openai-responses), [Web Search](https://platform.qianwenai.com/docs/developer-guides/tool-calling/web-search), [Web Extractor](https://platform.qianwenai.com/docs/developer-guides/tool-calling/web-scraping). Responses documents the endpoint, model/tools, non-stored response option, structured sources, and extractor `urls` / `goal` / `output`.

## Verification results

- Independent, temporary desktop client and tests contain no real credentials and are outside the repository and application build.
- Test-first evidence: the initial placeholder failed all **34** cases as expected. Implemented client then passed **34/34**, zero failures/skips; the same suite was rerun before the real request and remained **34/34 PASS**.
- Tests cover structured-source acceptance, empty/wrong-type/unsafe/overlong sources, failed search, final-text-only URL rejection, extractor verification/failure/malformed structure, bounded unknown items, incomplete/error responses, wrong model, missing final message, numeric usage, malformed JSON, success/error body size, output count, reflected credential, 401/403/429/500/302, unsupported model/tool, chunk limits, cross-chunk reflection, fixed request body, and no retry after timeout.
- Client / runner syntax checks: **PASS**.
- Android test compilation / instrumentation / device KeyStore / Capacitor: **NOT RUN**, deliberately outside this newly authorized desktop test. No Android or product acceptance is claimed.
- Real Responses POST count: **1**; no second call, retry, redirect, alternate endpoint, or direct request to returned source URLs.
- HTTP status: **200**.
- Response status: **completed**; model: **qwen3.8-flash**; final assistant message present, with no response error.
- Elapsed time: **25056 ms**.
- Completed `web_search_call` count: **1**.
- Accepted `action.sources` count: **9**. Each accepted source has `type=url`, bounded HTTP(S) URL, no userinfo. Sources were not extracted from final model text or independently fetched by the desktop client.
- Source hostnames only: `www.youtube.com`, `m.xiachufang.com`, `foodieat.tw`, `www.startsmart.gov.hk`, `icook.tw`, `www.facebook.com`, `www.hk01.com`.
- Verified completed `web_extractor_call` count: **1**; nonempty valid `urls`, `goal`, and `output` checked in memory only. Equality/intersection with the search-source URL set was **NOT VERIFIED**; no claim is made that the extractor read a particular search result.
- `usage.x_tools.web_search.count`: **1**; `usage.x_tools.web_extractor.count`: **1**.
- Executed client SHA-256: `936d6b5fbb3f3319ebde3d6cce0a8a0e85f4093a225158af0532acf58429dc4a`.
- Bounds: connection including TLS <=15 s; absolute read deadline <=90 s; overall <=120 s; success <=2 MiB; error <=64 KiB; output items <=128; individual accepted URLs <=4096 characters. Native Node HTTPS performs no redirects or retries.
- TLS certificate and hostname verification enabled; no insecure override. Node default trusted CAs are used, not claimed to be the Windows system trust store. HTTP/TLS debug logging was disabled.

## Privacy result

- The user voluntarily disclosed the credential in chat after being advised not to. **Chat exposure already exists**; do not claim it was erased or that the credential was never in chat. Revoke/replace this credential after the experiment.
- Only the current authorized user message was used in a short-lived desktop process; no literal credential was placed in a tool command, new script, environment variable, fixture, Git, SQLite, backup, report, or packet. Production Android secret storage was not read or changed.
- Exact-byte credential containment checks on request JSON, bounded raw response, and sanitized output: **PASS**. Credential-bearing Authorization is used only for the fixed official endpoint, not in model input. General Unicode-escaped/encoded reflection detection was **NOT VERIFIED**; these narrow checks are not a universal no-leak guarantee.
- Full prompt, response, extracted page text, source paths/queries/fragments, headers, upstream error messages, and private data were not printed or saved as experiment artifacts.
- Mutable credential and response buffers were zero-filled; the process exited after the one call. JavaScript/TLS immutable string copies cannot be guaranteed cryptographically erased; this is not an Android-native memory-security claim.
- Android Logcat / Native KeyStore checks: **NOT RUN**. No Android request or Android log output was generated by this desktop experiment.
- A credential-free attempt marker prevents repeating this desktop request. The paid-call budget is exhausted; do not rerun the runner without new explicit authorization.
- Read-only review identified prototype limitations: accepted source URLs are syntax-checked, not DNS/IP public-address-checked; search `action.type` and extractor/search URL intersection are not enforced. Observed hostname summaries are public-looking domains, not independently DNS-verified. This throwaway client must not be promoted into production; future native implementation must inherit the approved URL/security boundaries and add the relevant negative tests without reusing this exposed credential.

## Final decision

**FIND_RECIPE_RESPONSES_FULL_PASS — DESKTOP PROVIDER EVIDENCE ONLY**

The supplied workspace credential successfully accessed the fixed official Responses endpoint with `qwen3.8-flash`, both tools, structured search sources, completed extraction, and a final message. This removes the **Provider-capability uncertainty** for this desktop environment.

It does not complete the original Android-native Stage 0 compilation/instrumentation, prove the phone's configured credential is the same, or validate Android networking, KeyStore, bridge wiring, recipe quality, or independent availability of every source page. These remain **NOT RUN**, not failed. Further native integration requires separately approved work and secure in-app credential entry; no further real request is authorized by this experiment.

No production code, UI, SQLite, Backup, dependencies, versions, stable branches, or release tags were changed. No formal APK was built, and no APK-6 product implementation began.
