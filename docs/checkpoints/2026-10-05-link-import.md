# APK-5A checkpoint — ordinary web link intake

Status: APK_5A_COMPLETE. Implementation and emulator verification complete; physical OEM acceptance and successful public-site import are not claimed. Stop for user delivery acceptance; APK-5B/C is not authorized.

## Baseline and delivered scope

Base: `d01589e3540d80eb48592a75cf391c79c4533631`, APK-4 accepted/frozen main. Branch: `feat/recipio-link-import`. Final HEAD is pinned in the review-packet manifest and delivery receipt, not self-referenced here.

Independent Add entry → Native safe public GET → inert Schema.org Recipe parser → editable preview → explicit save through `RecipeLibrary.createDetails()`. Reading a page never invokes AI. Partial/no structured recipe can use existing APK-4 AI only after an explicit click. Multiple close-scoring candidates require selection; duplicate names create a separate recipe only with confirmation. Errors retain screenshot/text/manual alternatives.

No URL, HTML, source history, cookies or webpage image enters Recipe, SQLite, history or Backup. Source lives only in the import session. Navigation/restore invalidates late results; uncertain writes use their original UUID and readback, retain edits, and cannot silently duplicate a saved recipe. Native cancellation always releases owned AI state. Existing Back/IME routing was not changed for this module.

## Data and platform boundaries

- SQLite4 / Web Preview7 / Backup Format2 with v1 import compatibility unchanged; no migration or new business entity.
- Only new production dependency: OkHttp4.12.0; MockWebServer4.12.0 is test-only. Existing Cheerio slim parses inert HTML lazily. No npm dependency added.
- Android's approved HTTP page access requires cleartext platform capability. The public-page plugin still restricts schemes, default ports and public IPs; system TLS, WebView CSP and Qwen HTTPS endpoint remain unchanged. No new permission.
- No cloud, login, shopping, favorites, meal planner, timers, share target, social/video platform special case, external search, automatic AI or network deployment.

## Verification and artifact

Fresh final implementation: whole repo180 files/960PASS; native app56/372PASS; Link+AI+Backup36/278PASS (subsets, do not sum); Java14 suites/114PASS; dedicated Android link8PASS and full connected53PASS. Typecheck, lint, local build, sync, JVM, Android lint and both debug assemblies pass. Detailed commands and raw local log pointers: [verification](../verification/link-import.md), [Android](../verification/link-import-android.md), [security](../verification/link-import-security.md).

Installed v12 generated recipe survives v13 overwrite. Flight mode + Wi-Fi/data off + force-stop cold start preserves old and imported recipes; Guided Cooking remains offline. Thirteen final synced Web resources match the tested APK bytes. Only test data/images were used; Mirra's emulator was not operated.

Artifact: `artifacts/recipio-link-import-v13-debug.apk`, 17,204,359 bytes, SHA-256 `1f9ee38dd781b61d36ddd2552718f6dbed959ca4cbcb30a18c391dd43bac157f`. Package `app.recipio.local`, code13, name `0.6.0-link-import`, Debug signing. Existing v12 is preserved.

## Honest limitations / next-stage inheritance

- Public-site attempts were rejected by current VPN/DNS reserved-address resolution (198.18 range), not reported as successful imports. No guard relaxed. Approved acceptance permits owned fixtures as formal regression when public sites cannot be stably reached.
- All new AI tests use fake HTTP, with zero paid calls. APK-4 user's real Key/model/Text/Screenshot/Preview/save acceptance remains separately attributed; it is not a new real webpage fallback smoke.
- Physical OEM and non-VPN public-site success: NOT RUN. Android evidence is the dedicated API36 emulator plus JVM socket tests, not browser-only IndexedDB evidence.
- First focused Android attempts encountered SystemUI ANR overlay/input focus and test layout preconditions; retained failed logs, then verified actual activity focus/IME/visible controls. Final8 and53 pass; no production debounce/delay or extra keyboard state machine.
- Existing JS image warnings, core bundle size warning and Android lint warnings remain recorded, without unrelated upgrades/refactoring.
- Unsaved sessions are not durable; authenticated/JS-only/anti-bot sites may be unreadable. This is not a crawler bypass. Full backup remains unencrypted; uninstall/clear-data risk still requires an external saved backup.

No main change, force push, PR, deploy or next-module work. Feature commits only; final normal push and clean/remote equality are checked in the delivery receipt. A future module must inherit the local Recipe/Backup/security boundaries rather than reopen the product architecture.
