# Personal official signing — signed; Android verification pending

The user authorized a fresh long-term personal identity for the existing package
`app.recipio.local`; old data migration and old certificate reuse are declined.
The old app and all phone data remain untouched. A different certificate means
the owner must manually uninstall the old app before installing the new one,
but only after independent acceptance. This step is not authorized for Codex.

The unsigned v27 Release built from the G3–G7 main-based workspace has SHA-256
`e07565397555df9cd95cdbc6c79a8b9c5075bc92ab4ca663b65723223469d7da3fe578d9a7f83b9`.
Production isolation and 230 targeted synthetic-data tests previously passed.
Release manifest, package and version were checked. This unsigned artifact is
not installable and is not a signed deliverable.

The launcher `scripts/official-personal-release/START_SIGNING.cmd` runs the
small local helper in a private console. It checks the known unsigned SHA and
package, protects existing destinations, snapshots the unsigned input, invokes
official `keytool`, `zipalign` and `apksigner`, checks the new certificate and
signed APK metadata, then creates a 7-Zip AES encrypted backup and verifies a
byte-identical in-memory restore before publishing its output. It never accepts
the password through command arguments, stores it in Git, or sends it to Codex.
The password is entered once and confirmed in the owner's own console; input
shows only `*` characters so that typing is visible without exposing the password. It
protects both the PKCS12 file and the backup. Private key, backup and outputs
are created in new, exclusive directories under the existing ACL-checked
`E:/RECIPIO-Signing` directory. Any existing target or preflight error stops.

Disposable-key integration tests checked the actual official tool chain,
encryption restore, wrong-password rejection, conflict protection, changed
input, package/debug rejection and certificate mismatch. The owner has now
completed the private signing step. The public receipt reports a verified
encrypted-backup round trip. Without the password Codex did not independently
decrypt it. The backup is on the same physical drive and uses the same password,
so it is not a substitute for a separately stored offline copy. The user should
copy it to safe offline media and keep the password separately.

Independently inspected signed APK:
`E:/RECIPIO-Signing/recipio-personal-release-v27/recipio-personal-v27.apk`,
15,190,579 bytes, SHA-256
`b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`.
`apksigner verify` passed, signer certificate SHA-256
`5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`,
different from v23. Package is `app.recipio.local`, code 27, name
`0.11.0-personal.2`, with no debuggable/testOnly manifest flags; zipalign passed.
All 483 unsigned ZIP entries match the signed APK contents; only signature
metadata entries were added. No known fixture filenames were found. Installation
and startup on an owned isolated Android device remain NOT_RUN until verified.

An empty RECIPIO-only AVD was prepared under
`E:/CODEX/Tools/recipio-personal-test-avd`, using the existing read-only Android
36 system image. An older RECIPIO AVD contains data of unknown origin and must
be preserved. On 2026-10-28, the new isolated AVD was started with a 1536 MiB
override when 6.16 GiB was free. ADB identified the intended AVD, but while
Android was starting, available memory fell to 3.90 GiB. The explicitly verified
new AVD was stopped; no APK was installed and boot completion was not confirmed.
Its data was retained. Installation and launch remain NOT_RUN. Future attempts
must preserve at least 4 GiB free, use more starting headroom, and avoid other
projects' processes, emulators, data and the user's phone.
Do not publish, merge main or begin a new product module.
