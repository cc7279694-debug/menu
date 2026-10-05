# APK-5A approved execution record

Authority: user-approved APK-5A Web Link Intake attachment, 2026-10-05. This records its ten tasks; it is not a new product plan. Base `d01589e3540d80eb48592a75cf391c79c4533631`; branch `feat/recipio-link-import`; target Android 13 / `0.6.0-link-import`.

## Frozen constraints

Parser first, AI only after an explicit click. Native OkHttp with all-address global-unicast validation, request-scoped pinned DNS, no proxy, manual redirects (3), no HTTPS downgrade, 8s connect / 12s read / 20s overall, 2 MiB decompressed HTML/XHTML. Cheerio parses inert strings; no WebView loading, script execution, cookies, authorization, referer, remote image downloads or new sensitive permissions.

SQLite4 / Preview7 / Backup2 unchanged. Inputs and source metadata are memory-only. Save ordinary Recipe via existing `RecipeLibrary.createDetails`; all images null. AI uses APK-4 service, secure key bridge and review gate unchanged. No social platforms, video, search, Share Target, cloud, migrations or APK-5B/C.

## Task 1: Contract and generated HTML fixtures
Record contract; add eight small owned HTML fixtures. Validate narrow fetch DTO and plain recipe projection. Run failing contract tests before implementation.

## Task 2: URL / IP / CIDR validator
Native tests first for schemes, credentials, default ports, local names, all private/reserved/non-global IPv4/IPv6 including mapped IPv4 and mixed DNS. No platform bypass.

## Task 3: OkHttp fetch / DNS pin / redirect
Explicit compatible stable OkHttp dependency and license. Mock transport/DNS tests of actual client DNS path, redirect boundaries, decompressed size, MIME, timeouts and errors. Disable proxies and automatic redirects. One deadline across DNS and redirect chain.

## Task 4: Native Capacitor bridge
Only URL/request identity/cancellation; narrow checked HTML DTO; native worker and lifecycle; no arbitrary method/header/IP control. Lazy JS bridge, safe errors, late reply protection. Test before wiring.

## Task 5: Schema.org parser
JSON-LD object/array/graph/types, deterministic candidate scoring and near-tie selection; recursive HowTo sections; conservative explicit durations/yields/calories/ingredients; skipped-node warnings, no invented fields.

## Task 6: Visible text
article → main → body, hidden/boilerplate removal, block/newline/dedup preservation. Recipe-related priority selection at 28,000 code points; explicit truncation. AI wrapper ≤30,000, no URLs/raw HTML/scripts.

## Task 7: State and Parser Preview
Independent entry, read/cancel/error/candidate/partial/none/preview states, direct editable parser preview without AI checkbox; mobile and Back integration. Source session stays in memory and is released on leave/save.

## Task 8: Explicit AI / save / duplicates
Thin adapter to existing AiIntakeService and AiPreview; no provider calls before click; human review required where applicable. Idempotent save and restore-stale guard, duplicate warning with no overwrite. Ordinary local Recipe only.

## Task 9: Security and APK-1–4 regression
Generated sources and fake AI only. Source/HTML/URLs/images absent from persistence and Backup2; prompt injection inert; prior CRUD/media/cooking/history/backup/AI boundaries preserved.

## Task 10: Android acceptance and delivery
Fresh full tests, application tests, link/AI/backup suites, typecheck, lint, local build, Capacitor sync, JVM, Android lint, debug and androidTest builds, connected tests; actual device evidence distinguished from browser/fakes. Preserve v12; v13 APK plus size/SHA; whitelist review packet with readback hashes, checkpoint/current-state/decisions/architecture/product/roadmap. Commit and normal push feature only; remote==local, clean. Stop at actual APK_5A_COMPLETE / APK_5A_PENDING_DEVICE_TEST / APK_5A_BLOCKED.

## Execution rulings / evidence
Implementation ledger lives in ignored `.superpowers/sdd/2026-10-05-apk-5a-link-import/progress.md`; final checkpoint retains meaningful rulings and verification. User prescribed a feature branch in the current clean checkout: work in place rather than duplicate the configured Android environment in a worktree. No main changes, deploy or real AI re-verification.
