# RECIPIO R1 — execution checkpoint

2026-10-26. Owner-approved milestone; internal no-key tasks continue together.
User subsequently confirmed: no two offline media yet; finish the no-key work.

## Contract and verified entry

- Feature: `feat/recipio-ui-v2-glass-minimal`, entry
  `b0052fe1e4ca8407237be721a64bea93c7b24351`.
- Main: `4a26b88658a309b0b06d24f42a764bdaf72eaaec`; PR2 merged.
  S01-R accepted by ChatGPT, per the owner. Main contains only the registered
  signing workflow, not G4 product integration.
- Signing workflow blob matches main/feature:
  `ea28523e97e4c338bf72ce4b534ae46e77aeeab6`.
- Dedicated environment remains exact-feature-branch/owner-review protected,
  admin bypass disabled, zero Secrets. No signing identity found in declared
  project/RECIPIO signing locations. This is not an exhaustive disk search.
- Permanent candidate `app.recipio.local.next`; original `app.recipio.local`
  and its data must remain untouched. G4 is not frozen by R1 preparation.

## R1-A owner gate

**BLOCKED_OWNER_ACTION_NO_OFFLINE_MEDIA.** Only internal NVMe/SATA disks are
connected; C/D/E folders are not two offline backups. No real signing key,
password, certificate pin, wizard execution or Secret upload has occurred.
Never substitute a runner/debug key for the permanent identity.

[Owner signing plan](R1_OWNER_SIGNING_PLAN.md) defines the later single private
interaction, two distinct physical backups, actual decryption and certificate
comparison before Secret provisioning. Passwords cannot enter Codex's captured
terminal, screenshots, argv, transcripts, repository or chat.

Modern non-secret tool preparation is complete, without global installation:
`E:/CODEX/Tools/recipio-signing/7zip-26.05/portable/x64/7za.exe`.
Official archive SHA256:
`f27a8f103c84785026edcba1f67faf1357225df9d19ddb0b7760d55947141bc7`.
Executable SHA256:
`7ddf0a3bc451e166679296be630d6f0573eb386159c04184761c43020c484291`.
Version output26.05 verified; no real key material used.
Actual tool preflight used public synthetic plaintext/password only: AES256
header encryption, two internal test-copy decrypt/byte comparisons and wrong
password rejection PASS, without password argv. These are NOT offline key
backups. Creation uses bare `-p`; list/test/extract must omit `-p` to prompt
through stdin (bare `-p` there denotes an empty password). No private helper
or keytool real-key execution is claimed by this synthetic result.

## No-key technical scope

1. Extend only synthetic migration/archive tests. Reuse SQLite4, frozen v1,
   Backup v2, existing reference rules and atomic restore; no production rewrite.
2. Reuse feature-only `recipio-g4-cloud.yml` for complete JS/TS, JVM, lint,
   sync/build and isolated generated Android fixtures. It is not on main;
   the registered signing workflow is not modified by this segment.
3. Native fixtures must use a fresh hosted runner/AVD, API36, known serial,
   generated cache/provider/fixture.db only. No local emulator/phone/unknown
   data. Exact backup/storage classes only; no real AI.
4. Capture actual cloud results once, with tested SHA. Environment failure
   means NOT_RUN for device checks, not simulated PASS.

The local PC had1.87GiB available during entry inspection, below the4GiB
emulator gate. No local emulator or Gradle run is started. Targeted lightweight
Node/guard checks may run; heavy verification belongs to isolated cloud CI.

## Evidence boundaries and remaining milestones

- Node SQLite + frozen ZIP tests: model/service evidence, not Android SAF.
- JVM actual ZIP/staging/byte SHA: archive evidence, not end-to-end device restore.
- Cloud Native fixtures, if run: real Android emulator runtime, not a physical
  phone, not final `.next`, not a permanent-signature upgrade proof.
- R1-B real signing, R1-C same-certificate26→27 upgrade and R1-D final candidate
  remain NOT_RUN until R1-A custody and owner approval are complete.
- Original-phone export/restore requires separate explicit confirmation.
  [Phone checklist](R1_PHONE_ACCEPTANCE.md) is preparation only.

No main merge, Release, real-key operation, personal-data operation or G4
acceptance may be inferred from a successful no-key build. Next continuation
must read [verification](R1_VERIFICATION.md), current Git/Environment metadata
and this checkpoint. No large review archive is required.
