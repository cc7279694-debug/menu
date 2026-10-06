# Current State

## Current stage

2026-10-06 — Approved Logo / App Icon refresh implemented on `feat/recipio-logo-refresh`; status `RECIPIO_LOGO_REFRESH_PENDING_DEVICE_TEST`. Stable main is `8b2246dbfac674aa837cb25675893fbbef2d79c5` / `v0.8.0-share-intake`, with APK-5C-A accepted/frozen as specified by the user and verified Git baseline. It has not been modified. Pure branding v16 / `0.8.1-logo-refresh` build, resource and signing checks passed; Android covering-install/data-preservation/header assertions passed, but System UI ANR prevented reliable launcher/recents visual acceptance. See [current checkpoint](checkpoints/2026-10-06-logo-refresh.md) and [asset contract](brand-assets.md). Phone acceptance remains pending; do not start another module.

## Implemented

- Plain-text Share, one unique URL precedence, explicit multiple-link choices, and ordered1–6 JPEG/PNG/static-WebP images feed existing Intake only. No automatic Fetch/AI/Preview/save.
- Android private disposable media-reader process, transient grants, bounded reads and30s receipt deadline; controlled JPEG staging, process-restart orphan cleanup, memory-only pending/leased receipts and actual deletion acknowledgment with retry.
- Atomic transfer into a fresh empty APK-4 AiTemporaryImages session. Dirty/busy/editor/restore/Focus/Guided boundaries defer delivery; latest pending item replacement is visible. No original source becomes Recipe media.
- APK-1–5B local library, default complete steps, optional Focus/Guided, explicit Cooking Records, Change History, safe Backup/Restore, optional AI and safe link parsing are inherited. No login/cloud/meal plan/favorites/shopping/timer/video.
- SQLite4 / Preview7 / Backup2 remain unchanged, no new permission/dependency/migration. Provider and Keystore paths unchanged. Paid AI calls in this module:0; APK-4 user Provider evidence is not rewritten as new Codex Smoke.

## Inherited APK-5C-A verification — historical, not rerun for branding

Complete Android runs found fixture permission/readiness/routing measurement races and a real Binder-death-versus-OS-exit retirement gap. Fixtures corrected; ShareMediaInbox now confirms bounded OS exit before cache mutation/callback/next writer, quarantines failed confirmation and permits release retry. After this repair: full187files998PASS/532.90s; APK63files410PASS/118.21s; typecheck/lint/local build/sync PASS; Native18suites144PASS; full explicit-app239-task rebuild PASS/2m13s; unfiltered Android89/89PASS,14classes,0failure/error/skip/5m48s. Final v14→v15 install-r preserves all eight-table rows/IDs/times/order, current/history image hashes and key configured status; SQLite4/FK valid. Flight-mode force-stop cold launch/detail/image/Guided/real Back and Backup SAF open/cancel PASS, data unchanged. Observed WebView external requests/runtime errors0; Provider/page-read attempts0. Earlier greens remain historical, not reused.

## Inherited APK-5C-A environment / historical pending

User explicitly authorized pausing Mirra if still active; verified Mirra5554 shut down without wiping data. Only dedicated `Recipio_Backup_36`/API36/emulator5580 was used, then normally shut down after verification without wiping data. Network settings restored/read back exactly. No physical phone attached; no other project daemons operated. Physical OEM Share Sheet A–E (text,1image,2–3orderedimages,image+description,dirtyeditor) Not Run. No real AI, product replan, video or main change. The unrelated generated Cordova library's empty AndroidTest harness has Kotlin duplicate classes under unqualified root task names; explicit-app full verification passed without dependency/config changes.

## Inherited APK-5C-A artifacts

Repaired independent v15 / `0.8.0-share-intake`:17,225,119bytes/SHA256 `09bdafc383dba38a2819014195438373611cbdeec69e8d344a019098943b142e`, Debug v2 signature PASS;11built assets byte-equal;222text/DEX entries and final logcat credential-shaped scan0. Historical candidate SHA256 `1ed77b7715455506ae773b72c349a971a2f9f655cbc3c60425d16959849fd486` retained separately. APK: `artifacts/recipio-share-intake-v15-debug.apk`. Whitelist delivery: `artifacts/share-intake/review-packet-apk-5ca-share-intake.zip`; final committed feature HEAD is pinned by its manifest/lineage, not a self-referential documentation SHA. Raw snapshots/screenshots/logcat/Intents/credentials/backups/APK bytes are excluded from the Packet.

Current deliverable: `artifacts/recipio-logo-refresh-v16-debug.apk`,17,213,126bytes/SHA256 `cf68b073e6fb96cda52df4d328f7d7b6c429e3204af477907175344338bdf20f`. No business code or SQLite4/Backup2/Preview7 changes. Next: user phone cover-install and Logo/launcher/OEM-mask/recents acceptance only. Pure-branding checks do not claim to repeat the historical business test counts. No AI calls. Delivery uses normal feature-branch commit/push only, no main merge/tag/deployment or next-module work.
