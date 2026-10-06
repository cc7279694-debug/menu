# APK-6 Find a Recipe — execution checkpoint

Status:**APK_6_PENDING_DEVICE_TEST**. Implementation and final automatic/emulator verification passed; only physical/new-key Responses acceptance remains.

## Approved boundary

Baseline main: `8b2246dbfac674aa837cb25675893fbbef2d79c5`, v0.8.0-share-intake.
Branch: `feat/recipio-find-recipe`, created directly from stable main; no experiment history merged.
Scope: explicit online dish search → 1–3 verified public-source candidates → explicit selected-source extraction → existing AI Review → ordinary local Recipe.
SQLite4 / Preview7 / Backup2 stay frozen. Existing ChatCompletions, local search, Link Import, Share Intake and key storage remain inherited. No real Provider requests in automated tests; previously exposed keys are not reused.

## Execution ledger

- Task1 contract: implemented and tested.
- Task2 Native Responses client: implemented and mock-HTTP tested.
- Task3 structured source / selected-source verification: implemented and tested.
- Task4 service lifecycle: implemented; cancel/restore/late-reply and Preview transition tests passed.
- Task5 input/candidate UI: implemented and component tested.
- Task6 existing Review handoff: implemented and component/integration tested.
- Task7 save/backup/privacy: implemented; ordinary SQLite Recipe and Backup2 regression passed.
- Task8 Android/final delivery: installed preservation/offline walkthrough, specialist16/16, complete unfiltered105/105, final full1027 /native-app439 /JVM174 and all build checks passed. Final APK frozen below; Packet/remote capture occurs after the clean focused commit.

Ruling: retain the unmerged Logo branch and its v16 delivery; new APK uses a unique code greater than all delivered versions, not a code reused from main.
Ruling: Responses extractor requires web_search to be advertised according to the approved preflight. Phase2 prohibits search and rejects any executed search or any extractor target other than the frozen selected URL. No prompt-only trust.

## Evidence

Fresh final implementation regression:193 files /1027 tests /564.46s; native-app subset69 files /439 tests /131.66s; Native JVM21 suites /174 tests /47s. Typecheck, lint, local build, Capacitor sync, Android lint/build and Debug signature passed. Actual v16→v17 upgrade and offline cold-start/image/Guided/Back/Backup-picker cancellation passed with generated emulator data. A first connected run was incomplete after51 passing cases because a Native test closed Activity before SQLite initialization finished; test-only readiness/worker cleanup repaired, specialist16/16 and fresh unfiltered105/105 across16classes passed,0failures/errors/skips. No schema reset, production database change or personal-data cleanup was used. Physical/new-key Provider acceptance remains separate from desktop preflight and fake Android tests.

## APK freeze

`artifacts/recipio-find-recipe-v17-debug.apk`:17,451,024bytes; SHA256 `319c52b22c40169a310eee4e2bc8b68b6379a87a9dd5572e6106443469437ea7`; package `app.recipio.local`, code17, name `0.9.0-find-recipe`, Debug v2 signature verified. Final build byte-equal to the candidate used in the actual v16→v17 upgrade and connected verification. No APK rebuild from different production sources after Android evidence.

## Inherit / stop boundary

Do not repeat product planning or reopen frozen SQLite4/Preview7/Backup2. Do not reuse exposed keys, merge main/tag/deploy, or start video/another module. After clean feature delivery the sole acceptance continuation is a user physical/new-key Responses Search→Select→Extract→Preview, at most2paid POSTs. Existing APK-4 account/key acceptance is not APK-6 Responses acceptance.
