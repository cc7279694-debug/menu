# RECIPIO Logo integration into accepted APK-6

## Contract / inherited baseline

The user reported that APK-6 RC2 now works, then authorized Logo changes after
the missing integration was identified. RC2 remains frozen at
`880b0e8e7b75793f5439103a70b1faa4dfa3c35a`. This user report is not a new Codex
Provider smoke. No real AI is called in this task.

Integrate the already approved assets from `feat/recipio-logo-refresh` /
`055c727cb5da50b8c05e0ffe25a019d74596abbb` into the accepted feature lineage.
Use the original PNG unchanged; do not redesign the image or the UI.

Ruling: use separate `feat/recipio-logo-integration` from frozen RC2, not a
whole-branch cherry-pick of the historical Logo commit. Its old CURRENT_STATE
must not overwrite the newer feature state. All approved derived assets are
reproduced byte-for-byte by the existing conversion script.

Ruling: deliver versionCode19 / `0.9.1-logo-refresh`, not historical v16.
The user's installed v18 must be upgraded forward without uninstall or data
clear. Main promotion and Release Tag remain deferred; no frozen RC2 commit,
previous APK, packet or branch is overwritten.

## Scope

- Header image, Launcher / Round / Adaptive resources, matching backgrounds,
  existing splash branding and legacy Web/PWA brand assets only.
- Reuse the existing source/conversion checker and narrow Android smoke.
- No application code, native plugin, navigation, network, dependency,
  permission, data model, SQLite4 / Preview7 / Backup2 change.
- No main merge, tag, force push, deployment or next module.

## Execution ledger

- Verified clean feature HEAD and stable local/remote main `8b2246d`.
- New narrow integration branch created without changing either frozen branch.
- RED: source-conversion check rejected the old `native/public/icon.png`.
- GREEN: all 32 derived assets plus exact source passed the same check.
- Source1254×1254 / SHA-256
  `a6fc20eaba83264f3586339d7f662f16ab59909ec5721d86e63c0e9a159a50e2`.
  Dark symbol radius28.193dp is within the conservative33dp safe zone.
- Typecheck / lint / local build / Capacitor sync passed. Five inherited Web
  image warnings and the existing large-chunk warning remain.
- Android lintDebug / assembleDebug passed:208tasks,1m21s. Android lint has
  0errors /38warnings, including opaque-square/round icon, duplicate bitmap,
  missing monochrome and retained splash-configuration warnings. The user
  required the complete original raster, not a redesigned monochrome variant.
- APK signing v2 passed with the same debug certificate as v18.
- Independent packaged audit:27active header/launcher/splash PNGs match source
  conversion pixels;16JS/CSS entries and9of10DEX are byte-identical to v18.
  The changed `classes8.dex` contains only the same183AndroidR resource classes.
  Resource table removes only the old vector's generated gradient resource;
  unaffected compiledXML is semantically identical after resource-ID resolution.
  Manifest changes only versionCode/versionName; no permission change.

## Android evidence and interrupted checks

Owned `Recipio_Backup_36` /API36 /emulator-5580 only. No phone was connected.
Actual installed v18 name and immutable APK SHA-256 were checked before
install-r. The actual installed v19 SHA-256 then matched the delivery exactly.
Neither a baseline reinstall nor downgrade /uninstall /wipe was performed.

The first run captured v18 rows/images in memory and verified install-r, then
timed out while an observed `Application Not Responding: com.android.systemui`
owned the input window. That FAIL record is retained. The OS Wait action used
the observed dialog bounds; the app subsequently became ready and SQLite
integrity was `ok`, without production changes.

The first read-only continuation compared v19 freshly to the independent
private RC2 snapshot previously proven unchanged on actual v18. It passed data,
header and detail but its inherited `/dev/tty` hierarchy read returned only an
API36 destination notice. Actual XML showed the RECIPIO Launcher node. The
test utility now reads the real XML, not the notice; that failure also remains.
There was no production fix and no weakening of preservation equality.

Final continuation: **6checks PASS**, in
`artifacts/logo-integration/android-smoke-after-system-anr.json`. All8table
rows/IDs/times/order, current/history/retained image bytes, schema4/integrity/FK
and table names match the frozen independent reference. Two existing generated
recipes and one local image remain. The old reference is not a freshly restored
first-run in-memory object; only this comparison and UI checks are fresh.
Reference file SHA-256:
`b97230a122fba073d8f16ce1104e1a6ef6d3d5f907a98de7a298bc1688c4c43b`.

- rowHash:`54019de18718d5397e573e331399006379b088b19614d0a49a5fc37fdf31f5b2`
- imageHash:`055341208a8fa06fd1ae127f4539dd4b2edc54ec8f64881d17457f17355a1ca7`
- Cold starts, unchanged40px header with exact new192px PNG SHA, generated local
  detail and a second preservation comparison passed.
- Airplane mode1 /Wi-Fi0 /mobile data0 were read before and after, unchanged.
  Observed connected WebView external requests0; no native AI action requested.
- Root and independent reviewer viewed the actual Launcher screenshot: new
  symbol complete inside the round adaptive mask. The initial recents image
  caught an animation frame; `recents-stable.png` separately shows the actual
  new system task icon, observed bounds `[238,104][301,167]`, above the RECIPIO
  task snapshot. Header and task icon are distinct checks, not simulations.
- The test utility now saves a non-sensitive baseline hash summary before any
  future install-r, and never overwrites an existing failure or success record.
- No SQL mutation, fixture seeding, image deletion, key read or paid AI call.
- Owned emulator was normally shut down after verification, without wipe. Its
  network settings were read back unchanged1/0/0. Only the small named hierarchy
  and screenshot transport files created in `/data/local/tmp` were removed;
  app data, referenced images and all failure/success records were retained.

## Delivery / security / unrun checks

APK:`artifacts/recipio-logo-integration-v19-debug.apk` —17,238,136bytes.
SHA-256:`e0a4257ce46bddac8bed015f03ae7e81392f10388b44fee8afc0a3085f98e18d`.
Package:`app.recipio.local`; versionCode19 /`0.9.1-logo-refresh`; Debug only.
Signing certificate SHA-256:
`29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
All v13–v18 APKs and frozen APK-6/Logo branch histories remain untouched.

Independent bounded known-key/private-key format scan found0matches in changed
text and readable APK entries/DEX strings; no credential was accessed. This is
not a universal secrecy guarantee. SQLite4 /Preview7 /Backup2 and all business
files remain unchanged. The reviewer found no unresolved Critical/Important
issue. Review noted that `--check --preview` intentionally writes a mask contact
sheet; strictly read-only runs used bare `--check`, never that combination.

Physical phone/OEM masks /Android themed monochrome icons: **NOT_RUN**.
Stored-key values/status were not read or separately measured; their Native
implementation and same-package/same-signature update path are unchanged.
Full business /connected suites and real Provider smoke: **NOT_RUN**, explicitly
unnecessary for this pure visual task. Historical APK-6 numbers are not counted
as fresh Logo evidence. No merge, Release Tag or deployment was performed.

Status: **RECIPIO_LOGO_REFRESH_PENDING_DEVICE_TEST**.
Final feature commit /push /clean status is reported separately, avoiding a
self-referential commit hash in this checkpoint.

## Next step

User covers v18 with v19 and checks the home/Launcher/recents Logo. Do not
uninstall or clear data. After separate acceptance and authorization, reconcile
the stable-main promotion target with this newer visual commit; do not silently
reuse the old frozen880b0e8 tag target and lose the approved Logo again.
