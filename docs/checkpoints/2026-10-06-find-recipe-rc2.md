# APK-6 RC2 — function handoff repair

Date: 2026-10-06. Branch: `feat/recipio-find-recipe`.
Frozen pre-repair feature: `a2ee25ba094e9f31dc5e99546a1fd15c26c4509b`.
Stable main: `8b2246dbfac674aa837cb25675893fbbef2d79c5` / `v0.8.0-share-intake` unchanged.

## Why this repair

User physical v17 Search for 土豆丝 returned invalid_output. The screenshot proves failure, not the private Provider response's exact stage. Before production changes, generated Fake diagnostics passed while targeted new contracts failed (Native38 cases/21 failures; JS11 cases/2 failures). The test-only diagnostic publishes only completion/counts/a bounded stage. No raw response, private URL, page body or key is captured.

## What changed

- Search declares submit_candidates; only one completed function with strict string arguments is accepted. Candidate source membership/evidence/URL/exclusion/deduplication rules remain independent.
- Sources with no candidate function return candidate_output_missing and specific Chinese guidance; malformed/missing/extra field arguments do not fall back to assistant text.
- Extract declares submit_recipe_draft with the same frozen Recipe schema. Matching completed selected extractor remains mandatory; executed search/foreign extractor/unexpected tools block Preview.
- Finder locally replaces APK-4's no-tools/body-JSON wording only. A separate request-body test failed before this fix and passed afterward. Shared asset, factual semantics and existing APK-4 behavior unchanged.
- Existing Zod/normalization/explicit-inferred-missing confirmation/ordinary save remain the sole path.
- No model/provider/dependency/permission/persistence changes. SQLite4 / Preview7 / Backup2 unchanged.
- RC2 delivery and emulator scripts use separate paths, fixed actual v17→v18 preservation, immutable guards and Packet readback. Old v17 artifacts are not overwritten.

## Verification

After the last prompt fix: full repo193files/1029PASS, native-app69files/441PASS, Native JVM22suites/188PASS. The native-app suite overlaps the full suite. Typecheck/lint/local build/sync/Android lint/build/test-build/signature passed. Actual installed v17→v18 preserves data/images/key state. First connected run hit an observed foreground SystemUI ANR; it was stopped and archived at51/105 with9failed cases, not accepted as green. Native Close app dismissed the system dialog. Fresh unfiltered Android rerun:16classes/105PASS,0failures/errors/skips, Gradle8m4s. Real IME eight cases and Finder16 cases all passed.

The strict pre-offline comparison detected one generated APK-5A completeParser save-test row, not loss/change of previous data. Exact UUID-title/content/timestamp and every retained row were verified; only that generated row and its ingredient/step cascaded in a single transaction. No images deleted. Original failed offline evidence retained. Independent offline rerun against a hash-identical original baseline copy passed five checks: flight-mode cold startup/local image/Guided/real Back; native Backup SAF open/cancel; Finder typing/leave with0online calls; observed WebView external requests/runtime errors0; exact original network restore/readback. All eight tables/images/key state unchanged. Only owned AVD normally shut down, no wipe. See separate verification records. Real paid requests0.

## Delivery / continue boundary

`artifacts/recipio-find-recipe-v18-debug.apk`, app.recipio.local, versionCode18 /0.9.0-find-recipe-rc2;17,250,133bytes; SHA256701e58e61f2e6b58f0185dc59fb4222bc8b13605f96b0e89f527302bfd1fcec6. Debug only, byte-identical to the tested build. The clean feature HEAD and Packet readback hashes belong to generated metadata/delivery report. Code repair and regressions are complete; real Provider/physical Search acceptance is not claimed.

Only one physical/new-key Search for 土豆丝 remains authorized after final green regressions. No connected phone means pending user retest; no paid extraction, next module, main merge, tag or deploy.

Status: APK_6_RC2_PENDING_DEVICE_TEST (only physical/new-key Search acceptance pending; automatic/emulator regressions passed).
