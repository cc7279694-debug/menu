# APK-5B final verification — 2026-10-06

Status: APK_5B_PENDING_DEVICE_TEST — implementation, final automated and installed emulator gates PASS; only physical OEM Share Sheet Not Run. No earlier APK-5A or pre-patch green count is completion evidence.

## Scope and reproducible gates

Branch `feat/recipio-share-target`; accepted base `f7c5d8de8cf2dde94cc61f2d7ca9f896e73417af`. Authorized APK-5A fast-forward main promotion and annotated `v0.6.0-link-import` are complete. APK-5B stays feature-only; no force, main merge, deployment or APK-5C.

All commands below were run sequentially on the final implementation. Application/related subsets overlap the whole suite and must not be added to its total.

| Gate | Actual final result |
| --- | --- |
| `npm run test -- --pool=forks --maxWorkers=2 --no-file-parallelism --reporter=verbose` | 183 files / 982 PASS, 0 failures; 571.85s |
| `vitest run src/native` with the same flags | 59 files / 394 PASS; 129.15s |
| `vitest run src/native/share-target src/native/link-import src/native/ai src/native/backup` with the same flags | 39 files / 300 PASS; 87.57s |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors / 5 inherited Next image warnings |
| `npm run build:local` | PASS; inherited >500kB chunk warning remains |
| `cap sync android` | PASS; 1.079s, existing SQLite/filesystem plugins only |
| Both new verification/Packet scripts: `node --check` | PASS |

Final raw command logs are generated-only under `artifacts/share-target/*-final.log`. Their final summaries and successful process exits were checked, not merely an old file tail. During an intermediate update an earlier build log was mistaken for the current gate; that update was corrected and the new gate then completed successfully. Native/Android, installed upgrade/offline checks and exact APK metadata belong to `share-target-android.md`.

## RED → GREEN / diagnostic boundaries

- Native initial cold launch failed when consumed ACTION_SEND identity was changed to MAIN. Preserve action, remove only EXTRA_TEXT/ClipData; real lifecycle tests now cover late JS, recreation and warm delivery.
- Deterministic actual native test: destroy the old plugin, publish a new process receipt, then run old queued consume. Before the lifecycle monitor it returned URL instead of empty (RED); synchronized destruction/consume gate fixes the race. No second inbox or persisted handled marker.
- JS listener retry, lazy-unmount ownership, portal-close and cleared-active-URL eligibility were reproduced then fixed. Removing lazy owner guards produces RED; restored implementation passes. Existing LinkImportService owns URL state; no duplicate importer.
- Legacy initialization fixture omitted Capacitor registerPlugin; partial mock preserves real exports and original DB-failure/recovery assertions. Link tests now wait for enabled Save after cancellation; the ambiguous-write fixture isolates an unrelated title query without weakening draft/reconciliation assertions.
- Interrupted/resource-contended runs and older green counts are retained only as diagnostics. Owned AVD is stopped during JS/build work; Mirra5554 is never operated. No deleted assertion, increased global timeout or production delay/debounce.
- Full Android diagnosis showed startup database-lock errors after the old native Dialog fixture closed Activity before local bootstrap readiness. Waiting for real local navigation removes that invalid test sequence; no SQLite production change. Exact interrupted transaction is not proven by retained logs.
- Real IME traces showed overlapping show/hide animation. Test-only AndroidImeProbe observes platform animation completion, visibility and focus before original assertions; it neither changes the keyboard nor intercepts Back. Production Back/IME routing is unchanged.

## Safety / evidence boundary

SQLite4 / Preview7 / Backup2, dependencies, permissions, migrations, AI provider/key/parsing and backup/media ownership paths are unchanged against main. Automatic Share Fetch/Parser/AI/save0; paid/real Qwen calls0. Native Fake HTTP and fake Provider are not real-network acceptance. Existing APK-4 user acceptance remains separately attributed user evidence.

Final source/staged/APK/Packet scans and diff audit are required in the committed delivery workflow; exact metadata and readback are fixed by the Packet builder. Installed preservation/offline gates PASS with exact cover decoding, unchanged eight-table snapshots and restored network readback. The verification script's Windows double-CR and API36 resumed-field assumptions were corrected without changing production or relaxing assertions; final script flow and full lint reran. Physical OEM Share Sheet is Not Run; browser/JS fake ports cannot replace native Android verification.
