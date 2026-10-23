# G2 Android targeted supplement — 2026-10-23

Status: **UI_V2_G2_ANDROID_ENV_BLOCKED**.
This is an environment-gate result, not a product failure or Android acceptance.
No runtime scenario was executed. No background polling was created.

## Fixed candidate / repository gate

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
