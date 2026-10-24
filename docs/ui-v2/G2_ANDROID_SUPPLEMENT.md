# G2 Android targeted supplement — 2026-10-24

Status: **UI_V2_G2_ANDROID_READY_FOR_REVIEW**.
The requested A–E supplement passed on the final candidate below. This is
Codex emulator evidence, not user physical-device or independent ChatGPT acceptance.

## Gate / scope

- Feature branch `feat/recipio-ui-v2-glass-minimal`; clean entry/fetched HEAD
  `155eecaad010305c4c4e27c98e4176d1f1c954b8`. Stable main remains
  `649804a8209413f9d682f1079a4fd19ea84cd064`.
- User explicitly permitted **preserving cover upgrade**. Provenance of one
  pre-existing recipe remains unknown: protect ALL existing rows/images, not
  relabel them as controlled. Only newly generated G2 fixtures were changed.
- Dedicated **Recipio_Backup_36**, emulator-5580, Android16/API36, existing AVD.
  Actual WebView360×734; screenshot540×1200. First launch5.761GiB free; final
  launch4.090GiB passed the4GiB gate. QEMU PID27504 matched AVD/port/launcher30184.
- No other emulator/process/data or physical phone operated; no SDK installed,
  polling, AI request, main/tag/deployment/G3/G4/video action.
- Final owned emulator normally stopped; both owned processes exited;5.168GiB
  free afterward. Existing host ADB server left alone. Network and IME test
  settings restored to their observed starting values.

## Real failure → minimal repair → final candidate

Visual inspection caught a real G2 defect after earlier logical smoke passed:
the minified cooking popup was at **(-180,-367)** instead of(0,0), hiding steps.
Waiting for animations did not repair it. The shared dialog centering utilities
survived an optimizer-folded CSS `translate:none` reset.
`step-viewer.tsx` now supplies four zero-position/translation Tailwind overrides;
existing `twMerge` removes the shared half-screen centering classes.
Only this one production UI line changed; no data/Native/record semantics changed.

Compiled-production regression first **RED** at320px(-160,-422), then **16/16
GREEN**: Focus/Guided ×320/390/412/768 ×100/200% text, checking body/footer
bounds and actual next/exit. Final APK geometries start at(0,0), fill360×734;
both footer controls are on screen and were operated through real WebView touch.
See [before](evidence/g2-android/cooking-before.png) /
[after](evidence/g2-android/cooking-after.png), geometry and compiled RED/GREEN JSON.

Final APK: `artifacts/recipio-ui-v2-g2-v21-layout-fix-debug.apk`
- 17,307,188 bytes
- SHA-256 `ae343d4222c06dcb699fff5158d5f7171e86a26d4b338c967f331a6ec3e815e9`
- `app.recipio.local`; code21 / `0.10.0-ui-v2-g2-rc1`; min24/target36
- Debug certificate SHA-256
  `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`
- Signature verified; all15 built web assets byte-match packaged assets.
  Two generated Capacitor Cordova files are not counted as Vite build assets.
- Original approved c2c770… candidate retained unchanged; it is **not** the fixed
  candidate. Exact metadata/source fingerprints: [final-apk.json](evidence/g2-android/final-apk.json).

## Actually executed on final APK

| Group | Result | Evidence |
| --- | --- | --- |
| A — preserving upgrade | PASS | v19→originalv21, then originalv21→fixedv21; NOT a direct19→fixed claim. No uninstall/clear/downgrade. All8 tables, IDs/times/order and image bytes equal before/after each upgrade; schema4/integrityOK/FK0. |
| B — home/detail/library | PASS | Actual local SQLite; name-only/no-image, full generated recipe/local PNG byte hash; ingredient search, duration filter, query/scroll return, creation-descending recent order. |
| C — edit/IME/picker | PASS | First hardware Back hides actual IME only, draft retained/no page Back/dialog. Second Back opens original leave guard; native Cancel retains draft, native OK discards without changing saved recipe. Real SAF cancel retains image reference/bytes. |
| D — cooking/history | PASS | Focus/Guided next/previous/exit=0 new records; nested-sheet Back stays in Guided; explicit completion=exactly1 for new fixture; cooking/change histories readable. Final panel/controls genuinely on-screen. |
| E — offline/old entries/backup | PASS | Airplane+WiFi/data-off cold start; saved image/recipe/Guided usable. G3 AI/link/Finder open/cancel=0 online calls. Actual Backup SAF cancel leaves all8-table/all-image fingerprints identical. |

Final Android receipt has **10 distinct grouped checks**, not10 JUnit tests.
IME checks completed on this same final APK before a picker-observer timeout;
the remaining checks resumed afterward with that explicit retained receipt.
The ignored runtime receipt named in previousStageEvidence is committed here
as final-ime-before-picker-timeout.json; this alias is also annotated in the
final smoke JSON without changing its runtime result.
No old APK's logical cooking PASS is used as repaired-layout proof.
All15 pre-patch recipes/2images, including the original v19 records, remain
byte-for-byte protected; controlled final writes bring totals to28recipes,
2cooking records/2changes/3images. No real recipe edited/deleted.
[Final smoke](evidence/g2-android/final-android-smoke.json),
[backup cancellation](evidence/g2-android/final-backup-cancel.json),
[upgrade receipts](evidence/g2-android/upgrade-original-fixed-v21.json).

## Fresh regression / limits

- Full unit suite **198 files /1079 PASS**, exit0,767.52s, on repaired source.
- Production browser11 groups PASS; compiled layouts16 PASS; errors/external
  requests0. Browser results are distinct from actual Android evidence.
- Typecheck PASS; ESLint0errors/5 existing legacy Next image warnings.
- Local minified build PASS, Capacitor sync PASS, assembleDebug PASS(58s).
  Restored portable junction paths after sync; no Android tracked config change.
- Existing chunk>500kB, Vite native-config notice, jsdom scrollTo/legacy test
  warnings and Gradle flatDir/unchecked notes remain; no unrelated cleanup.
- JVM188 /Android lint38 warnings /G1 three-theme checks are **historical**;
  NOT rerun this UI-only targeted supplement. Full connected suite, OEM/physical
  phone, TalkBack, new real AI and destructive restore: **NOT_RUN / out of scope**.
- Earlier SystemUI ANR was handled through its existing Wait action, not app
  changes. Final install exceeded a30s observer deadline; exact installed APK
  hash and quiescent data equality subsequently verified. Picker initially
  appeared after the observer's bound; harness now polls actual native focus,
  without a production delay/debounce. Failure receipts retained, not erased.
- Raw SQLite/images remain only in ignored local safety copies; no private
  media, API key, raw database, cookie or credential is committed.

## Git / stop

Only one UI line, compiled regression and this task's documentation/evidence
change. Normal commit/push on the existing feature branch only; exact final SHA,
remote equality and clean worktree are checked in delivery. No merge/tag.
Earlier gate-only reports remain in Git history155eeca; their NOT_RUN results
are superseded only by the actual evidence above. Stop for independent review.
