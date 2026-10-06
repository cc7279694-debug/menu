# APK-5C-A temporary media security

## Trust boundary

External Share Intent/ContentProvider is untrusted. Reject unsupported MIME and schemes before accepting images. ShareMediaReadService runs non-exported in a disposable same-UID private process, not the main Activity. Both provider MIME query and open/read occur there: CancellationSignal alone cannot bound a provider ignoring cancellation. No credentials or business database are accessible through this bridge interface.

The frozen image contract requires both an Intent READ flag and an actual temporary Android URI grant. A publicly readable provider without an explicit grant is intentionally rejected rather than used to bypass that boundary. Positive instrumentation fixtures use a protected test-only provider with provider-owned READ grant/revoke; missing real permission remains a negative case. This test configuration adds no application permission.

## Bounded staging

ShareMediaInbox tracks a30s read deadline from stage entry. Reader also links parent Binder death, unbind and its own deadline. Kill targets are verified same UID, exact private process name and non-main PID; an unknown/reused PID is never killed. Binder death alone is not the OS-reap barrier: the metadata worker waits up to5s for ESRCH on every handshaken PID before cache mutation, completion acknowledgment or starting the next reader. Failure preserves the active request/cache, returns a safe input/cleanup failure and supports release retry with a single stage-completion callback. No later writer starts while exit remains unconfirmed. A fresh parent uses the same exit confirmation before orphan cleanup. The30s read cutoff and bounded retirement/cleanup budget are distinct.

All file creation/validation/release/startup cleanup run off Activity UI thread. MIME/container decoding reuses AiImageCodec: JPEG/PNG/static WebP; raw15MiB/32M pixels; tiny/animation/invalid containers blocked; EXIF normalized; finalJPEG2048 longestedge/1MiB each. Original part files removed, max6 controlled images per receipt.

## Ownership and rollback

Only UUID-marked share-inbox directories with known child names are eligible for cleanup; canonical-path/symlink checks and all-child validation precede deletion. Unknown directories/files are protected and produce a recoverable error, never broad-delete. Active receipts are protected from orphan sweep.

Lease → single transfer pin → release pending → final unpin erase. Release acknowledgment is after actual deletion, not merely an ended marker. Failure returns storage_error and retains ownership for explicit retry/next stage cleanup. Native pending cleanup failures remain visible through the generic retryable Share transport warning.

Transfer validates an existing owned empty AiTemporaryImages operation first; it cannot discard or overwrite a populated session. Every image imports into that fresh operation; any error discards the operation and preserves/reclaims Share staging. JS independently validates returned UUIDs, duplicate IDs, dimensions/size and exact operation-owned AI cache URI. Share-cache metadata cannot become normal Recipe fields.

## Permanent data and privacy

No Share SQL table, SharedPreferences payload, IndexedDB/localStorage source queue, ImportJob or new media reference. SQLite4/Preview7/Backup2 and existing image reference graph are unchanged. Raw text, URIs, screenshots, prompts, responses, Authorization and keys are not logged or included in the review packet. Capacitor loggingBehavior stays none. Tests use generated nonpersonal fixtures; no real Qwen requests.

## Limits

Unmount/process death may drop unhandled Share data by design. Permission grants are temporary; staging is immediate. OEM sender/provider/Share Sheet behavior requires physical-device acceptance. Tests are evidence for implemented boundaries, not proof against a compromised OS/root. If storage initialization fails, local core remains usable; source import must fail safely rather than bypass ownership or validation.
