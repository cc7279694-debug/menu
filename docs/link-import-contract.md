# APK-5A Link Import contract

Approved 2026-10-05; implementation evidence is separate from this specification.

## Data and trust boundary

`UI → LinkImportService → LocalWebImport → SafeWebFetcher → OkHttp` reads only public HTTP(80)/HTTPS(443). All resolved addresses must be global unicast; freeze the validated set into per-hop OkHttp DNS, bypass proxies, disable automatic redirects. No authentication or website execution. Return only `{finalUrl, contentType, html}`; no source headers, methods or caller-chosen IP. One overall 20s deadline, connect8s/read12s, at most3 redirects; HTTPS never downgrades. Decoded/decompressed HTML/XHTML ≤2MiB.

Cheerio consumes inert HTML strings and reads JSON-LD before removing script elements. Candidates use title20, ingredient thresholds1/3/6 each10, step thresholds1/3/6 each10, valid time/yield/calories each5, matching final URL5; ties break by counts then document order. Two complete top candidates within10 points require user selection. Complete=title+ingredient+step; partial=title+either; otherwise none.

Durations are valid ISO amounts only; yield must be unambiguous. Calories only explicit kcal/calories. Ingredient splitting is conservative and lossless. No guessing. Parser drafts have empty notes, null cover and null step images, and map to existing RecipeDetailsInput. Parser preview permits ordinary editing/save without an AI checkbox.

Visible blocks come from article/main/body; no scripts/styles/nav/header/footer/aside/form/iframe/object/embed/template/noscript/hidden/aria-hidden content. Preserve paragraphs/lists/headings/table text and remove duplicate blocks. Cap text at28,000 Unicode code points with recipe-section priority; warn when truncated, never silently slice the page. AI receives only sanitized title/partial summary/visible text within the existing30,000 limit, never URL/raw HTML/headers/local data.

Only user clicking AI may start existing APK-4 `AiIntakeService`; no automatic fallback. Existing secure native key/provider, validation/normalization, three-state field checks and user confirmation apply. Duplicate title prompts but never overwrites/merges/renames automatically. Both paths save via RecipeLibrary.createDetails and become normal local Recipe records.

Source URLs, HTML/JSON-LD/text/warnings and draft are memory-only, released on save/abandon/leave. Process death may lose unsaved input. Web images are not fetched or saved. No ImportJob/RecipeSource/schema/migration changes. SQLite4 and Backup2 remain frozen; INTERNET already exists. Automated fixtures and HTTP/AI fakes only; no paid requests.

Android cleartext policy explicitly permits the approved HTTP page input. This is not a new permission and does not relax Qwen's fixed HTTPS or the WebView CSP (`connect-src 'self'`, no remote frame/script/image); only the native public-page bridge accepts HTTP. HTTPS chains cannot downgrade. No trust-manager or certificate exception.

## Stable error categories

invalid_url, unsafe_url, unsupported_scheme, unsupported_port, dns_blocked, redirect_blocked, too_many_redirects, network_unavailable, timeout, http_error, unsupported_content, page_too_large, page_unreadable, recipe_not_found, parser_partial, ai_key_missing, ai_failed, invalid_ai_output. Lifecycle adds busy/cancelled/stale_session/native_unavailable/storage_error/save_uncertain. UI never exposes raw exception messages or remote source data.

## 2026-11-01 — Public Xiaohongshu reading and diagnostic refinement

The existing URL parser already accepts `xhslink.cn`, `xhslink.com` and
`xiaohongshu.com`, including valid share queries. No domain-specific IP exception
or production DNS fallback is added. All addresses on every redirect still must
pass the same public-address validation and remain pinned to the checked set.
`dns_fake_ip` diagnoses a refused 198.18.0.0/15 address, without claiming that a
VPN is active. Other unsafe/mixed private results remain refused. HTTP 401 maps
to `login_required`; 403/429 to `access_restricted`. Explicit HTML interstitials
can report `login_required` or `challenge_required`, including the platform's
final `/login` route. None is treated as a usable recipe source.

Generic visible-text and JSON-LD behavior remains. On those precise platform
host boundaries only, an additional inert reader recognizes public
`__INITIAL_STATE__` JSON and the target note's `note.noteDetailMap` entry. It
reads only title, description and media kind. No script execution, API calls,
cookies, signatures or media downloads. The only serialization extension is a
lexical conversion of bare JSON-value `undefined` to null, outside quoted
strings; all other executable syntax fails closed. Limits: 2MiB HTML, 256KiB per
state, depth32, 4000 nodes, at most4 state elements, and 28000 text code points.
Wrong/ambiguous note IDs, oversized states and malformed states do not fall back
to recommended notes or shell text. Hidden/executable content is excluded.

Reading is distinguished as complete (the original title+ingredient+step rule),
partial, title-only or unreadable. Title-only cannot initiate AI until actual
text is supplied. A local, explicit text supplement is capped at8000 code
points per addition and28000 total; it is part of this memory-only source and
released by the same session lifecycle. Adding text never initiates AI.
`supplement_too_large` leaves the prior source unchanged. The existing explicit
AI action, review gate, duplicate check, save UUID and uncertain-save recovery
remain. Missing steps in an AI result are visibly marked incomplete; no missing
amount, time or step is filled deterministically from a title or unread media.
SQLite4, Preview7 and Backup2 remain unchanged.
