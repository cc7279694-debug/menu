# Diagnostic source evidence — not production functionality

These files are copies of the local PC tools used for this diagnosis. No sample configuration, response HTML/body, note ID, token, media, class/jar binary or secret is included. They are not imported/bundled by RECIPIO.

- `R3NativeProbe.java`: compiles alongside unchanged production `SafeWebFetcher`, `WebUrlSafety`, `WebImportFailure`; production all-address validation and per-hop pin still run. System DNS is default; diagnostic-only DoH is explicit.3HTTP cap enforced before connection, no automatic retry. Output includes a **private page envelope**: never launch it straight into chat, terminal logs or CI. Use a captured local subprocess. Safe sidecar contains only trace/error category, written CREATE_NEW before UTF8 output. No test loopback socket factory is on its classpath.
- `doh-resolver.mjs` / `doh-cli.mjs`: standard A+AAAA DNS infrastructure only, fixed AliDNS bootstrap/original SNI/default TLS, bounded wire parser and both-family completion. Reuses the earlier isolated Douyin experiment resolver, not production; no platform resolver API. Numeric answers are a private child pipe; production validates every answer before pinning.
- `run_probe.py`: actual local orchestrator, private config/ledger outside Git, requires explicit authorized budget before any request, captures private output, invokes the sanitized analyzer. Its local paths are historical execution paths, not instructions to request another sample. No requests remain authorized for this task.
- `analyze_real.mjs`: imports the actual `xhs-page.ts`, reports only coarse state/ownership/count diagnostics; no page execution.
- `verify_cached_service.mjs`: offline replay through the actual Service using an in-memory, network-free Fake AI;0DB/saves. Input and stdout are respectively private cached page and safe receipt. Requires local private cache, not included and deleted after diagnosis.
- `verify_utf8_offline.py` / `CharsetBaseline.java`: synthetic-only encoding RED/GREEN with0HTTP. Chinese/Emoji roundtrip and sidecar overwrite refusal; does not read actual sample config.

Cached dependencies: JDK21, OkHttp4.12.0, Okio3.6.0, Kotlin2.2.20, Gson2.11.0; production safety sources untouched. Actual pure-JVM test commands/cache hashes are in `../tests/jvm-network-receipt.json`. Probe uses a separate classes directory without MockWebServer/TestSockets. Parent heap capped192MiB, child timeout35s, production total deadline20s. Do not add this resolver as a production fallback without a separate security review.

Reproduce synthetic product regressions from repository root:

```powershell
npx vitest run src/native/link-import --pool=threads --maxWorkers=1 --no-file-parallelism
npm run typecheck
npm run lint
npm run build:local -- --outDir <new-isolated-output>
node scripts/verify-ui-v2-isolation.mjs
```

A new real diagnostic requires owner-approved public input and a fresh bounded local config/budget. No real URL or body should be added to these files, fixtures, screenshots, logs or Git. This directory is evidence for independent inspection, not permission for further network work.
