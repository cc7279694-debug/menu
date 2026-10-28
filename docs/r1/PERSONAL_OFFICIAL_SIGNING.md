# Personal official signing — awaiting owner password

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
input, package/debug rejection and certificate mismatch. The actual user
identity, final signed APK, actual backup, Android installation and launch are
NOT_RUN until the owner performs the private password step. The backup is on the
same physical drive and uses the same password, so it is not a substitute for a
separately stored offline copy. The user should copy it to safe offline media
and keep the password separately.

After the owner reports completion, inspect only the public `OWNER_RESULT.json`
and signed APK, independently recheck hash, package, version, signature and
certificate, and verify installation/startup on an explicitly owned isolated
test device without touching the user's phone or another project's emulator.
Do not publish, merge main or begin a new product module.
