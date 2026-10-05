# APK-5A security / SSRF evidence

## Production safety model

React passes URL/request UUID only; Native `LocalWebImportPlugin` owns GET/cancel. `WebUrlSafety` rejects credentials, non-HTTP(S), non-default ports, local/private/reserved/benchmark/documentation/multicast addresses and mapped IPv6 forms. Every DNS answer must be public; one unsafe address rejects all. Every redirect revalidates URL/DNS/address set. No social-platform exception.

Each hop freezes validated addresses in custom OkHttp Dns used by the actual connection, with a fresh non-reused connection pool. No proxy, automatic redirect, retry, Cookie, Authorization or Referer. System TLS/certificate/hostname checks retained; HTTPS cannot downgrade. Budget: connect8s/read12s/total20s including DNS, max3 redirects, decoded/UTF-8 HTML or XHTML max2MiB. Cancel closes owned Call/DNS work. Third-party HTML never executes in WebView.

Platform cleartext access is deliberately enabled solely to support approved HTTP input. This is a documented broader native platform capability, not a general unrestricted fetch API; public URL/IP/default-port guards still apply, WebView CSP and Qwen HTTPS endpoint unchanged. No new sensitive permission.

## Evidence matrix

| Boundary | Evidence |
| --- | --- |
| Literal/all-answer IPv4/IPv6/IP-mapped rejection | `WebUrlSafetyTest`:5 fresh JVM tests |
| Checked DNS actually binds TCP | `SafeWebFetcherTest.actualClientDnsAndSocketUseOnlyTheFirstValidatedResolution`: actual OkHttp DNS/socket with test-only local socket mapping; no second resolver used |
| Redirect private/local/scheme/credentials/port and downgrade | `SafeWebFetcherTest`: per-hop cases including manual loops/fourth-hop failure |
| Gzip/body/MIME/status/timeout/cancel/no proxy/cookies/pool | Same11 fetcher JVM tests with owned fake HTTP; strict Native request3 tests |
| Installed Capacitor safety boundary | New Android `nativePrivateTargets_areRejectedBeforeAnyHttp`; safe localhost UI smoke |
| Current network remains fail-closed | Public page attempt Native `dns_blocked` and host reserved198.18 DNS; no relaxation |
| Source/prompt/media persistence | Link service/Backup tests assert ordinary Recipe, no source or webpage media; current SQLite4/Backup2 unchanged |
| AI review | Existing APK-4 Zod/normalization/fieldChecks/gate used only after explicit choice; fake AI Android gate scenario |
| Cancellation/restore/uncertain saves | RED lifecycle regressions then final GREEN plus full regression; no stale UI activation, original UUID/readback and retained edit |

Fake Android interception is not sold as external TLS/DNS-rebinding coverage. Real client's socket binding is exercised separately in JVM. Tests are evidence, not a proof that hostile OS/root or every future network configuration is safe.

## Secret and privacy review

Final bounded module-diff credential scan PASS; final APK221 JS/JSON/HTML/DEX/XML entries PASS; dedicated AVD Logcat PASS, `artifacts/link-import/security-result.json`. Scanner avoids lexical false positives from CSS `mask-` properties; no detected Key printed or persisted in scan output. No user Key accessed; fake native keys stay in isolated generated test store with owned cleanup.

Static ownership review: real Qwen key remains Android Keystore-backed, JS has no plaintext getter; unchanged Native Provider reads the key and makes the request. Key never enters Recipe/SQLite/Backup. Review Packet explicitly excludes keys, DBs, private screenshots, full remote HTML, private URLs, cookies, signing data and raw logs. Per-entry hash/size/readback required after ZIP creation. Actual packets/commits scanned without echoing secret values.

Source URLs/HTML/visible text/drafts are session memory only, cleared on discard/save/restore; no Source or ImportJob tables. AI wrapper bounded and source-free. Remote pictures are neither automatically downloaded nor persisted; recipe/step media remain empty unless later manually edited using the existing local library. Screenshots used for APK-4 have their existing temp cleanup and do not become link cover, source history or backup assets.

No newly paid AI call. APK-4 user's genuine acceptance remains attributed to the user. No private physical-device scan, malicious-root test, independent penetration test or independent ChatGPT packet review claimed. An API Key previously exposed in chat is not scanned out of that history or claimed revoked by this task.
