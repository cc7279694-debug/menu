# G2 Android targeted supplement — updated 2026-10-24

Status: **UI_V2_G2_ANDROID_ENV_BLOCKED**.
This is an environment-gate result, not a product failure or Android acceptance.
No v21 runtime acceptance scenario was completed. The 2026-10-24 retry booted
the owned emulator but encountered a SystemUI ANR and a v19 baseline-probe
timeout before installation. Earlier gate-only audits are retained below.
No background polling was created.

## Latest retry — 2026-10-24, China Standard Time

### Gate, actual device and candidate

- Entry workspace clean; local/fetched remote feature HEAD
  `f9dd788c0a5e84873662fd456c6e35f9fd97fe8a`; remote main unchanged at
  `649804a8209413f9d682f1079a4fd19ea84cd064`.
- At `2026-10-24T03:36:01.5470183Z`, free memory4.903GiB. Immediately before
  launch at03:37:01Z,4.645GiB: **4GiB launch gate PASS**.
- No other emulator was running. Launched existing **Recipio_Backup_36** only,
  configured2GiB, at port5580, with no snapshot load/save and **no wipe**.
  Launcher PID20388 and child QEMU PID15244 command lines both explicitly
  identified `-avd Recipio_Backup_36 -port 5580`; ADB confirmed its AVD name.
- Boot completed in109225ms. Actual device properties: Android16 / API36,
  `sys.boot_completed=1`. Actual installed package was **v19 /
  0.9.1-logo-refresh**, not v21.
- The pre-install probe passed its installed-v19 APK-byte assertion against
  `e0a4257ce46bddac8bed015f03ae7e81392f10388b44fee8afc0a3085f98e18d` before
  attempting the WebView connection. Candidatev21 remained17,249,848 bytes,
  SHA-256 `c2c770e12e1af995c522da3d1e2b898ad1eca2a6fe3535ea3a065fe524d57090`.

### Environment failure / data guard

- Attempted read-only v19 baseline probe using the existing selected-emulator
  CDP helper. It failed with **`CDP timeout: Runtime.enable`**, exit1. No SQL
  query or snapshot comparison completed; no recipe/image data was recorded.
- At `2026-10-24T03:41:21Z`, native window focus showed **Application Not
  Responding: com.android.systemui**; free host RAM had fallen to1.592GiB.
  This is an observed Android system/environment failure, **not a G2 product
  defect**: v21 was never installed. No cause beyond this evidence is asserted.
- Historical v19 logo evidence contains2recipes/1image; only1recipe could be
  traced to the known generated-fixture prefix. The other did not match exact
  title/ID constants in the narrowly inspected prior verification scripts.
  **Fixture provenance remains UNKNOWN**; no title, ID, private row, image or
  credential is included here. Historical preservation equality is not proof
  that all data is controlled. Current database contents were not obtained.
- In accordance with the controlled-data/unknown-personal-data boundary, stop
  **before install or any business-data write**. The user must confirm the
  existing dedicated emulator library is test-only before an upgrade proceeds.
  Do not clear data, reinstall a baseline or downgrade to manufacture a fixture.

### Cleanup / acceptance boundary

- Only this task's confirmed emulator received normal `emu kill`; its launcher
  and QEMU exited. The failed Node probe also exited. At03:41:52Z, none of those
  three owned processes remained; free RAM recovered to4.858GiB.
- No other project's process or phone was operated; the existing ADB server was
  left running. No install,
  uninstall, app-data clear, SQL write, fixture creation, SDK install or AI call.
- A: v19 metadata **PASS**; v19→v21 install/data comparison **NOT_RUN**.
  B–E, including v21 home/search/images/editor, IME/Back, cooking, histories,
  offline and Backup-cancel acceptance: **NOT_RUN**. No acceptance PASS count.
- SQLitev4 integrity, IDs/times/order/records/images before-after equality:
  **NOT_RUN**. No claim that unqueried business data was proven unchanged.
- Existing frontend/JVM/build results remain historical, not rerun. No tracked
  production code, Native contract, dependency, test source or APK changed.
  The failed read-only probe is confined to ignored verification output.
  Only this supplement and the affected current-state paragraph are updated.
- Final status: **UI_V2_G2_ANDROID_ENV_BLOCKED**. Requires both a stable owned
  Android environment and explicit controlled-data provenance confirmation.
  No automatic retry; no main/tag/deployment/G3/G4/video action.

## Fixed candidate / repository gate

The following sections preserve the **2026-10-23** gate-only audit and retry;
the dated 2026-10-24 section above is the latest environment evidence.

| Check | Result | Fresh evidence |
| --- | --- | --- |
| Branch / clean entry | PASS | `feat/recipio-ui-v2-glass-minimal`; entry `git status --porcelain=v1` empty |
| Local / fetched / live remote feature HEAD | PASS | All `08512b0f3a038deed50c7a5dd9395374a48578b6` before this report-only commit |
| Fetched / live remote main | PASS | `649804a8209413f9d682f1079a4fd19ea84cd064`; not modified |
| Candidate file / SHA-256 | PASS | File exists, 17,249,848 bytes; hash below matches the approved candidate |

APK: `artifacts/recipio-ui-v2-g2-v21-debug.apk`

SHA-256: `c2c770e12e1af995c522da3d1e2b898ad1eca2a6fe3535ea3a065fe524d57090`

Existing candidate metadata: package `app.recipio.local`, versionCode21,
versionName `0.10.0-ui-v2-g2-rc1`. These identifiers and the v19 certificate
comparison are inherited from `evidence/g2/apk-metadata.json`, not newly executed
installation or signature tests. No APK rebuild or replacement in this task.

