# APK-5A Link Import contract

Approved 2026-10-05; implementation evidence is separate from this specification.

## Data and trust boundary

`UI → LinkImportService → LocalWebImport → SafeWebFetcher → OkHttp` reads only public HTTP(80)/HTTPS(443). All resolved addresses must be global unicast; freeze the validated set into per-hop OkHttp DNS, bypass proxies, disable automatic redirects. No authentication or website execution. Return only `{finalUrl, contentType, html}`; no source headers, methods or caller-chosen IP. One overall 20s deadline, connect8s/read12s, at most3 redirects; HTTPS never downgrades. Decoded/decompressed HTML/XHTML ≤2MiB.

Cheerio consumes inert HTML strings and reads JSON-LD before removing script elements. Candidates use title20, ingredient thresholds1/3/6 each10, step thresholds1/3/6 each10, valid time/yield/calories each5, matching final URL5; ties break by counts then document order. Two complete top candidates within10 points require user selection. Complete=title+ingredient+step; partial=title+either; otherwise none.

Durations are valid ISO amounts only; yield must be unambiguous. Calories only explicit kcal/calories. Ingredient splitting is conservative and lossless. No guessing. Parser drafts have empty notes, null cover and null step images, and map to existing RecipeDetailsInput. Parser preview permits ordinary editing/save without an AI checkbox.

Visible blocks come from article/main/body; no scripts/styles/nav/header/footer/aside/form/iframe/object/embed/template/noscript/hidden/aria-hidden content. Preserve paragraphs/lists/headings/table text and remove duplicate blocks. Cap text at28,000 Unicode code points with recipe-section priority; warn when truncated, never silently slice the page. AI receives only sanitized title/partial summary/visible text within the existing30,000 limit, never URL/raw HTML/headers/local data.

Only user clicking AI may start existing APK-4 `AiIntakeService`; no automatic fallback. Existing secure native key/provider, validation/normalization, three-state field checks and user confirmation apply. Duplicate title prompts but never overwrites/merges/renames automatically. Both paths save via RecipeLibrary.createDetails and become normal local Recipe records.

Source URLs, HTML/JSON-LD/text/warnings and draft are memory-only, released on save/abandon/leave. Process death may lose unsaved input. Web images are not fetched or saved. No ImportJob/RecipeSource/schema/migration changes. SQLite4 and Backup2 remain frozen; INTERNET already exists. Automated fixtures and HTTP/AI fakes only; no paid requests.

## Stable error categories

invalid_url, unsafe_url, unsupported_scheme, unsupported_port, dns_blocked, redirect_blocked, too_many_redirects, network_unavailable, timeout, http_error, unsupported_content, page_too_large, page_unreadable, recipe_not_found, parser_partial, ai_key_missing, ai_failed, invalid_ai_output. Lifecycle adds busy/cancelled/stale_session/native_unavailable/storage_error/save_uncertain. UI never exposes raw exception messages or remote source data.
