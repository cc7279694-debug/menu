# APK-5C-B Stage 0 — Douyin public video link feasibility

Date: 2026-10-06 (Asia/Shanghai). Status: **Experiment completed; DOUYIN_PLATFORM_LIMIT on both supplied samples**.

Decision: **DOUYIN_FEASIBILITY_NO_GO**, limited to the observed unauthenticated static public-page path under the frozen constraints. This is not proof that all platform paths/videos are impossible to resolve.

This is an isolated experiment, not APK-5C-B implementation. Stable main/release remain `8b2246dbfac674aa837cb25675893fbbef2d79c5` / `v0.8.0-share-intake`. Branch: `exp/douyin-video-link-feasibility`. Previous experiment baseline: `0b8f8d9a28cb5a44a9b77e1fe37579e5fa903c01`.

## 1. Goal

Determine whether the original Sample A/B public links yield an AI-eligible video resource through unauthenticated redirects, inert HTML, standard metadata or already-public embedded JSON. Keep iKuuu/TUN as found, replacing only experimental DNS with independent DoH plus pinned HTTP/TLS. No AI request is permitted. Successful media headers would not themselves prove Qwen server-side access or recipe quality.

## 2. Product constraints

No production changes, login, browser cookies, Authorization, Referer, private headers, signature reconstruction, private APIs, JavaScript execution, challenge bypass, third-party video parser or full-video download. No production dependency, database/backup change, APK build, version bump, tag, release, deployment, main integration or formal APK-5C-B branch.

AliDNS is standard DNS infrastructure, not a Douyin parsing service. Its use is authorized for this experiment only, not as a production fallback.

## 3. Samples tested and DNS self-check

Only the two supplied samples were tested, unchanged. No guessed correction, replacement, extra video or fabricated short link. Inputs were transient CLI arguments, never stored in this repository or report. Outputs retain labels, host/type, counts, booleans and categories only.

Final DNS self-check:

| Host | System DNS | System count | DoH DNS | A | AAAA | All accepted addresses public |
| --- | --- | --- | --- | --- | --- | --- |
| `v.douyin.com` | FAKE_IP | 1 | PUBLIC | 16 | 0 | true |
| `www.douyin.com` | FAKE_IP | 1 | PUBLIC | 20 | 12 | true |

Both A and AAAA queries completed. Empty AAAA is accepted only as a successfully completed valid response; a failed AAAA lookup never becomes A-only success. CDN counts varied across earlier fresh checks. Each request freezes its own fully validated set; no address values are output.

| Final live evidence | Sample A | Sample B |
| --- | --- | --- |
| Original/final host/type | `www.douyin.com`, numeric video page | `www.douyin.com`, numeric video page |
| Request-time DNS | DoH PUBLIC, 20 A + 12 AAAA | DoH PUBLIC, 20 A + 12 AAAA |
| System DNS (diagnostic only) | FAKE_IP, 1 address | FAKE_IP, 1 address |
| HTTP status / MIME | 200 / text/html | 200 / text/html |
| In-memory HTML bytes | 72,914 | 72,914 |
| Redirects observed | 0 | 0 |
| Visible body / title | absent / absent | absent / absent |
| Scripts | 2 | 2 |
| Known nonce/signature markers present | true / true | true / true |
| Response issued known nonce-cookie name | true | true |
| Standard / embedded video candidates | 0 / 0 | 0 / 0 |
| JSON blocks / parsed blocks | 0 / 0 | 0 / 0 |
| Candidate count / media checks | 0 / 0 | 0 / 0 |
| Probe duration | 188 ms | 190 ms |
| Classification | **CLASS C — NOT PUBLICLY RESOLVABLE** | **CLASS C — NOT PUBLICLY RESOLVABLE** |
| Limit category | **DOUYIN_PLATFORM_LIMIT** | **DOUYIN_PLATFORM_LIMIT** |

## 4. Redirect findings

Both requests completed at the original full-page host with zero redirects; no redirect host arose. Real short-link HTTP is **Not Run** because neither supplied input is a short link. The `v.douyin.com` DNS check is not short-link HTTP evidence.

Offline tests cover three-redirect maximum, loops, HTTPS-to-HTTP rejection, URL validation, fresh DoH/all-address validation and pinned connection on every hop. Private redirect targets fail before HTTP. No short code was invented.

## 5. Public HTML findings

Both real HTTP responses are script-only challenge documents rather than readable recipe/video pages. Each has no visible body/title, two scripts, literal known nonce/signature markers, and a response header issuing the known nonce-cookie name. Only presence booleans are retained; no Cookie values or scripts are output/saved.

