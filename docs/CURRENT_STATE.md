# Current State

## Current stage

2026-10-06 — APK-6 RC2 implementation and fresh automatic/emulator verification are complete on `feat/recipio-find-recipe`, but physical/new-key Search acceptance is pending. Status: **APK_6_RC2_PENDING_DEVICE_TEST**. APK-6 is not accepted for promotion: the user's v17 Search for 土豆丝 returned invalid_output. Exact private Provider failure stage is unknown.

Frozen pre-repair feature: `a2ee25ba094e9f31dc5e99546a1fd15c26c4509b`. Stable local/remote main remains `8b2246dbfac674aa837cb25675893fbbef2d79c5` / `v0.8.0-share-intake`. No merge, release tag, deploy or next module. Original v17 artifacts/evidence and the separate unmerged Logo v16 remain unchanged.

## Implemented

- Search submits candidates through one completed `submit_candidates` function; selected-source extraction uses one completed `submit_recipe_draft` with the unchanged APK-4 Recipe schema. Strict JSON/schema validation remains mandatory; assistant JSON is not a fallback.
- Completed structured search sources remain the sole source authority. Full canonical path/query, evidence, exclusions and deduplication remain enforced. Selected extraction rejects executed search, foreign extractors and unexpected calls.
- Verified sources without candidate handoff have a specific stable error and Chinese guidance. No paid automatic retry, alternate provider/model or permission/dependency change.
- Existing Native schema → JS Zod → normalization → explicit/inferred/missing human Review → ordinary RecipeLibrary.createDetails remains the only save path. No Finder database/history/media entity.
- Local recipe library, Cooking, Change History, safe Backup/Restore, AI Intake, Link Import and Share Intake remain available. SQLite4 / Preview7 / Backup2 unchanged.

## Fresh final verification

After the last production prompt correction: full repo **193 files /1029 PASS**; native-app subset **69 files /441 PASS**; Native JVM **22 suites /188 PASS**; unfiltered connected Android **16 classes /105 PASS**, zero failures/errors/skips. The subset overlaps the full suite; do not sum them. Typecheck, lint, local build, Capacitor sync, Android lint, Debug/test builds and signing passed. Inherited warnings: five image lint warnings, large Web chunk and 37 Android lint warnings.

Actual installed v17 → v18 install-r preserved all eight-table rows/IDs/times/order, current/history/retained image SHA-256 and key-configured boolean. Flight-mode force-stop cold startup, retained detail/image/Guided/real Back, Backup SAF open/cancel and Finder entry/typing/leave passed. Search/extract/Provider/page-read/export-write attempts0; observed connected WebView external requests/runtime exceptions0. A cancelled SAF picker is not a fresh backup archive.

The first connected attempt was interrupted by an observed SystemUI ANR; its failed XML is retained, not counted as green. The passing full rerun left one known APK-5A generated save-test recipe. Strict pre-offline comparison caught it; exact fixture identity/content and unchanged prior rows were verified before deleting only that generated row and its two child rows transactionally, with no image deletion. All eight baseline tables then matched exactly. The first offline failure record remains; an independent offline rerun passed against a byte-identical copy of the original baseline. Production/test code was not changed for this cleanup.

## Delivery / safety

APK: `artifacts/recipio-find-recipe-v18-debug.apk`; package `app.recipio.local`; versionCode18 / `0.9.0-find-recipe-rc2`; **17,250,133 bytes**; SHA-256 `701e58e61f2e6b58f0185dc59fb4222bc8b13605f96b0e89f527302bfd1fcec6`. Debug only; byte-identical to the tested final build.

Evidence: `checkpoints/2026-10-06-find-recipe-rc2.md`, `verification/find-recipe-rc2.md`, `verification/find-recipe-rc2-android.md`. Review Packet: `artifacts/find-recipe-rc2/review-packet-apk-6-find-recipe-rc2.zip`, generated/read back after the clean focused commit; its manifest pins exact HEAD and hashes without self-referential documentation SHA. Private baselines, database/media, raw logcat/Provider response and credentials are excluded. Final Git/Packet metadata belong to the delivery report.

Only owned Recipio_Backup_36 /API36/emulator-5580 was operated and normally shut down without wipe. Original airplane/Wi-Fi/data settings restored/read back exactly. No physical phone/personal data or other project environment was operated. Real AI calls0; exposed chat keys not reused. Changed-text/APK/logcat bounded credential scans found0matches; this is not a universal non-disclosure guarantee.

## Next task / limits

Only user physical v18 retest remains: use the new key already configured in Native settings; **at most one Search for 土豆丝**, then stop. Do not automatically Extract/retry. Fake tests are not real Provider acceptance. If Search fails, record its safe stable category without another paid call. Do not promote main or begin another module before separate acceptance/authorization.

Inherited test-harness limitation: APK-5A's completeParser save test retains its generated row; preservation acceptance must detect and safely isolate it, never weaken equality or delete unknown data. Historical v17 numbers remain in its checkpoint, not reused as RC2 evidence.
