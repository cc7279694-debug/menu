# V28-A2 same-identity signing and isolated upgrade checkpoint

Date: 2026-11-02. Branch: `verification/recipio-v28-a2`.
**READY_FOR_INDEPENDENT_REVIEW.** Owner signing and the isolated real
v27→v28 upgrade checks are complete. No product change or release approval.

## Android continuation — completed 2026-11-02

- Fresh admission5.335GiB passed the4GiB threshold. Created only
  `Recipio_V28_A2_API36` / `emulator-5684`, Android16/API36, RAM2560MiB,
  new data directory under `E:/CODEX/Tools/recipio-v28-a2-20261102/avd`.
- User relocated the signing directory to `E:/CODEX/RECIPIO-Signing`.
  Actual v27/v28 hashes and same certificate matched again; no re-signing.
- Real signed v27 installation, normal synthetic Backup v2 restore, non-default
  Soft Sage UI selection and process cold start completed. Actual v27 export
  is the baseline, not the seed archive.
- Normal `install -r` v28 succeeded without uninstall/data clear. AppId10216
  and firstInstallTime remained; version27→28 and lastUpdateTime advanced.
- Actual v28 export: all7 collections, IDs/times/positions/order and data.json
  raw bytes identical; all3 images byte/SHA-identical, including shared and
  history-only references. Theme visual/cold-start checks passed separately.
- Offline cold start, ingredient search/clear/IME Back, local step/Focus,
  cooking/change history/images, one explicit edit with cold-start persistence,
  XHS-shaped controlled URL entry/cancel completed. No webpage read or AI call.
- Final export: only intended title/update-time and one new change record;
  recipe IDs and all other entities/media retained, cooking count remains1.
- Initial5 system ANRs occurred before v27 install. Logs/screenshot and one
  Wait recovery retained; no subsequent ANR/crash events. Test-harness/Android
  accessibility-cache limits retained. No raw SQLite/private-path assertion.
- Gracefully stopped this dedicated AVD, preserving disk/data. No other AVD,
  shared ADB-server restart, phone, personal data, private key or password action.

[Final report, exact inputs, actual receipts, screenshots and NOT_RUN](V28_A2_REVIEW.md).
The original signing-only/preparation history below is retained and superseded
where it says Android work was pending. Await ChatGPT independent review.

## Historical signing-only verification — 2026-11-02

- APK: `E:/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk`.
- Size:15,194,675bytes. SHA-256:
  `52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`.
- Actual certificate SHA-256:
  `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`,
  identical to the actual signed v27 APK. Official apksigner verification PASS
  (v2/v3); zipalign PASS. Package `app.recipio.local`, code28,
  `0.11.1-personal.1`; debuggable/testOnly false.
- All483 unsigned ZIP entry payloads are unchanged. Exactly three signing
  metadata entries were added; no original entry was removed or duplicated.
  Frozen unsigned/v27 APK hashes remain unchanged. Public owner receipt matches
  actual file bytes/hash/certificate. No product/source/schema/version change.
- No new signing identity or Codex password/key-content access; no ADB command,
  emulator creation/start, installation or phone operation in this verification.

[Actual checks, receipts and remaining limits](V28_A2_SIGNED_VERIFICATION.md).
The signed file remains a candidate awaiting independent review. Its actual
current path is in the final report; the historical path above predates the
user's directory move. Do not sign again.

## Historical preparation — owner gate below is superseded

The following records the pre-signing preparation. Statements that no signed
candidate existed applied at that point only; current facts are recorded above.

The user confirmed A1 **ACCEPTED / FROZEN — PASS WITH NOTES**, source
`cf806554ac38346644613dd8b3bf700aeb48b14f`, evidence
`07f9437377df96687b7545d88f16fa6fdff872b6`. A2 does not modify that product,
SQLite4/Preview7/Backup2, package or version. Only the owner helper/tests and
verification documents are added. Existing `android/.idea/` remains protected.

## Fixed public inputs rechecked

| Input | Actual result |
| --- | --- |
| Frozen unsigned APK | SHA-256 `e8969bd0d18af8c34fe8472d8bd96d162b51216a8fc1a15ef8f8c5c5d9837e6a`, match |
| Candidate identity | `app.recipio.local`, code28, `0.11.1-personal.1`, match |
| Existing signed v27 APK | SHA-256 `b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`, match |
| v27 actual certificate, official apksigner verify | `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`, match |
| Existing key file | Known v27 path exists; only metadata checked, no contents read by Codex |
| New v28 output directory | Absent before preparation; never overwrite an existing target |

