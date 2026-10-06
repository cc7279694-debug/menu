# APK-5C-B Stage 0 — Douyin public video link feasibility

Date: 2026-10-06 (Asia/Shanghai). Status: **NETWORK_ENVIRONMENT_LIMIT / pending public-network retest**.

This is an isolated experiment, not APK-5C-B implementation. Stable main and release remain `8b2246dbfac674aa837cb25675893fbbef2d79c5` / `v0.8.0-share-intake`. Branch: `exp/douyin-video-link-feasibility`.

## 1. Goal

Determine whether the two user-supplied public Douyin links can yield a video resource through unauthenticated redirects, inert HTML, standard metadata or already-public embedded JSON. No real AI request is permitted. Finding an accessible media header would not itself prove Qwen server-side access or audiovisual recipe quality.

## 2. Product constraints

Keep the local app unchanged. No account login, browser cookies, Authorization, Referer, private headers, signature reconstruction, private APIs, browser JavaScript, challenge bypass, third-party resolver or full-video download. No production dependency, database/backup change, APK build, version bump, tag, release, deployment or main integration.

## 3. Samples tested

Only Sample A and Sample B were supplied; no additional videos were selected. Inputs were CLI arguments, never stored in this repository or this report. The supplied values were used unchanged; no guessed correction or replacement was made.

| Evidence | Sample A | Sample B |
| --- | --- | --- |
| Input host/type | `www.douyin.com`, numeric video page | `www.douyin.com`, numeric video page |
| DNS addresses returned | 1 | 1 |
| All addresses public | false | false |
| Benchmark/Fake-IP range detected | true | true |
| Failure | `dns_blocked` | `dns_blocked` |
| HTTP requests reached | 0 | 0 |
| Final sanitized probe duration | 27 ms | 4 ms |
| Classification | **Undetermined** | **Undetermined** |
| Limit category | `NETWORK_ENVIRONMENT_LIMIT` | `NETWORK_ENVIRONMENT_LIMIT` |

The requested A/B/C platform classification cannot honestly be completed before obtaining HTTP evidence. Neither sample is called platform CLASS C merely because DNS validation failed. The tool emits `classification: null`, `publicVideoFound: null`, and `UNDETERMINED_NETWORK_LIMIT` in this case. Earlier tool output that defaulted to C was corrected with RED → GREEN tests; it is not accepted as platform evidence.

## 4. Redirect findings

Not observed: both connections stopped before HTTP. Redirect count, final host and final path are unknown, not zero-hop success. Both supplied inputs were already full video-page links, so short-link resolution has not been tested. The probe permits at most three redirects, validates each new URL and all newly resolved addresses, detects loops, and rejects HTTPS → HTTP downgrade.

## 5. Public HTML findings

Not observed. HTTP status, MIME, HTML byte count, login/challenge status and empty-shell status are unknown. No HTML was downloaded or saved. The earlier DNS inspection returned public addresses; later Node and .NET checks both returned a single benchmark-range address. Current request-time DNS, not cached earlier answers, governs the decision.

## 6. Standard metadata findings

Not tested against these samples. The inert parser supports OG video URL fields and video type, Twitter player/stream fields, and JSON-LD `VideoObject.contentUrl` / `embedUrl`. Metadata presence and a player embed are not treated as proof of an actual media file. Synthetic tests cover this parser; those fixtures are not Douyin success evidence.

## 7. Embedded data findings

Not tested against these samples. The tool can statically parse JSON script blocks, URL-encoded `RENDER_DATA`, known bootstrap blocks and plain JSON assignments. It never evaluates JavaScript or reconstructs signatures. The scan is bounded; arbitrary body-derived field names are normalized to an allowlisted category before output. No page state or raw field values are persisted.

## 8. Media URL validation

No candidate reached validation. Candidate media URL existence, cookie-free accessibility, required Referer/private headers, expiry and short-window availability remain unknown. No HEAD/Range request to a real candidate and no real video bytes were read.

For a later unblocked test, validation uses HEAD, then explicit `Range: bytes=0-65535`, bounded to 64 KiB even when Range is ignored. A page GET that unexpectedly returns media is closed without reading its body. Success requires a video MIME, a recognized MP4/WebM/AVI header, and one five-second-window availability recheck. All bodies remain in memory only. This is a header-level eligibility check, not full codec validation or long-term CDN stability proof. At most two of eight discovered candidates are checked; a limited scan is explicitly reported.

## 9. Official API findings

Only primary Douyin documentation was examined; no third-party download service or source-code claim was used as success evidence.

- [Query video basic information](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/posting-task/video-basic-info): `posting.behavior`, permission application and user authorization; the documented IDs refer to videos uploaded by the token's user. This is not a documented arbitrary public-share-link → media-file resolver.
- [Get IFrame by video ID](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/iframe-player/get-iframe-by-video): public video ID support returns an embedded player/iframe, not a video-file URL that can be assumed suitable as AI `video_url`.
- [Douyin video search](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/douyin-search-capability/aweme-dy-video-search): app capability/client token and keyword search; the documented result contains a page link and metadata, not a general share-link-to-MP4 contract.

These checked capabilities do **not establish a matching official media resolver for RECIPIO**. This is a finding about the inspected documentation, not proof that every possible partner/private capability does not exist. Actual developer-account eligibility and undocumented/partner services were not tested. No new account, permission application or API call was made.

## 10. Network environment caveats

