# R1-A — owner-controlled signing and backup plan

2026-10-26 — **OWNER_ACTION_BLOCKED**. Design only; no signing key, private
wizard, Secret upload or real signing was created/executed by this document.
The owner currently has no two offline media available. Only internal
NVMe/SATA storage was identified by the parent task. Two folders or archives
on the online C:/E: disks do **not** meet the two-offline-backup requirement.
Unrelated no-key R1 work may continue; signing must wait.

## One private owner interaction, after prerequisites are met

1. The owner supplies two separate physical USB/offline storage devices.
   Verify physical disk identity, not merely different drive letters or
   partitions. Do not format, overwrite existing archives or use network/cloud
   folders. The owner retains custody and disconnects the devices afterward.
2. Inspect only declared signing locations, existing public identity receipts
   and GitHub Secret metadata before generation. If any existing keystore or
   inconsistent certificate is found, stop for owner-controlled reuse/review;
   never silently generate a replacement identity. The Android debug keystore
   is not the new app's durable signing identity.
3. A reviewed helper may later run in a separate, visible PowerShell 7 terminal
   controlled by the owner. It must not run inside Codex's captured terminal,
   redirect private input/output to Codex, start a transcript, use clipboard
   transfer or receive screen/accessibility capture while passwords are entered.
   The helper collects a keystore password and an independent backup password
   using masked secure input, twice each for confirmation. The owner does not
   repeat technical commands.
4. Create a PKCS12 identity only when none exists, in a restricted local owner
   directory outside repositories, sync folders and ordinary temporary storage.
   Use existing JDK21 `keytool`, RSA3072/SHA256withRSA and at least25-year
   validity. Keep PKCS12 store/key passwords equal for tool compatibility;
   the backup password must be different. Never pass literal passwords in argv.
5. Export the **public DER certificate** and freeze its certificate SHA-256,
   alias, validity and permanent package `app.recipio.local.next`. The DER
   certificate fingerprint is not the keystore-file or PEM-text hash. An old
   identity or expected fingerprint mismatch stops the operation.

## Password transport and its real limits

- Private child-process stdin is an implementable route, not a claim of tested
  real-key custody. Use explicitly configured encoding, no BOM and a terminated
  input line; close stdin and check the child exit code. Keep plaintext only
  briefly in the isolated helper/child memory; dispose/clear owned buffers.
  Managed strings/OS memory cannot be promised to be perfectly erased. Codex
  must never attach to or inspect that private process's input or environment.
- **Keytool stdin is not arbitrary UTF-8 text.** JDK21's password reader casts
  incoming bytes to characters. For the simple stdin implementation, require a
  long high-entropy ASCII keystore password, excluding NUL/CR/LF. Do not feed a
  Chinese/Emoji UTF-8 password and later upload its original Unicode value:
  these may denote different passwords. The official `-storepass:env` and
  `-keypass:env` modifiers are an alternative, using only a private child's
  environment, never global environment/argv/files; Unicode interoperability
  would need separate non-sensitive preflight before adoption.
- Modern 7-Zip archive creation (`a`) reads a bare `-p` password from stdin.
  **For encrypted archive listing, testing and extraction (`l/t/x`), omit
  `-p` entirely:**26.05 treats an empty `-p` as a defined empty password on
  those paths, ignoring the supplied stdin password and failing recovery.
  With no password switch, encrypted headers trigger its stdin prompt.
  Specify `-sccUTF-8` and a matching UTF-8-without-BOM writer; this sets its
  stdin decoder. Do **not** use `-pPASSWORD`, a password file, `.env` file or
  terminal-history command.
  Preflight the chosen tool/encoding using synthetic non-key material before
  allowing any real key. The backup password can use the same conservative
  ASCII policy to avoid recovery portability surprises.

## Modern backup tool and actual recovery proof

The installed `C:/Program Files/7-Zip/7z.exe` reports **19.00 (2019)**. Its
existence is not evidence of a modern long-term custody tool. Use an isolated,
checksum-verified current official portable tool for real key backup; do not
replace the global installation as an incidental action.

