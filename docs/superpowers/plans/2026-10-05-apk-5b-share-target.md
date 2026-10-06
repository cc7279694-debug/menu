# APK-5B approved execution ledger plan

Authority: user's complete 2026-10-05 APK-5B attachment; this file records its eight tasks, not a new product plan. SOL inline implementation and one final read-only review. Stop after delivery, no APK-5C.

## Contract

Goal: Android `ACTION_SEND` / `text/plain` unique public-page URL → existing Link Import prefilled → user explicitly reads. Share performs zero Fetch/Parser/AI/save. Dirty/locked/backup/uncertain/Guided/Focus flows stay intact; pending is process memory only. No schema/permission/dependency changes or cloud.

Base/task1: verify old main d01589e and accepted feature f7c5d8d, ancestor and clean worktree; authorize only ff main to exact f7c5d8de8cf2dde94cc61f2d7ca9f896e73417af and annotated v0.6.0-link-import. New feature `feat/recipio-share-target` starts there. v14 / 0.7.0-share-target; preserve v13/v12.

## Ordered tasks

1. Verify and fast-forward APK-5A to main, push version tag, verify refs, create feature branch. No code change.
2. Native text/Intent contract tests RED → pure unique-URL parser GREEN; ≤32KiB UTF-8, exact dedupe, WebUrlSafety.parse (no DNS); no attachment/coerce/HTML access.
3. Process-memory inbox and LocalShareTarget Capacitor lifecycle/bridge: cold+warm receipt, one-shot consume/late listener/no configuration replay. JS strict DTO and subscribe-before-consume; fake boundary tests.
4. Register only SEND/DEFAULT/text/plain on existing singleTask MainActivity; Android intent resolver boundary tests. No VIEW/BROWSABLE/new permission.
5. LibraryApp minimal pending routing: safe direct prefill, protected flow banner, explicit later open/ignore, invalid explanation. Same LinkImportService; no second import system or keyboard state.
6. Real/fake integration cold/warm/home/detail/dirty/AI/link/backup plus duplicate listeners and deferred navigation; no automatic network/storage writes.
7. Fresh full repo/app/share/link/AI/backup/typecheck/lint/local build/sync/JVM/Android lint/debug assemblies/connected tests; retain actual logs/counts, never reuse APK-5A results.
8. Installed Android share-sheet/Intent/cold/warm/IME/offline/v13→v14 preservation using generated data. Whitelist Packet/hash/readback, documents, focused commit/push/clean; main remains f7c5d8d. Physical OEM evidence explicitly separate.

## Shared interfaces / review focus

2→3: parsed union feeds synchronized one-shot inbox, never stores raw Intent text. 3→5: shareAvailable is only a hint; explicit consume is authority, no event payload containing URL. 5→6: safe route predicate conservatively defers edits/requests/restores/viewers; asynchronous lazy opening must re-check current route before prefill. 6→7→8: production/test implementation fixed before final regression/artifact comparison.

Review: original cold Intent re-delivery after configuration; events during listener registration/consumption; render vs native callback races; pending arriving during lazy import or write lock; no overwrite of active draft/URL; URL query privacy in Capacitor logging; content URI untouched; shared source absent from Backup/media; complete final evidence.

Expected Task1 refs equal exact accepted f7c5d8d. Expected RED is the missing new behavior, not a broken existing module; each implementation task runs its full related suite GREEN. Final status only APK_5B_COMPLETE / APK_5B_PENDING_DEVICE_TEST / APK_5B_BLOCKED according to actual approved gate.
