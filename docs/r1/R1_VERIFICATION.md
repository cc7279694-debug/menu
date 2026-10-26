# R1 verification — no-key work completed; formal signing/migration deferred by owner

2026-10-26. Historical delivery status at verification: **RECIPIO_R1_BLOCKED_OWNER_ACTION**.

**Subsequent owner decision (2026-10-26): `RECIPIO_R1_SIGNING_MIGRATION_DEFERRED_BY_USER`.** The owner chose to pause long-term signing, two offline key backups and real migration indefinitely; no new R1 action is authorized. The previously recorded no-key test evidence remains unchanged and accepted with notes. This report is historical evidence, not an instruction to resume signing.
Owner explicitly has no two offline media and requested no-key work first.
No G4 acceptance, formal release or main product merge is claimed.

Tested source: d830733ab1a0dc4d88ea6c06bc325524fcc88a1b.
Final evidence update changes documentation only; no code/test/CI drift.
Branch: feat/recipio-ui-v2-glass-minimal.
Main at verification: 4a26b88658a309b0b06d24f42a764bdaf72eaaec.

## Fresh cloud run

[40288815966](https://github.com/cc7279694-debug/menu/actions/runs/40288815966)
ran on the tested source above; **all three jobs SUCCESS**:

| Scope | Actual result | Limit |
|---|---|---|
| Windows typecheck | PASS | Fresh current-source execution |
| Windows ESLint | PASS,0 errors /5 existing warnings | No warning cleanup or dependency upgrade |
| Full JS/TS suite |206 files /1168 tests PASS,408.37s | Mocks/fakes only;0 real AI |
| WebView build and production isolation | PASS |305 modules;9 shared V2;0 showcase/fixture assets |
| Capacitor sync | PASS | Build-side execution, not device proof |
| Gradle :app:testDebugUnitTest :app:lintDebug | PASS, executed tasks, not NO-SOURCE | No per-case XML/count retained; no invented JVM total |
| New complete v2 ZIP/stage test | Included in passing JVM suite | Actual ZIP,3 unique current/step/historical images, shared Cooking Cover, exact bytes/size/SHA and unchanged old destination file |
| Debug and AndroidTest APK build | PASS | Ephemeral cloud-preview debug signer; not formal identity |
| Separate unsigned Release | PASS | app.recipio.local.next, code26,0.10.0-ui-v2-g4-rc3-next; intentionally not uploaded or offered for installation |
| API36 native execution | **PASS 11**,4.329s | Fresh GitHub-hosted emulator;2 selected fixture classes, not full product/phone acceptance |

The Android fixture job was a separate key-free Ubuntu VM, gated by KVM and
at least4GiB available RAM. It verified current-run artifact integrity,
app/test/instrumentation identities, the sole Recipio_R1_Fixture AVD on
emulator-5554, API36 and no pre-existing fixture installation. Fresh install
only: no reinstall/clear/uninstall. See [native receipt](R1_NATIVE_EVIDENCE.txt).
The action stopped its own ephemeral cloud emulator; no local adb/phone or
other project's process/AVD was used.

Native evidence artifact: recipio-r1-native-evidence-40288815966-1,
ID12636390426,1125 bytes, archive SHA256
63bccfbb061546be1e648bacf68525bc251b9bfdfa8e58082796a89ac2a151a6.
This is an evidence-container hash, **not an APK or certificate hash**.
Downloaded status.txt said PASS 11; instrumentation said OK (11 tests).
A green skipped job was not treated as runtime evidence.

## Other executed checks

- Local combined targeted run:2 files /7 tests PASS,33.43s. Three independent
  install/migration tests and4 cloud guard tests. The latter run the actual
  Bash with fake SDK/non-APK files; they are not native tests.
- Migration test uses the frozen generated real v1 ZIP and real independent
  SQLite stores. Preview/cancel preserves source and nonempty destination;
  explicit confirmation replaces the target, preserves IDs/time/order/content
  and search, keeps the source and captures old target data/images in the
  test safety-copy port. Native image/SAF ports in this test remain emulated.
- Targeted ESLint, Bash syntax, Actions syntax/static isolation and diff checks PASS.
- Modern official7-Zip26.05 checksums verified. Synthetic AES256+header-encryption
  preflight PASS: no password argv,2 internal test copies decrypted identically,
  wrong password refused. These were **not offline backups and held no real key**.
  See owner plan for tool hashes and corrected creation vs recovery stdin behavior.
- Scoped signing-identity audit found no declared project identity; this was
  not a whole-computer search. Added .p12/.pfx ignores alongside existing
  keystore patterns. No private signing file tracked.
- Environment readback: exact feature branch, owner review, admin bypass
  disabled,0 Secrets. Self-review stays enabled for the sole owner; this is
  an explicit second confirmation, not two-person review.
- Main/feature signing-workflow blob both ea28523e97e4c338bf72ce4b534ae46e77aeeab6.
  Registered signing logic was not changed.
- STATIC_ONLY coexistence audit: applicationId-derived FileProvider authority,
  current Context database/files/cache paths and Directory.Data showed no
  old-app absolute path or shared identity blocker. Fixed old authority is
  androidTest-only. This is not merged-manifest, install or upgrade evidence.

## Failure and repair receipt

First run [40288302114](https://github.com/cc7279694-debug/menu/actions/runs/40288302114)
on b99cd3636a67156a65d80c804dee0dfee57c0abf failed Android test compilation:
Android JSONObject lacks desktop similar(JSONObject). Commit d830733 replaced
that test-only call with an Android-compatible recursive assertion, ignoring
object-key order while checking array order and numbers. The initial run was
superseded/cancelled and is not a successful run. The new full three-job run
is the final evidence. Production logic, SQLite v4 and Backup v2 were unchanged.

## Remaining NOT_RUN / owner actions

| R1 stage | Status | Remaining boundary |
|---|---|---|
| R1-A permanent identity/custody | BLOCKED_OWNER_ACTION |2 distinct offline physical media, private unobserved password entry, real key and both decrypt+certificate checks |
| R1-B real signing | NOT_RUN |5 Environment Secrets, owner approval, permanent certificate pin, real signed-candidate validation |
| R1-C permanent-signature .next upgrade | NOT_RUN |2 increasing APKs under the same safely backed-up permanent certificate |
| R1-C full SAF restore UI/physical phone | NOT_RUN | Native fixtures and JS/JVM proof are not picker/UI end-to-end acceptance |
| R1-D formal candidate | NOT_BUILT | No formal APK bytes/SHA256 or certificate fingerprint exists to report |
| Personal-data migration / old-app deletion | NOT_RUN | Separate explicit owner action required; old app/phone/data untouched by this task |

[Phone acceptance preparation](R1_PHONE_ACCEPTANCE.md) is ready, but no phone
operation is requested now. [Owner signing plan](R1_OWNER_SIGNING_PLAN.md)
concentrates future private input/backup/provisioning; it is a plan, not an
executed private wizard. No real key, password, personal archive or private
photo was put in Git, logs, chat or artifacts. Real AI calls:0.

Full G4 phone/TalkBack/performance acceptance remains separate and unfrozen.
No Release, tag, main merge, force push, large review ZIP or later module.