During actual sample attempts both Node's resolver and the independent .NET resolver returned benchmark-range addresses (`198.18/15`), which RECIPIO intentionally rejects. Proxy environment variables were absent, but that does not prove VPN/system routing was disabled. The precise VPN configuration was not inspected or altered.

Do not reuse the earlier public addresses, override DNS, whitelist Fake-IP, send through a third-party proxy, or switch to a browser to force success. A user-controlled network adjustment followed by the same public-only probe is required to complete platform classification. A browser page being viewable does not prove an unauthenticated native fetch or AI server can access the same media.

The experiment uses desktop Node transport, not an Android device network test. Results must not be presented as emulator/phone verification.

## 11. Security boundary

Inspection of the existing immutable `WebUrlSafety` and `SafeWebFetcher` confirms:

- HTTP/S only, normal protocol ports, no userinfo/local/private/link-local/benchmark destinations; all DNS addresses must pass validation.
- OkHttp DNS is pinned to validated results, no proxy or cookies, manual bounded redirects and no TLS downgrade.
- Native page fetching accepts HTML/XHTML only, has a 2 MiB limit and a whole-operation timeout. It is not a video downloader.
- Under an equivalent benchmark-range DNS answer the existing app would reject these inputs before HTTP. This is a code-path analysis, not an Android execution claim.

The independent tool preserves those URL/address boundaries without importing into app runtime. It has a 20-second per-hop timeout and at most four fetch hops, unlike Native's whole-operation deadline; it requests identity encoding and rejects other encodings rather than reproducing Native decompression. It is an experiment, not a replacement or a claim of complete Native parity. No network settings were changed.

No full sample URL, video ID, query, token, HTML, media bytes or raw error is output/persisted. Safe summaries use A/B labels, host/path type, booleans, counts, statuses and predefined failure categories. No cookies, AI key, Prompt or Provider response is involved.

## 12. Maintenance assessment

No public resolver has been proven stable. Therefore platform parsing cannot currently be promised as an installed product capability. If later evidence requires cookies, challenges, private APIs or dynamic signature bypass, stop rather than incorporate that dependency.

| Alternative | User effort | Stability / maintenance | Privacy / external dependency |
| --- | --- | --- | --- |
| Share a video file that the source app already permits sharing | Low when supported; otherwise unavailable | Avoids a platform URL resolver; needs a separate approved intake module | Local private temp file; explicit upload consent for optional AI |
| Save a permitted video locally, then select/share it | Higher, and source-dependent | No webpage resolver; source may prohibit saving | Local temp copy; optional AI upload only after consent |
| Official API if a documented matching capability is found | Setup/authorization cost | Potentially stronger contract, but current inspected capabilities do not match | May require app credentials, authorization and account data |
| Public video-file URL only | Low with a real public media link; unlike usual Douyin sharing | Narrower, simpler, still must validate expiry and accessibility | Public HTTP/S media plus an optional AI request |

Recommendation is not to add third-party parser accounts or anti-bot workarounds. Local-video intake remains a possible separately approved fallback, not implemented here.

## 13. Final recommendation

**NO_GO_PLATFORM_RESOLVER — product promotion gate only.** Do not start formal “copy Douyin link → automatic recipe” development from this evidence. No eligible public video resource was verified; public-page phases remain blocked by the current network environment. This does **not** establish technical impossibility of public parsing, nor that either input requires login/private APIs.

The Stage 0 experiment itself is **pending network retest**, not fully completed A/B/C classification. Resume with the same two conversation-supplied arguments after request-time DNS returns real public addresses; then inspect redirects/HTML/metadata/media and revise the decision from actual results. No product or architecture redesign is needed. No AI/model selection or production module is authorized by this report.

### Verification and execution record

- Isolated security/behavior checks: **17/17 PASS**, final observed duration 1036.686 ms; synthetic DNS/HTTP/HTML/media only.
- RED → GREEN covered environment classification (including nested candidate/recheck failure), zero non-HTML page-body reading, output field-name privacy and OG type detection.
- `node --check` for both scripts: PASS.
- Scoped ESLint for both experiment scripts: PASS (exit 0).
- Full existing Vitest suite: started separately with one worker, but produced no completed test summary; the identified runner and its own worker were stopped before handing off this network-blocked experiment. **Not Completed / not PASS**. No cause is asserted from this alone; no unrelated process or product test was modified. Prior APK-5C-A counts are not reused as current evidence.
- Android tests/build, Web/APK build, typecheck, real Qwen: **Not Run** (production unchanged / outside experiment). Real AI calls: **0**.
- Independent read-only script/report review: no remaining blocking finding; reviewer independently reran 17/17 offline checks. Concrete findings were fixed using failing tests first.
- Final sample-identifier and secret-pattern scan: 3 allowed files, 0 sample-identifier hits, 0 secret-pattern hits. No raw bodies, user inputs or sample logs are included in the commit.
- Only this report and the two experiment scripts may be committed. Current stable main, product source, Native code, dependencies, SQLite, Backup and version files remain unchanged.

Run the offline checks with `node --test scripts/experiments/douyin-probe.check.mjs`. For public probes, pass the user inputs transiently as CLI arguments; do not put them into a command file, report or captured raw-body log.

### Resume checkpoint

Completed: baseline/branch verification, isolated tool, test-first safety checks, actual DNS-limited attempts for both supplied samples, official documentation assessment and read-only review. Pending: real public HTTP/HTML/metadata/media evidence and honest A/B/C platform classification. Do not restart product planning or repeat successful tool work. No real AI call is needed for this Stage 0.