[Public preflight receipt](a2-evidence/public-preflight.json).
No key generation, password collection, signed v28 or device operation was
performed by Codex. The old fixed-v27 signing launcher was read only to identify
public path/alias constants, never imported or executed.

## Historical owner gate — one private action (completed)

New launcher: [START_V28_EXISTING_KEY.cmd](../../scripts/v28-a2-signing/START_V28_EXISTING_KEY.cmd).
It opens a standard masked desktop input, using the existing password once.
The [helper](../../scripts/v28-a2-signing/sign_existing.py) uses official Android
tools with stdin passwords, fixed hashes/identity/certificate and exclusive
outputs. No password arguments, exported secret environment, key generation,
keystore writing/copying, raw tool logs or application rebuild. The helper is
not a general signing framework and has no new-key or downgrade mode.

Current checks: nine helper cases initially failed because the helper did not
exist; the final nine Fake-runner cases pass. They cover changed input, output
conflict, wrong certificate/version, changed ZIP payload, stdin-only password,
safe tool errors, transport validation and successful exclusive publication.
These are controlled non-key/non-APK fixtures, **not real cryptographic tests**.
[Helper receipts](a2-evidence/helper-tests.txt). Existing A1 product tests are
not relabeled as A2 runtime tests and were not rerun.

Successful owner operation must produce both the new APK and public receipt:

- `E:/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk`.
- `E:/RECIPIO-Signing/recipio-personal-release-v28/OWNER_RESULT.json`.

At preparation, v28 signed SHA/certificate/size were **NOT_AVAILABLE / NOT_RUN**. The expected
v27 certificate is not substituted for an actually inspected v28 signer.
No success receipt means BLOCKED, even if a late copy/receipt error left files.
Preserve failed files and stop; do not overwrite or automatically retry.

## Resume after signing verification

Historical runbook, now completed by the Android continuation above.

1. **Completed:** read only the public receipt and independently verify the actual candidate
   using official apksigner/aapt2/zipalign, hash and ZIP payload checks. Require
   the fixed unsigned source, exact v27 signer, package/version and unchanged
   input/key metadata. Any mismatch stops before installation.
2. Recheck physical free memory and device ownership. Last observed memory was
   below the existing4GiB minimum; no emulator was started. Do not stop another
   project, reuse its AVD, reset the shared ADB server, install a new SDK or
   touch a physical phone to force progress.
3. Create a new RECIPIO A2-only AVD/name/data directory/unique port using an
   existing read-only API36 image. Preserve the old personal-test AVD, which
   already has prior v27 test data. Confirm actual guest RAM from emulator
   output (historically requested1536MiB was raised to2560MiB); do not infer
   resource safety from the requested value alone.
4. Install actual signed v27 into the verified empty AVD. Populate controlled
   recipes, ingredients, steps, preparation/tips, cover/step/history-only images,
   cooking/change records and a non-default theme through supported UI/backup
   interfaces. No API key, real note or personal backup. Generated Backup v2
   fixtures must have real sizes/hashes; placeholder test-fixture hashes cannot
   be used as an actual import file.
5. Freeze before-upgrade content/counts/IDs/times/order and image bytes using
   actual export; confirm non-default theme after cold start. Do not assume a
   non-debug Release permits `run-as`, WebView debugging or test instrumentation.
   If raw DB/private-file access is not available, explicitly distinguish
   portable business-data/asset hashes from raw DB bytes or physical file paths.
6. Use only the target serial for same-signature `install -r`, without uninstall,
   clear-data, downgrade/testOnly flags. First compare all post-upgrade data and
   images before making expected edits; then test cold start, search, edit,
   offline images/history, B1 and XHS entry without external calls.
7. Preserve any signature, data-loss, version or crash failure and stop. Do not
   repair frozen business code, erase data, reinstall or recreate identity to
   hide it. Any source repair needs a separately reviewed scope.

## Current NOT_RUN and stop

Physical Xiaomi/OEM/TalkBack/system-font/performance, raw SQLite file bytes and
private paths, real XHS requests and real AI remain NOT_RUN. Controlled Android
upgrade/export comparison and listed UI checks completed; they do not promote
these outside-scope items to PASS. Real AI calls0.
No main merge, Release/publication, phone operation or next module.

Stop at ChatGPT independent review. No password, install, signing, publication
or next-module action remains authorized automatically.