This combination supports an observed platform challenge under the frozen no-JavaScript/no-cookie path. The probe does not execute/decode the scripts, compute signatures, replay cookies or attempt a solved request. Login was not observed and is not asserted as mandatory. Video existence/public availability behind the challenge remains unverified, including the unmodified Sample A input.

## 6. Standard metadata findings

On the actually returned challenge documents: no OG video fields, Twitter player/stream fields or Schema.org VideoObject candidates. This does not describe a page that might become available after rendering/authorization.

The inert parser covers OG URL/type, Twitter player/stream and JSON-LD VideoObject content/embed URLs. Player embeds are not automatically accepted as media files. Offline fixtures are parser checks, not Douyin success evidence.

## 7. Embedded data findings

Both responses contain zero static JSON blocks, zero parsed blocks, no recognized public video fields and no candidate URL. Scan limits were not reached.

The bounded parser handles JSON script blocks, URL-encoded RENDER_DATA, known bootstrap blocks and plain JSON assignments. It never evaluates JS or reconstructs signatures. Arbitrary body-derived field names are normalized to allowlisted categories. No page state or raw field values are persisted.

## 8. Media URL validation

Real candidate HEAD/Range is **Not Run — no candidate**, not a failed download. Video MIME/status/range/length, actual Cookie/Referer requirements, token expiry and short-window availability are unknown. No real media bytes were read.

Future candidates must independently pass DoH, all-address checks and pinned HEAD/Range/redirect/recheck connections. No Cookie/Authorization/Referer is sent. Range reads at most 64 KiB even when ignored; non-HTML page GET closes without consuming media. Eligibility requires video MIME, MP4/WebM/AVI header and one five-second-window availability recheck. At most two of eight candidates are checked, with limits reported. This is not full codec validation or long-term CDN stability proof.

## 9. Official API findings

Primary Douyin documentation was rechecked this run; no account/API request or third-party parser was used.

- [Query video basic information](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/posting-task/video-basic-info): permission/user authorization and videos uploaded by the token's user, not an arbitrary public-link-to-media resolver.
- [Get IFrame by video ID](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/iframe-player/get-iframe-by-video): public IDs return iframe/player code and metadata, not a media-file URL suitable by assumption for AI.
- [Douyin video search](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/douyin-search-capability/aweme-dy-video-search): app capability/client token and keyword results containing page links/metadata, not a general share-link-to-MP4 contract.

These inspected capabilities do not establish a matching resolver for RECIPIO. This is not proof that no other partner/private capability exists. Developer eligibility and access-controlled APIs were not tested.

## 10. Network environment and independent DoH

The previous system-DNS-only attempt stopped at benchmark/Fake-IP. Correct meaning: **NETWORK_ENVIRONMENT_BLOCKED / INCONCLUSIVE**. Earlier NO_GO product-gate wording must not be reused as platform evidence. This report supersedes it with new successful HTTP observations, not reinterpretation of the old failure.

`System DNS -> diagnostic categories/counts only`

`A + AAAA over DoH -> validate every address -> freeze set -> pinned HTTP/TLS -> inert HTML summary`

