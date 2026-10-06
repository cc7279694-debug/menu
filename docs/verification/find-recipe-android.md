# APK-6 Android verification

## Environment and ownership

Dedicated `Recipio_Backup_36` / Android API36 / emulator-5580 only. SDK `C:\Users\CDD\AppData\Local\MirraAndroid\sdk`; JDK21 under `C:\Users\CDD\AppData\Local\RecipioAndroid\jdk`. No physical phone connected; no phone data is cleared. Other project devices are not operated in this module.

## Final status

Final v17 /0.9.0-find-recipe production build, signature, installed preservation and offline walkthrough passed. New Android specialist regression passed16/16 after the test-only bootstrap cleanup repair. Fresh **unfiltered connected105/105PASS**,16classes,0failures/errors/skips;362.324s instrumentation, Gradle6m57s. The XML has105cases and includes all inherited AI/IME/Key/temporary-image/Backup/Cooking/Link/Share classes plus both new Finder classes and the inherited Capacitor example. No class filter or suppressed failed test was used. Earlier v15/v16 and pre-repair results are not presented as final acceptance evidence.

## Generated Android scenarios

`RecipeFinderUiInstrumentedTest` exercises installed WebView/Capacitor/SQLite and actual Android Back/IME, with isolated generated Fake Responses. Nine tests cover local typing/entry0POST, explicit search1POST, three verified sources/second selection1extract, actual Review gate/edit/save, unmatched candidate filtering, foreign extraction URL rejection, IME input retention and results Back, fake offline local usability, cancel/stale replies and one/zero candidates. `RecipeFinderBoundaryInstrumentedTest` adds seven Native bridge/candidate ownership/lifecycle boundary tests. Automatic real AI requests:0. Scoped connected run:16 tests,0failures/errors/skips,75.593s instrumentation; Gradle2m22s. Both classes run together, so the following UI startup verifies the repaired Native fixture does not leave SQLite opening behind.

Instrumented assertions are distinct from manual emulator walkthroughs and from physical user/Provider acceptance. Test records have generated UUID identities; no private input or complete Provider envelope is committed. Final unfiltered connected regression must include inherited AI/Link/Share/Backup tests, not just these new classes.

## Upgrade and offline preservation

The owned-device preservation script compared the actual installed v16 against its matching immutable APK, froze eight SQLite tables plus all current/history/retained image byte hashes and only the key-configured boolean, then installed v17 using `-r`. It never read plaintext keys, downgraded an installation or cleared data. At2026-10-06T12:09:14Z, upgrade PASS:all rows/IDs/times/order/image hashes and key status retained; SQLite4 integrity and foreign keys valid. Baseline/source artifacts are private ignored evidence, not Packet contents.

At2026-10-06T12:15:43Z, offline PASS:airplane1/Wi-Fi0/mobile-data0, force-stop cold startup, existing generated recipe/cover, Guided and real Back, Backup SAF open/cancel, Finder entry/input/leave. All baseline rows/images/key state unchanged; all guarded Provider/page-read/Search/Extract attempts0; observed connected WebView external requests/runtime errors0. Original network settings were restored and read back exactly. A cancelled picker proves availability and unchanged data, not a newly written backup archive; Node Backup2 round-trip and inherited native archive tests are separate evidence.

An earlier offline attempt failed because SystemUI, not RECIPIO, showed an ANR dialog over the app. The normal Close app action dismissed that system failure; no wipe/reset occurred. The script now explicitly verifies actual app focus before hardware Back. Both failed and successful records are retained, not overwritten.

The first unfiltered connected run passed51 cases then encountered a SQLite `PRAGMA journal_mode` opening lock after the new Native fixture had closed Activity before bootstrap finished. It stopped65/105,14failed with process crash; this is retained as incomplete/failed evidence. The fixture alone now waits for the real initialized home and both owned Native workers before cleanup. No production DB code, schema, permissions or dependencies changed; no application data was cleared. Both the fresh16-case specialist and fresh complete105-case unfiltered reruns passed. The final post-run logcat credential scan has0matches. Network settings read back1/0/0 exactly, then owned emulator5580 was normally shut down without wiping data.

## Not run / pending

Physical phone:Not Run. New-key actual Responses search/extract:Not Run by design; user acceptance is a separate at-most-two-POST action. No video, Share-target expansion, cloud or production deployment.
