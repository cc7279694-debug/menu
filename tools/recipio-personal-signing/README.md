# RECIPIO R1-P owner-only signing helper

**Experimental repair branch — do not use for signing.** The signing entry
fails closed with `R1P_STORAGE_REPAIR_NOT_VERIFIED` before owner operations.
The storage/ACL repair and Windows synthetic verification remain blocked.
The separate previously delivered E:/RECIPIO-Signing bundle was not changed
by this branch and must not be run for this review.

This helper implements **route A only** for certificate
`29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
It does not generate a key or choose another identity after failure.

Codex prepares and reviews this source and public unsigned Release APKs.
The owner must run the copied, frozen bundle **outside a repository** by
double-clicking `Start-RecipioPersonalSigning.cmd`. No actual owner operation
has been executed merely because these files or tests exist.

## Required public bundle

Root prepares `release-manifest.json` with fixed source SHA
`19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe`, route A, package
`app.recipio.local`, exact certificate and these inputs:

- `unsigned/recipio-personal-v26-unsigned.apk`:26 / `0.11.0-personal.1`.
- `unsigned/recipio-personal-v27-unsigned.apk`:27 / `0.11.0-personal.2`.
- SHA-256 for each unsigned APK and each of the three runtime helper files.
- `tools`: java, keytool, aapt, zipalign, apksigner JAR and modern sevenZip,
  each containing an absolute `path` and verified `sha256`.
- `repositoryRoot`: original checkout path, forbidden as private key storage.

All public input/identity/tool checks and a generated ordinary-text 7-Zip
preflight run before password entry. Missing, changed, already-signed, Debug,
testOnly, wrong-package or wrong-version inputs fail closed.

## Private interaction

1. Double-click the copied **Windows command script `.cmd`**, not the `.ps1`.
   It selects PowerShell 7 and opens a separate private console with `start /wait`;
   no command needs to be pasted. All existing capture/logging guards still apply.
2. Read the same-computer backup limitation. Ctrl+C cancels the operation.
3. First use asks for the existing source-file password, a new strong personal
   copy password (twice), and an independent encrypted-backup password (twice).
   Existing personal copies are verified/reused, never overwritten/imported
   again. The helper has no literal existing password.
4. Passwords use masked `Read-Host -AsSecureString`; new passwords require
   at least16 printable ASCII characters and three case-sensitive character
   classes. Existing source, personal-copy and backup passwords use the prior
   nonempty printable-ASCII compatibility rule without a new strength limit.
   Backup and keystore passwords must differ. Existing copies or backups are
   not reset or overwritten. A change in backup presence stops the flow; it
   cannot detect replacement by another file at the same path.
5. The helper imports the existing key into a protected PKCS12 copy with the
   same certificate. The original source is read-only and hash-compared.
6. AES256 `.7z` backup uses encrypted headers, strict entry allowlist, actual
   extraction, byte comparison and certificate comparison. The recovered
   private copy signs both versions; merely reading a certificate is not enough.
7. Only after signatures, non-signature APK bytes, alignment and private
   temporary-copy cleanup pass does the helper write its public receipt and
   highest-version final candidate. The seed26 APK remains internal upgrade
   verification material, not a second user-delivery option.

The main identity copy is under the current user's LocalApplicationData
`RecipioSigning/Personal/original-29ded26bea44f1af`; the encrypted backup is
under the user's `.recipio-signing-backups/original-29ded26bea44f1af`.
Both dedicated directories restrict access to the owner and SYSTEM. This is
**one computer with two local files**, not independent offline disaster recovery.
Machine loss, storage failure or malicious software can affect both. Managed
strings and privileged OS memory cannot be promised to be perfectly erased.

The helper refuses redirected/captured consoles, repository execution and
enforced transcript/script/module logging policy. It checks both registry
scopes and both PowerShell configuration JSON scopes (`$PSHOME` and the current
user profile directory); NoProfile does not disable those settings. Any enabled,
unknown, duplicate/ambiguous logging value or unreadable/malformed configuration
fails closed without printing configuration text or changing audit policy.
Existing personal-copy/certificate/recovery/backup leaf files are checked before
directory ACL changes: no reparse points, trusted owner, and Allow DACL entries
only for the current owner/SYSTEM. Broad or unknown existing leaves are refused,
not repaired or overwritten. Restored files receive the same checks before use.
The original legacy source is not re-ACL'd; its known-path/no-link/password,
certificate-pin and unchanged-byte checks remain read-only.

Java receives passwords only in its own restricted child environment,
never argv/global environment/files. 7-Zip receives UTF8-no-BOM stdin: bare
`-p` only for creation; no `-p` for l/t/x. Raw native diagnostics are never
printed, written to logs or copied into receipts. No network or GitHub call
exists in the private helper.

Existing backups must also refuse listing without a password and with an
independent wrong-password probe. Content-only AES archives with plaintext
headers (`-mhe=off`) are rejected even if the correct password can extract them.

Success produces `delivery/OWNER_RESULT.json` and exactly one final candidate:
`delivery/RECIPIO-0.11.0-personal.2-signed.apk`. The result is explicitly
`SIGNED_LOCAL_STATIC_VALIDATED_PENDING_DEVICE`, **not** final independent
acceptance. Share only the public result path with Codex. Do not share a
password, keystore, private temporary files or encrypted key backup.

On failure, the helper clearly says signing is incomplete and asks the owner to
return to Codex; pressing Enter only closes the window. In a safe, existing,
local bundle outside Git, it creates a unique `OWNER_ATTEMPT-<GUID>.json` containing
only `formatVersion`, `status: FAILED`, a fixed sanitized category and UTC time.
Raw exception text, paths, native output and private material are excluded. If
the helper cannot load or the public destination is unsafe/unavailable, it reports
that no attempt record was saved rather than bypassing the safety checks. Failure
records never replace `OWNER_RESULT.json`, which remains the only success evidence.
Toolchain diagnostics use only the fixed six tool labels and
`ENTRY` / `PIN_FORMAT` / `MISSING` / `READ` / `HASH` reasons, for example
`R1P_TOOLCHAIN_JAVA_HASH`. Neither paths, expected/actual hashes nor raw read
exceptions enter the failure category. All six tool pins and the independent
fixed 7-Zip identity check remain mandatory. This diagnostic refinement does
not establish or claim to repair the earlier unreplicated toolchain failure.
Known public failure categories are restricted to an explicit set plus fixed
tool/stage combinations. Unknown exception text is never accepted as a new
public category; an external error that exactly matches a known label cannot
be distinguished by this string-only allowlist.
Unexpected owner-flow failures now identify only a fixed internal stage, such
as `R1P_OWNER_STORE_PASSWORD_UNEXPECTED`. Existing exact R1P categories survive.
Cleanup attempts every owned resource independently; any cleanup failure stops
publication with `R1P_PRIVATE_CLEANUP`. The public attempt still has four fields.
This improves diagnosis; the earlier real `UNEXPECTED_FAILURE` cause is unknown.
When an existing personal copy is found, its password is requested once without
confirmation; this verifies an existing password rather than setting a new one.
The independent backup-password prompt and confirmation remain required.
The helper retains original identities. It does not regenerate keys, overwrite an existing backup, install
an app, modify a phone, or import personal recipes. Unexpected files stop
temporary cleanup instead of triggering recursive deletion. An interrupted
process may leave protected temporary data; do not treat absence of a receipt
as successful signing, and do not manually delete unknown private files.

## Non-sensitive verification

```powershell
pwsh -NoProfile -File tools/recipio-personal-signing/Test-PersonalSigning.ps1 -RealArchivePreflight
pwsh -NoProfile -File tools/recipio-personal-signing/Test-OwnerLifecycle.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-SigningSafetyRepairs.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-OwnerAttempt.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-ToolchainDiagnostics.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-OwnerStageDiagnostics.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-PasswordCompatibility.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-FailureCategoryAllowlist.ps1
pwsh -NoProfile -File tools/recipio-personal-signing/Test-StorageReleaseGate.ps1
```

The first suite includes a real modern7-Zip AES backup of generated ordinary
text, exact recovery and wrong-password refusal, plus child environment/stdin
transport tests. The lifecycle suite uses ordinary generated non-key text,
fake certificate/signing handlers and real generated-text archive recovery.
It verifies cancellation, source preservation, recovered-copy selection and
cleanup/publication ordering. **Real keystore access, real signing, owner
password entry, physical device installation and upgrade remain NOT_RUN.**

The safety-repair suite uses generated JSON scopes, generated leaf files with
an intentionally broad explicit ACL/junction, and generated ordinary-text
archives with/without encrypted headers. No real policy configuration or key
is read, no system policy is changed, and unknown existing ACLs are not repaired.