- Official release: **26.05**, published2026-10-21.
- Portable package: <https://github.com/ip7z/7zip/releases/download/26.05/7z2605-extra.7z>
- Release asset SHA-256:
  `f27a8f103c84785026edcba1f67faf1357225df9d19ddb0b7760d55947141bc7`.
- Official release source commit: `b88c6bc09339de32f7d18bbab900686b244f42ba`.

The parent task owns download and readback verification. The old tool may
bootstrap extraction of that verified public tool package, not handle real
keystore material. Confirm the extracted standalone executable and AES256
capability with non-sensitive preflight; download verification is not execution
or backup proof.

An independent local26.05 real-tool preflight with **public synthetic ASCII and
UTF-8 passwords only** confirmed creation, encrypted listing, integrity testing,
two internal-copy extractions with exact byte recovery and wrong-password
rejection after applying the command-specific password-switch rule above.
It did not generate a signing key or test owner input, keytool password
transport, USB/offline custody or real key recovery. Internal test copies are
not the owner's two offline backups; the parent R1 execution retains the
actual preflight receipt.

Create `.7z` AES256 backups with encrypted filenames (`-mhe=on`), containing
the password-protected keystore, public certificate and non-secret recovery
metadata. Do not place either password in the bundle or receipt. For **each**
physical backup, read the actual saved archive back, decrypt into a new restricted
verification directory and use keytool to export its certificate. Compare the
keystore bytes, alias and public certificate fingerprint against the frozen
identity. Archive existence, a copy hash or `7z t` alone is insufficient.
Clean private verification copies on success/failure; never delete the original
identity on an interrupted run. Confirm owner custody/disconnection of both
verified media before Secrets provisioning. If either backup fails, stop.

## Environment provisioning, only after custody succeeds

Re-read `recipio-signing`: exact feature branch, owner approval, admin bypass
disabled. Abort on unexpected existing Secret/identity metadata; resume a
partial provision without regenerating or silently replacing the identity.
Send values from private child-process stdin to `gh secret set --repo
cc7279694-debug/menu --env recipio-signing`, never `--body VALUE`, for exactly:

- `RECIPIO_NEXT_KEYSTORE_B64`
- `RECIPIO_NEXT_STORE_PASSWORD`
- `RECIPIO_NEXT_KEY_ALIAS`
- `RECIPIO_NEXT_KEY_PASSWORD`
- `RECIPIO_NEXT_CERT_SHA256`

Base64 is transport encoding, not encryption. Do not create an unencrypted
Base64 backup. GitHub CLI encrypts Secret values locally before transmission;
only names/count/update times may be read back. A public receipt may record
the certificate fingerprint, alias, algorithms, validity, two-backup verification
status and five-name provisioning status. It must contain no private key,
password, recovery password, Secret value or raw private-process diagnostic.
GitHub Environment approval and real signing are later owner gates; do not
automatically approve a deployment, modify main or operate a phone here.

## Primary references

- [Oracle JDK21 keytool: password options](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html)
- [OpenJDK21 password-input implementation](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/sun/security/util/Password.java)
- [7-Zip official downloads](https://www.7-zip.org/download.html)
- [7z AES256 format](https://www.7-zip.org/7z.html)
- [7-Zip26.05 stdin decoding](https://github.com/ip7z/7zip/blob/b88c6bc09339de32f7d18bbab900686b244f42ba/CPP/Common/StdInStream.cpp)
- [7-Zip26.05 console charset and password handling](https://github.com/ip7z/7zip/blob/b88c6bc09339de32f7d18bbab900686b244f42ba/CPP/7zip/UI/Console/Main.cpp)
- [GitHub CLI Secret input/encryption](https://cli.github.com/manual/gh_secret_set)
- [Android durable signing/upgrade identity](https://developer.android.com/studio/publish/app-signing)