## Environment / ownership gate

- Fresh Windows CIM measurements: available RAM **1.818 GiB** at
  `2026-10-23T14:33:47Z`, and **1.836 GiB** at
  `2026-10-23T14:33:59.2333309Z`; total about15.88 GiB.
- Required available headroom: approximately **4 GiB**. **FAIL**; no emulator
  launch permitted. These are one bounded gate audit, not a recurring monitor.
- Read-only process inventory found no running emulator/QEMU, Android Studio,
  Java or Gradle process. No other project's process was stopped or changed.
- Registered dedicated AVD: **Recipio_Backup_36**, Android API36 / Google APIs /
  x86_64, configured2G RAM, Pixel6,1080x2400,420dpi. Registration/configuration
  verified; runtime Android version, boot and safe usability **NOT_RUN**.
- `C:/Users/CDD/.android/avd` is a Junction to `E:/Android/avd`; the registered
  `.ini` resolves to that existing RECIPIO AVD. No AVD was created or modified.
- Existing ADB host server PID19136 listens on127.0.0.1:5037. Its executable/
  command line were not visible, so server project ownership is **UNKNOWN**.
  A bounded, read-only `host:devices-l` query to the already-running server found
  **0 emulators /1 non-emulator device**. No server was started; no device-target
  command was sent. No phone serial or private data recorded; phone untouched.
- No SDK installation, emulator reuse, physical-phone operation or memory
  cleanup attempted. No Mirra/Lithic/Vectra/other-project task was operated.

## Requested runtime scenarios

All rows are **NOT_RUN — safe-memory gate failed**. None may be inferred from
the existing browser, JVM, package or signature evidence.

| Group | Requested checks | Result |
| --- | --- | --- |
| A — install / upgrade | Installv21; controlled v19 data retained during non-destructive upgrade; SQLitev4; identical recipe IDs, records and image bytes | NOT_RUN |
| B — home / detail | Cold entry; local search; creation-descending recent additions; library filter and return position; local image; no-image/title-only | NOT_RUN |
| C — editing / IME | Create/edit; first real Back only hides IME; second Back enters existing leave flow; discard preserves original; picker cancellation preserves image | NOT_RUN |
| D — cooking / records | Focus/Guided navigation creates no record; explicit completion creates exactly1; cooking/change histories readable | NOT_RUN |
| E — offline / legacy entries | Airplane cold launch and saved recipes; existing G3 entries; no automatic AI/web/Finder; Backup open/cancel leaves data unchanged | NOT_RUN |

Cover-upgrade before/after data checks, actual IME/Back and airplane-mode results
are therefore **NOT_RUN**, not PASS. No app installation, uninstall, data clear,
database access, controlled fixture creation or backup operation occurred.
No functional failure was observed because execution did not begin.

## Existing evidence / warnings — not rerun

The approved source remains unchanged. Existing full frontend/JVM/build evidence
in `G2_VERIFICATION.md` is retained, **not re-executed or relabelled as this
supplement's results**:1079 JS/TS tests,188 JVM tests, typecheck, local build,
Capacitor sync and APK packaging. Existing warnings remain historical:
ESLint0errors/5 legacy Next image warnings; Android lint0errors/38 warnings;
web chunk-size and Gradle/SDK/flatDir/unchecked/SQLCipher packaging notes.
No new runtime warning assessment was possible.

## Change / Git boundary / continuation

### Bounded retry — 2026-10-23, 23:37–23:40 China Standard Time

- User requested one retry. Entry local/fetched remote feature HEAD matched
  `1ba1f680416ae485191a2cbc63ae7c36e11d8a20`; workspace clean; remote main still
  `649804a8209413f9d682f1079a4fd19ea84cd064`.
- Candidate reread:17,249,848 bytes; SHA-256 still
  `c2c770e12e1af995c522da3d1e2b898ad1eca2a6fe3535ea3a065fe524d57090`.
- Free RAM: **3.925 GiB** at `2026-10-23T15:37:58.9710113Z`, then
  **2.938 GiB** at `2026-10-23T15:39:59.9379380Z`. Both below4GiB; gate **FAIL**.
- No running emulator/QEMU, Android Studio, Java or Gradle found. Existing ADB
  host inventory again reported0 emulators/1 non-emulator device; no device-target
  commands sent. Dedicated Recipio_Backup_36 registration/configuration unchanged.
- No launch, install, app-data access, runtime test, AI call, process shutdown or
  recurring retry. All A–E runtime results above remain **NOT_RUN**. Production
  code and APK unchanged; only this report receives the fresh retry evidence.
- Status remains **UI_V2_G2_ANDROID_ENV_BLOCKED**. Stop; do not reduce the gate.

### Protected boundary

- Production source, tests, dependencies, Android configuration, SQLitev4,
  Backupv2, Logo and APK bytes: **unchanged**.
- Only this report is added. Entry workspace was clean; final commit and normal
  feature-branch push are reported in the delivery, with a fresh remote equality
  and clean-tree check. This documentation commit does not replace the frozen
  candidate's source/build provenance.
- No main change, merge, tag, deployment, AI call, G3/G4 or video work.
- Stop now. When at least approximately4GiB headroom is safely available,
  resume this same approved A–E supplement on the dedicated RECIPIO emulator;
  first establish controlled v19 fixture provenance, without uninstall/clear.
  No automatic retry is scheduled. Independent ChatGPT acceptance remains pending.
