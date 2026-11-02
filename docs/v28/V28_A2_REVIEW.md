# V28-A2 — same-key candidate and isolated upgrade handoff

2026-11-02 · `verification/recipio-v28-a2` · **READY_FOR_INDEPENDENT_REVIEW**.
This is submitter verification, not ChatGPT acceptance or a release decision.

## Frozen source and unique candidate

- A1 source:`cf806554ac38346644613dd8b3bf700aeb48b14f`.
- A1 accepted evidence:`07f9437377df96687b7545d88f16fa6fdff872b6`.
- Product files remain unchanged from A1. No rebuild, signing retry/new key,
  database/backup/version change, main merge, Release or phone operation.
- User moved the existing signing directory under `E:/CODEX`. Current APK:
  `E:/CODEX/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk`.
- Bytes:**15,194,675**. SHA-256:
  `52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`.
- Package:`app.recipio.local`; code**28**; name:`0.11.1-personal.1`.
- Actual signer SHA-256:
  `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
  Official apksigner checks match actual v27; v2/v3 and zipalign PASS. No debug/
  testOnly. [Earlier full static receipts](V28_A2_SIGNED_VERIFICATION.md).
- Actual v27 file now at
  `E:/CODEX/RECIPIO-Signing/recipio-personal-release-v27/recipio-personal-v27.apk`,
  SHA-256:`b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`.
  Both moved files were rehashed/reverified. No keystore/password was read.

## Environment and real installation

[Admission](a2-evidence/upgrade/admission.json): free physical memory5.335GiB
before launch, threshold4GiB. Newly created exclusive
`Recipio_V28_A2_API36` / `emulator-5684`, Android16/API36 Google APIs x86_64
existing Rev7 image, emulator37.1.11, RAM2560MiB/2CPU. No other device connected
at admission. No new SDK, other-project emulator/process or phone was used.

Installed actual signed v27 into the empty AVD; normal application restore UI
validated/staged the generated Backup v2 and explicitly replaced0 recipes.
Seed:2recipes/3ingredients/3steps/2preparations/2keyTips/1change/1cookingRecord/
3actual generated PNGs. Includes Chinese/newline/Emoji, fixed UUID/UTC/order,
cover/cooking shared image and historical-only image. No private content/key.

Selected Soft Sage in settings, forced the app process to stop and relaunched;
theme persisted. Exported the actual v27 data via its normal local SAF UI.
Then executed only the target serial's normal
[`install -r`](a2-evidence/upgrade/upgrade-install.json), exit0/Success, without
uninstall, data-clear, downgrade or testOnly flags. No failure/reinstall workaround.
[Package identity](a2-evidence/upgrade/installed-identity-comparison.json):
appId10216 and firstInstallTime05:47:30 unchanged; lastUpdateTime05:47:30→05:57:39;
code27→28. [Installed base.apk hash](a2-evidence/upgrade/final-runtime-checks.json)
equals the unique signed v28 candidate above. No root or private DB access.
Public [before](a2-evidence/upgrade/package-before.txt)/[after](a2-evidence/upgrade/package-after.txt)
package dumps normalize only line endings/trailing whitespace for Git; original
tool-output files remain in the local evidence directory, with field text unchanged.

## Upgrade data comparison — before any edits

Actual application exports, not the generated seed:

| Export | Bytes | SHA-256 |
| --- | ---: | --- |
| [before-v27.recipio](a2-evidence/upgrade/before-v27.recipio) | 2,961 | `5aa88e3b092d044bae7aa3506d9cbdb064397ad463e32e8a3c6c61e8e6be0bd9` |
| [after-v28.recipio](a2-evidence/upgrade/after-v28.recipio) | 2,960 | `fa22a703950b69f4b1d228cb2bca4e9eeee6c30a17bbfe352c7fea0e653809eb` |

[Strict comparison receipt](a2-evidence/upgrade/upgrade-content-comparison.json)
and [reproducible local checker](a2-evidence/upgrade/compare-upgrade-exports.py):

Run the checker with `--receipt <fresh-output.json>`; existing evidence is never
overwritten. It compares the two actual exports beside the script, offline.
[Fresh publication-copy recheck](a2-evidence/upgrade/publication-recheck.json)
also passed before commit.

- PASS: ZIP CRC, no duplicate/unexpected entries, internal sizes/hashes/counts.
- PASS: all7 collections' field types/values/UUID/UTC times/position/array order.
  `data.json` itself is byte-identical (4819bytes), not merely equal counts.
- PASS: all3 PNG bytes/SHA unchanged, including current, shared and historical
  references. Assets are181/182/183bytes; exact hashes are in the receipt.
- PASS: manifest schema4/format2/counts/dataFile/media unchanged. Only export
  createdAt and appVersionCode/name change. Whole ZIP SHA appropriately differs.
- [v27 actual-export vs seed validation](a2-evidence/upgrade/before-content-validation.json)
  confirms real restored content; seed is not substituted as an upgrade baseline.
- Theme is outside Backup v2. [Separate visual/cold-start comparison](a2-evidence/upgrade/theme-comparison.json)
  confirms Soft Sage selected and matching radio/background pixel regions.

This proves portable business content/media retention. It does **not** claim raw
SQLite file bytes, PRAGMA inspection or physical image-path identity. Schema4
is reported by the actual native export and the unchanged frozen implementation.

## Controlled Android UI checks

All performed on the above isolated device using real WebView/IME and generated
data, in airplane mode (value1 before/after). No paid/real AI or webpage request.

| Actual check | Result and evidence |
| --- | --- |
| v28 process cold start offline; both retained recipes | PASS · [home](a2-evidence/upgrade/v28-offline-cold-home.png) |
| Non-default theme after v27 cold start and upgrade | PASS visual · [v27](a2-evidence/upgrade/v27-theme-before-upgrade.png), [v28](a2-evidence/upgrade/v28-theme-after-upgrade.png) |
| Local ingredient search Chicken; one correct result | PASS · [focused search](a2-evidence/upgrade/v28-search-focused.png) |
| Actual Gboard Back hides keyboard, retains query/result; clear restores both | PASS limited smoke · [after Back](a2-evidence/upgrade/v28-search-ime-back.png) |
| B1 basic focus: outer rounded ring, no inner rectangular outline | PASS observed on Soft Sage; not a new three-theme/OEM accessibility acceptance |
| Local step image and Focus view/Back | PASS · [step image](a2-evidence/upgrade/v28-step-image.png); later export confirms no extra cooking record |
| Cooking history/shared finished photo, change history/old image | PASS · [cooking](a2-evidence/upgrade/v28-cooking-history.png), [old/current images](a2-evidence/upgrade/v28-history-images.png) |
| Explicit edit suffix A2-EDIT, save then process cold start | PASS · [ready home](a2-evidence/upgrade/v28-final-home-ready.png) |
| XHS-shaped generated URL entry and discard | PASS entry/cancel only · [controlled URL](a2-evidence/upgrade/v28-xhs-url-not-requested.png); Read Webpage never pressed |

Only after strict upgrade comparison passed, one title edit was saved.
[Post-smoke export](a2-evidence/upgrade/post-smoke-v28.recipio) and
[validation](a2-evidence/upgrade/post-smoke-validation.json): same2 recipe IDs;
only intended title/updatedAt changes and1 new Change History; all original
history and other entities unchanged; Cooking Records still1; all3 image bytes
unchanged. Post-smoke SHA:
`15ed4330aee7ba40653d74d5feef6fa2cf0ea98fee4795e3064728cbd0756213`.

## Failed attempts, environment notes and NOT_RUN

Fresh AVD boot initially exceeded25s/40s polling windows. Five system ANRs
(phone, System UI, GMS persistent/GMS, IME) all occurred05:47:01–05:47:17,
**before v27 installation05:47:30**. A [System UI dialog](a2-evidence/upgrade/v27-first-launch.png)
was retained and Wait was selected once. No reinstall/data clear/reboot or
product fix was used. [Initial](a2-evidence/upgrade/initial-system-events.txt)
and [final](a2-evidence/upgrade/final-system-events.txt) event logs retain the
same five entries; final crash buffer empty, no later ANR or app crash event
observed. This is an environment note, not evidence of device performance or
an RECIPIO crash. Precise initial system-ANR cause remains undetermined.

[Test-harness notes](a2-evidence/upgrade/TEST_HARNESS_NOTES.md) retain failed
checked-state and expected-state assertions, stale/empty accessibility trees,
the keyboard-coordinate retry, and the rejected splash-frame observation.
They are not silently relabeled PASS or used as TalkBack evidence. Actual UI
screenshots/exports and fresh checks establish only the results listed above.

NOT_RUN: Xiaomi14/other physical OEMs, TalkBack/system-font/performance,
raw SQLite/private-file/path identity, full historical connected/Guided tests,
full three-theme/non-`:has()` fallback matrix, real XHS/DNS/TLS/network request,
real AI and real personal-data upgrade.
Earlier A1 JS/TS/JVM/typecheck/lint/build evidence remains historical, not rerun
or relabeled as current Android tests. Five existing lint warnings remain.

This continuation adds only verification documents/public synthetic evidence;
no product code/tests/dependencies/schema/permissions/signing change. Existing
untracked `android/.idea/` remains untouched. [Dedicated AVD was stopped gracefully](a2-evidence/upgrade/emulator-stop.json)
with its synthetic data directory preserved; shared ADB and other devices were
not stopped. No phone, personal data, main merge, Release, deployment or next
module. Stop for ChatGPT independent review; do not install on the user's phone
or declare ACCEPTED/FROZEN automatically.
