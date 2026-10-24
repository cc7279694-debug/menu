# G4 Native readiness and data protection — 2026-10-24

Readonly source audit; **no Android test/device was run**. Static inventory:
15product instrumentation classes/104methods plus1scaffold context test =16/105.
This is not a pass count. Source remains frozen after cancelling unverified work.

## Avoid destructive/obsolete harnesses

- `verify-backup-android.mjs:122`: `pm clear`; other modes replace data/inject
  triggers. `verify-cooking-android.mjs:749–778` and
  `verify-ai-intake-android.mjs:367–372`: restore/delete operations. Never run on
  preserved unknown/user records. Version assumptions are older thanv23.
- Daily script expects schema2; AI script uses11→12; Share13→14/14→15;
  Finder accepts15–18; Logo expects19. Do not replay unchanged as a G4v23 test.
- `android-webview.mjs` checking `emulator-` is not ownership validation.
  Verify live QEMU executable/AVD/port/serial first, never a user's phone.
- Historical default UTP cleanup uninstalled target; see
  `docs/verification/ai-intake-back-ime-final.md:38,52`. A future full connected
  run must explicitly retain installed APKs and verify preservation, not default
  uninstall. Prefer already-installed exact target/testAPK + bounded safe methods
  when appropriate; no silent downgrade or clear.

## Potential safe subsets — still require actual audit/gates at execution

| Test | Scope / caveat |
| --- | --- |
| LocalCookingStorageTest | UUIDcache/fixture.db;5methods, not actual cookingUI. |
| LocalBackupPluginTest / ReplyOrdering | UUIDcache/FakeProvider;6+2methods, no real SAF replacement proof. |
| AI boundary/secret/temp/dialog | UUIDcache/Key aliases/FakeHTTP; respect owned URI/cache lifecycle, no real Key. |
| AiImeBackInstrumentedTest |8trueIME/Back cases, FakeHTTP/UUIDKey/images; no Recipe save. Compiling does not execute these. |
| WebLinkIntakeInstrumentedTest | completeParser save method creates real SQLite UUID row without removing it; exclude unless explicitly controlled/preserved. Other7do not clear whole library. |
| Finder UI | Save/offline methods create rows; teardown deletes only ownedUUID+exacttitle. Boundary7use isolatedProvider. |
| ShareIntake | Real Intent/IME/FakeHTTP; preview/cancel backup methods do not replace business data. |
| ShareMediaInbox | May clear stale share cache; use only exclusive controlled pending-share environment. |

Unknown existing records always protected. Snapshot business IDs/tables/media
bytes before any preserving install; no raw database/media committed. Restore
replacement only on separately isolated controlled data, never personal library.

## Unverified issues / missing tools

- `ShareTargetInstrumentedTest.java:49` still waits a legacy Home slogan now only
  in Settings. Needs targeted correction to actual V2 root/route, then compile and
  device run. A draft selector correction was reverted because resource stop
  prevented proof. No executed Android FAIL inferred.
- Existing root `.recipio-ui-v2.v2-production`; cold share may route directly to
  `.v2-link-intake input[type=url]` or `.v2-ai-intake textarea`, so Home-only
  readiness is unsuitable. Keep all downstream behavior/data assertions.
- No existing TalkBack main-chain or same-device baseline performance harness
  found. They remain NOT_RUN; JS mock or current slow-host timing is not substitute.

Resume only after owned RECIPIO environment and>=4GiB safe memory. No other
project/phone/process operations, extra SDK or background queue authorized.