Endpoint: `https://dns.alidns.com/dns-query`, RFC 8484 binary POST. Bootstrap uses the [official AliDNS public IPv4 addresses](https://alidns.com/) so even DoH HTTPS does not consult system Fake-IP. Original dns.alidns.com SNI/hostname/certificate verification remain enabled. No insecure TLS, proxy override or DNS/VPN/TUN configuration change. TCP routing is left to the existing user environment. AliDNS sufficed; no DNSPod fallback is implemented.

Questions, names and types are bound; malformed/oversized/truncated/error responses fail closed. Only Answer-section IN CNAME chains and the requested address type qualify. CNAME targets must be unique and acyclic. Unexpected non-Answer address/CNAME records are rejected, not ignored/promoted. Every resulting A/AAAA is checked before connection. Any private, loopback, link-local, multicast, documentation, benchmark/Fake-IP, reserved/special or non-global-unicast IPv6 address blocks the whole set. IPv4-mapped IPv6 is rejected. No system-DNS request fallback.

References: [RFC 8484](https://www.rfc-editor.org/rfc/rfc8484), [IANA IPv4 registry](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml), [IANA IPv6 registry](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml). The conservative address policy does not promise support for every specially assigned globally reachable exception.

Future DoH/pinned-connection failures, including candidate failures, yield NETWORK_ENVIRONMENT_LIMIT and null/undetermined classification: **DOUYIN_FEASIBILITY_NETWORK_BLOCKED**, never platform NO_GO. This run did not hit that case. Desktop Node/TUN evidence is not Android verification or AI-server media-access proof.

## 11. Security boundary and unchanged production

LocalWebImport, SafeWebFetcher, WebUrlSafety, APK-4, Share Target, Android Manifest, SQLite, Backup, dependencies and versions remain unchanged. Production Fake-IP rejection stays intact. The experimental resolver is not imported by production.

Every destination connection uses its fresh immutable validated set with original URL hostname, Host/SNI and normal certificate verification. Redirects repeat the same process. Bounds: 20 seconds per hop, 10 seconds for DoH, 2 MiB HTML, 64 KiB media read, identity encoding. These are experimental limits, not exact Native whole-operation parity.

No full sample URL/ID/query/token, HTML, Cookie value, media body, raw error, Key, Prompt or Provider response is output/persisted. Fixed known-cookie names are boolean checks only; cookies are never reused. No network setting or unrelated process was changed.

## 12. Maintenance assessment

Both supplied inputs returned challenges rather than publicly parseable video metadata. Bypassing that challenge would violate the frozen constraints and is not an approved stable-product foundation. Do not add signatures, cookies, third-party parser accounts or headless browsers.

Possible separately approved alternatives: user text/screenshots (existing intake), a permitted locally shared/exported video file, genuine public media URLs, or a documented matching official capability if one is found. They have different effort/access/privacy limits. None was implemented or selected as the next module. No Omni/Qwen call/model check occurred.

## 13. Final recommendation and stopping point

**DOUYIN_FEASIBILITY_NO_GO** for formal automatic Douyin-link video intake based on the observed path. Sample A/B are both **CLASS C — NOT PUBLICLY RESOLVABLE** under unauthenticated/static/no-bypass constraints, with actual challenge evidence. Not a blanket impossibility claim or proof that login/private APIs are required.

The experiment question is answered: real DNS/pinned requests work while TUN is untouched; platform challenges prevent finding eligible media. Stop here: no main merge, formal feature branch, APK build or video development. Short-link inputs/new permitted paths would need their own evidence, not silent substitution.

### Verification and execution record

- Final offline experiment checks: **35/35 PASS**, two .check.mjs files, 839.8804 ms final root run; synthetic DNS/HTTP/HTML/media only.
- RED -> GREEN verified DoH querying/binding, all-A/AAAA semantics, strict pinning, immutable sets, IPv6 rejection, fresh redirect validation, challenge classification/privacy and review-discovered raw-label/Answer-section/CNAME-cycle defects. Valid CNAME resolution remains covered.
- Final `node --check` for all four scripts and scoped ESLint: **PASS**, exit 0.
- Full existing Vitest suite attempted with one thread worker/no file parallelism; remained at RUN with no completed file/result summary. Only the verified experiment-started runner was stopped. **Not Completed, not PASS**; no cause inferred or product tests/configuration changed. Historical APK-5C-A counts are not reused.
- Android tests, Web/APK build, typecheck: **Not Run — production unchanged/outside experiment**. Real AI/Qwen: **0 calls**.
- Live DNS/page execution: completed for both original samples with platform-limited results above; no cookie replay/script execution/account access/media download.
- Final privacy scan: **5 allowed files, 0 actual sample-identifier/full-URL hits, 0 secret-pattern hits**. Diff whitespace check PASS; no production reference to the resolver/probe and no production file changes.
- Independent read-only final review: **PASS, no remaining substantive finding**. Reviewer independently reran **35/35** offline checks and all four syntax checks; no real network/AI request or reviewer edit. Report classification, privacy and unrun-check boundaries were also reviewed.
- Changes restricted to this report and four experiment scripts/tests; no new dependency.

Offline command: `node --test scripts/experiments/doh-resolver.check.mjs scripts/experiments/douyin-probe.check.mjs`. Public probes take original inputs only as transient CLI arguments; never put them in a script/report/raw-body log.

### Resume checkpoint

Completed: experiment-only DoH/pinning, fresh real-DNS self-check, original A/B page access, inert metadata/bootstrap/challenge inspection, official API assessment and scoped safety checks. Short-link HTTP and real media checks are Not Run for lack of those inputs/results, not network-failure evidence. Production and stable main stay frozen. This result authorizes no follow-on product module.
