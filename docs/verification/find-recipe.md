# APK-6 final verification

## Tested implementation

Feature `feat/recipio-find-recipe`, based directly on stable main `8b2246dbfac674aa837cb25675893fbbef2d79c5`. No experiment history, main merge, deployment, version tag, video feature or new database entity.

Final JavaScript regression is after the synchronous Preview-cleanup transition repair. Final JVM regression is after the Finder-only HTTP5xx classification repair. No real Provider requests: all automated responses are generated Fakes. Final artifact manifest pins the committed implementation and exact delivered APK; documentation does not invent a self-referential final commit.

## Final automated evidence

- `npm.cmd run test -- --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=default --reporter=json --outputFile=artifacts/find-recipe/final-tests.json`:193 files /1027 tests PASS,564.46s; fresh start20:38:12 after the final Android fixture repair. JSON readback confirms0failures/pending tests.
- `npm.cmd run typecheck`:PASS.
- `npm.cmd run lint`:PASS,0 errors,5 inherited Next image warnings in legacy Web components.
- `:app:testDebugUnitTest --rerun --offline --max-workers=1 --no-daemon`:21 suites /174 tests PASS,0 failures/errors/skips,47s. Fresh report timestamp2026-10-06T20:39:39+08:00; task actually executed, not up-to-date reuse.
- `npm.cmd run test:apk -- --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=default --reporter=json --outputFile=artifacts/find-recipe/final-native-tests.json`:69 files /439 tests PASS,131.66s; fresh start20:48:18, JSON readback0failures/pending tests. Includes APK-6, APK-4 AI, Link Import, Share and Backup suites; it is a subset of1027, not439additional unique tests.
- `npm.cmd run build:local`:PASS,2193 modules; existing main-chunk size warning remains (559.27kB), new lazy Finder chunk7.87kB.
- Capacitor sync:PASS,0.748s after fresh16s local build. Explicit `:app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest`:PASS, Android lint0errors /37 inherited warnings;234 tasks,37 executed,197 up-to-date,1m12s. Final APK remains byte-identical to the device-tested candidate.
- Actual installed v16→v17 preservation and flight-mode cold-start walkthrough:PASS. Repaired specialist16/16 and fresh unfiltered Android105/105PASS,16classes,0failures/errors/skips; see Android verification. The earlier incomplete run is retained, not used as green evidence.

## Scope and negative coverage

Local typing/entry produces zero paid calls. Explicit Start and selection are independent one-call boundaries. Search authority is structured completed sources only, including full path/query; candidate invention, unmatched links and executed search in extraction fail closed. Zero/one/three candidates, malformed/oversized JSON,401/403/429/5xx, timeout/cancel/restore, late results, Preview review confirmation, duplicate warning and uncertain-save recovery are covered by generated tests.

The externally extracted draft passes the unchanged AI schema/normalization/Review and ordinary Recipe saver. SQLite4 / Preview7 / Backup2 remain frozen. The Node SQLite/ZIP privacy regression checks that source/query/preferences/raw envelopes are absent; this is not a claim of running that Node test in Android.

## Repair evidence, not hidden historical greens

- External AI handoff reservation, dirty existing AI owner and escaped-source URL:3 failing tests reproduced before repair.
- Full canonical dot-segment/root-path preservation and duplicate page Back:2 failing tests reproduced before repair.
- Deferred Preview discard versus a new action:1 failing test reproduced before synchronous transition/generation repair, then6 files /29 tests PASS.
- Native zero-candidate/preparation evidence:4 failures reproduced, then Native feature30/full174 PASS.
- HTTP5xx misclassified as credential rejection:1 failure reproduced in14 client tests; fixed Finder-only and full174 rerun PASS.

Earlier1026/438/build results predate repairs and are historical only. Independent read-only review found no remaining Critical/Important code defect; it did not run devices or Provider calls.

## Explicitly pending

User physical phone with a new Native-configured key, actual Responses search and selected-source extraction (at most two paid POSTs), actual source readability and device/OEM behavior. Do not reuse previously exposed keys or interpret mocked requests as new Provider acceptance. `store=false` does not establish Provider operational-log deletion.

## Existing warnings outside this module

The legacy Next image lint warnings, native main-chunk size warning, Android lint warnings and Vite future native-config-loader notice are retained, not suppressed. The inherited `src/features/cooking-history/queries.test.ts:34` also emits a future-Vitest-major unawaited-assertion notice while passing under the current pinned version; no dependency upgrade or unrelated legacy-test refactor is part of APK-6.
