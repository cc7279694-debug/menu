# APK-5C-A — Execute approved Android Text / Images Share Intake

User-approved source: 2026-10-06 pasted APK-5C-A execution contract. This records execution, not a new product plan.

## Frozen contract

- Start from main `7205a3c56fa39d95268146a2e5fa3efd72d3418c` / `v0.7.0-share-target`; branch `feat/recipio-share-intake`.
- v15 / `0.8.0-share-intake`, independent `recipio-share-intake-v15-debug.apk`.
- Only Android SEND text/plain, SEND image/*, SEND_MULTIPLE image/*. No VIEW, BROWSABLE, HTML, video/audio/documents or new permission.
- Unique HTTP(S) URL in text still routes to Link Import. No URL -> exact text AI prefill; multiple URLs -> explicit text/manual-link/ignore choices. UTF-8 <=32KiB and AI <=30,000 codepoints; no truncation.
- Images: ordered exact-URI dedup, 1–6, content:// only, no own FileProvider, transient read grant, JPEG/PNG/static WebP only. Reuse AiImageCodec; <=15MiB raw, <=32M pixels, controlled JPEG <=2048 edge /1MiB.
- Immediately stage off UI thread with finite overall deadline <=30s. Process-owned private cache; lease/release/transfer and startup orphan cleanup; no paths to JS, no persistent source queue.
- Fresh AI session imports all images atomically, rollback/discard on failure; Share staging only removed after all-success. User clicks Start before Provider. No automatic request, Preview, Recipe creation or overwrite.
- Busy/dirty/editor/preview/backup/viewer/modal/uncertain flows defer; empty AI accepts input, empty Link accepts only URL. Replacement and Ignore release staging.
- SQLite4 / Preview7 / Backup2 unchanged, no migration. Temporary sources never enter Recipe media/Backup/logs/packet. 0 real Qwen calls.
- No main merge, force push, deployment or video module. User physical Share Sheet acceptance remains a separate gate.

## Execution tasks

1. Share payload contract / native classification. Tests: Chinese, multiline, emoji, UTF-8 bounds, URL precedence/dedup/multiple links/unsafe URLs, HTML ignored.
2. Native bounded media staging. Tests: static formats/containers, byte/pixel bounds, grants/schemes, ordered6 vs7, provider error/timeout/cancel.
3. Process inbox lease/release lifecycle. Tests: cold/warm/recreation, old Bridge ownership, pending replacement/Ignore, orphan cleanup.
4. AI-session transfer. Tests: all-or-nothing, retry/discard, no overwrite, no Provider call; same Picker behaviors.
5. Text/media routing and safe banners. Tests: cold safe/empty AI/empty Link/dirty protected state, latest receipt and late async completion.
6. Android real Intent and UI tests. Generate external-provider fixtures, real read grants/IME, cold/warm/dirty, chooser filters.
7. Privacy, temporary cleanup and Backup regressions. No schema/permission change, sources excluded.
8. Fresh complete regression, v14->v15/offline verification, security scan, APK/whitelist Packet, checkpoint, focused commit/feature push; stop.

## Interfaces / execution rulings

- Tasks1/3/5 share a discriminated receipt; metadata has opaque UUID, type/count/safe reason only, optional bounded text. Native owns image staging, JS only leases opaque receipts.
- Tasks2/4 reuse AiTemporaryImages. LocalShareTarget handles source staging, LocalAiIntake validates ownership of the target operation. JS never receives a Share-cache path.
- Existing clean primary checkout and explicitly named branch are reused, no extra worktree or dependency reinstall. Main remains unchanged; dedicated Android environment only, no Mirra operations.
- Resume authorization2026-10-06: user explicitly requested pausing Mirra if still active. Only verified emulator5554/Mirra_API_37 was safely shut down, without data deletion or daemon changes, to run the dedicated RECIPIO emulator5580.
- User approval supersedes historical APK-5B text-only scope; the old accepted behavior/tests stay protected except the intentional plain-text/image support expectations.

## Evidence

Record RED/GREEN and final commands in verification/checkpoint. Historical 982/125/64 are baseline, not new completion counts. Automatic tests use generated data and fake Provider only; emulator and user phone evidence reported separately.
