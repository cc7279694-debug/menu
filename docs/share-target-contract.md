# Android Share Target contract — APK-5B

Share is an entry, not an importer. Only ACTION_SEND/text/plain/EXTRA_TEXT. No SEND_MULTIPLE, attachments/content URI, HTML extra, VIEW/BROWSABLE, screenshot/video or automatic network/AI/save. No database/backup/storage schema or permission changes.

Native text is capped at32KiB UTF-8 before parsing. Extract every HTTP(S) candidate, exact deduplicate, require exactly one; title/newline/space wrappers allowed. Preserve path/query. Validate using existing WebUrlSafety.parse without DNS. True DNS/SSRF/redirect/TLS limits remain APK-5A responsibility when user clicks Read.

LocalShareTarget uses Capacitor8 handleOnNewIntent; BridgeActivity.load already dispatches initial Intent. Do not capture the same initial intent separately in load. Accepted receipt removes EXTRA_TEXT and ClipData from that in-memory Intent but preserves ACTION_SEND and lifecycle identity. Recreation ignores an Intent without EXTRA_TEXT; no persisted handled marker. Inbox lives only in process memory; new process may lose a pending share. Consume is synchronized and removes the sole item; redundant events/consume do not renavigate.

Plugin destruction and consume share one lifecycle monitor. A queued consume from a destroyed Bridge returns empty without touching the process slot; destroyed intent delivery is ignored. This is necessary because Capacitor quits its plugin thread safely (draining queued work), rather than cancelling all queued calls. The gate does not persist any receipt or change the inbox's one-shot ownership.

DTO: `{status:"empty"}` or `{id:UUID,status:"url",url,replaced:boolean}` or `{id:UUID,status:"invalid",reason:"no_url"|"multiple_links"|"unsafe_url"|"oversized",replaced:boolean}`. shareAvailable carries no URL/text; JS subscribes before initial consume and serializes drains. No plaintext raw share persisted or logged. The current pending slot can hold the most recently received share; replacement must be visibly explained and never replaces an active flow's URL or edits.

Ready local DB + safe home/library/settings/detail/changes/history, no viewer/dialog/lock/backup/uncertain state: new share may open Link Import and prefill. Empty idle Link Input can prefill. All editors/completion/AI/link-with-content/backup-preview/restoring/uncertain/viewers/dialogs defer without cancellation or loss. After deferral, return to safe page offers explicit Open/Ignore, never auto-opens. Invalid share shows safe reason/actions but does not eject an unsafe current flow.

Async lazy route opening revalidates state before committing URL/navigation. StrictMode/late listeners/remount/double consume must not duplicate routing. Shared URL itself is memory-only; banner shows hostname only, never query. Native/JS boundary excludes URL from ordinary diagnostic logging.

All tests generated data and fake Provider;0 real AI. Browser has no native Share entry; Fake Share Port is only a test boundary. Existing SQLite4/Preview7/Backup2 and APK-4/5A Back/IME stay unchanged. Version14/0.7.0-share-target, independent artifact; stop before APK-5C.
