# UI V2 G3 remainder verification — 2026-10-24

Status: **UI_V2_G3_PENDING_ANDROID_TEST**.
This is Codex implementation/verification evidence, not ChatGPT independent
acceptance and not a new user phone result.

## Baseline / scope

Existing branch/worktree: `feat/recipio-ui-v2-glass-minimal` /
`E:\CODEX\VIBE CODING\recipe-step-app-ui-v2`.
Entry clean; fetch, ancestry and frozen G3-0 commit were checked. Stable main
remains `649804a8209413f9d682f1079a4fd19ea84cd064`.
G3-0 `6cc631a` /v22 acceptance is [registered separately](G3_FOUNDATION_ACCEPTANCE.md).
Only G3-1/2/3 presentation and corresponding tests changed. No G4 or video.

## Actual changes

| Area | Production files / result |
| --- | --- |
| AI input | `ai/intake-screen.tsx`: V2 task title, contract-derived limits, screenshot grid/reorder/remove/read-only Sheet, explicit request/cancel/failure/cleanup feedback. |
| AI Review | `ai/preview.tsx`, `review-panel.tsx`, `recipe-editor.tsx`: V2 editor, three-state counts/text/icons, default expanded inferred/missing, focus existing field/add-row with reduced-motion-aware highlight, full acknowledgement near save. Disabled UI plus existing Service/beforeSubmit guard; no source-state promotion. |
| Recovery | `ai/save-recovery.tsx`: V2 styling only, existing duplicate decision/original-UUID reconciliation retained. |
| Link | `link-import/screen.tsx`: single V2 URL form, complete/partial/multiple/body/error states; Parser preview distinct from explicitly requested AI Review. |
| Finder | `find-recipe/screen.tsx`: input counts, truthful solid source cards, selected extraction and cancellation state; existing two explicit operations unchanged. |
| Shell/share | `library-app.tsx`, `ui-v2/intake.css`, `production.css`: same theme/root for all tasks, no old duplicate Logo shell; bounded pending-share notices, no route/service/lease changes. |
| Tests only | Five Android instrumentation files update display selectors and disabled-save assertion. No `src/main/java`, Manifest, Native protocol or Gradle change. |

## Fresh final checks

Source and source tests frozen at **e182a72**. Later changes are isolated QA tools,
screenshots and documentation; they are not in the production build graph.

| Check actually executed | Result |
| --- | --- |
| `npm.cmd test -- --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=dot` | **203files /1133tests PASS**, exit0,715.05s; start16:48:01. |
| Final targeted AI/Link/integration | 3files/18PASS; subset of1133, not additive. |
| `npm.cmd run typecheck` | PASS. |
| `npm.cmd run lint` | 0errors;5existing legacy Next image warnings. |
| `npm.cmd run build:local` with matching version metadata | PASS. |
| Production graph isolation | PASS:304modules,8sharedV2,0showcase,0fixture assets,write:false. |
| Installed Playwright browser harness | PASS:19groups,13screens,119records (70layout/36portal/13location); errors0/external0. |
| `npx.cmd cap sync android` | PASS. Portable existing plugin paths restored afterward; no tracked Android config delta. |
| Gradle `:app:assembleDebug :app:assembleDebugAndroidTest` | PASS,1m31s,141tasks (53executed/88up-to-date). Compilation/package only. |
| APK signing, version and asset readback | PASS;15built web files match packaged SHA-256,0mismatches,0showcase/fixture entry names. |
| Fresh static source / QA tool self-review | One P2 field-location omission fixed RED→GREEN; no remaining identified blocker. Not independent ChatGPT acceptance. |

Raw command logs are retained locally in ignored
`output/playwright/ui-v2/g3-remainder/final-*.txt`; compact durable receipts are
[test results](evidence/g3-remainder/test-results.txt),
[browser results](evidence/g3-remainder/browser-results.json),
[APK metadata](evidence/g3-remainder/apk-metadata.txt).

### Behavior / acceptance matrix

| Requirement | Evidence / boundary |
| --- | --- |
| AI not explicitly started →0 requests | Production consumer tests and browser Fake bridge counter. |
| Images bounded/reorder/remove | Existing service tests + new presentation tests/browser real controls; images generated in QA only. |
| Review unconfirmed cannot save | UI disabled, forged submit/Enter and real Service `review_required` checks; confirmed save goes ordinary Recipe. |
| Duplicate / uncertain save | Existing tests retained; browser real repository commits then simulated lost acknowledgement/reconcile failure, recovers same UUID without second create. |
| Parser complete/partial | Real Parser + LinkService/browser; both0AI; partial directly completed. |
| AI fallback explicit | Link screen tests, button-only existing Service path retained. |
| Finder separate Search/Extract | Real FinderService with Fake Native ports; counts/selected ID and URL preserved. |
| Source authenticity / selected URL | Existing full-suite bridge/service deterministic source-matching tests; Native runtime not rerun, no new true-provider claim. |
| Share does not overwrite dirty input | Production controller and integration/browser queue; no AI/GET. |
| Late results / restore busy | Existing service/route tests in final full suite; ownership algorithms unchanged. |
| Real Android IME / Back | **NOT_RUN** onv23. Existing Native routing unchanged, instrumentation selectors compiled only. Browser Back is not IME proof. |
| Themes / portals | Warm Ivory/Pure Glass/Soft Sage; screenshot Sheet, discard Dialog and Preview computed theme/tokens. Actual settings switch preserves text/image IDs/operation ID. |
| Width/font/fallback |320/390/412at100%;320at200% with existing solid attribute; scroll/controls/no horizontal clipping. Reduced-motion13location checks (12no animation,1normal highlight finishes). Not Android font scaling or browser CSS-support fallback proof. |

### RED→GREEN / retained diagnostics

AI presentation7RED, title hierarchy1RED, location1RED; Link18RED; Finder5RED plus
cancel-notice1RED; integration4RED against restored old presentation. Each was
followed by a passing relevant run. Intermediate45file/342test run had one old
Link disabled-button focus assertion: updated to check disabled UI **and**
forced-submit focus/write guard rather than expect an impossible disabled click.
Final source suite is1133PASS, not a reuse of G3-0's1095.

The first integration Fake returned the same consumed share forever, causing a
test-only loop. Corrected to existing queue/empty contract; only its verified own
test processes stopped. A Playwright full-page photograph between focused numeric
input and checkbox caused blur/scroll to move pointerup off checkbox at320/200%.
Trusted-event diagnostics and a no-pre-click photograph comparison isolated that
tool condition. Photograph now follows actual checkbox operation; no retry/force/
state injection/delay/production workaround. One diagnostic listener type guard
was fixed in QA only. Final errors0; prior failures remain in ignored output.

Inherited test stderr includes Fake Provider failures, IndexedDB delete/close,
jsdom scrollTo and older unawaited assertions. Lint keeps5Next image warnings;
Vite retains native-config/chunk size warnings, Gradle flatDir/deprecation/unchecked
notes. Not hidden and not relabelled as fresh failures. No unrelated cleanup.

## Android environment / NOT_RUN

Initial gate16:19:21:3.394GiB<4GiB. Final gate after final suite and stopping this
task's Vite5184, **2026-10-24T17:00:19+08:00:2.536GiB<4GiB**. No running emulator.
Existing `Recipio_Backup_36` registration is not an active ownership claim.
ADB PID14196 had no readable command line and was left alone. No ADB/device,
physical phone, other project process or emulator was operated. No SDK installed,
no automatic queue/polling. Memory gate applies even with no emulator running.

| v23 Android check | Result |
| --- | --- |
| Preserving22→23 upgrade, SQLite IDs/records/local image hashes | NOT_RUN |
| AI/Link/Finder entry/settings-return/dialog themes | NOT_RUN |
| Actual Android IME first Back / second Back | NOT_RUN |
| Offline cold start, theme retention/cooking navigation | NOT_RUN |
| Connected/JVM rerun, TalkBack, performance, OEM phone | NOT_RUN; complete suites deferred toG4 or specific later authority. |
| New real Provider / destructive restore | NOT_RUN; real Provider calls0, no personal data read or changed. |

Accepted v22 user-phone six-check evidence remains historical and is never
substituted for v23 device evidence. User/ChatGPT must review this new candidate.

## Final candidate

- Absolute path: `E:\CODEX\VIBE CODING\recipe-step-app-ui-v2\artifacts\recipio-ui-v2-g3-v23-debug.apk`
- Bytes: **17,255,912**.
- SHA-256: **522a943fdbc320cace07396a2344b609975c97471724603539257ed64bd96f58**.
- Package: **app.recipio.local**; code**23** / name**0.10.0-ui-v2-g3-rc2**.
- minSdk24 / targetSdk36. Same signing certificate as acceptedv22:
  `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
-15web assets verified against final dist-native, all equal; ordinary same-key
  upgrade possible, actual upgrade execution NOT_RUN. No uninstall/clear.
- APK kept in ignored artifacts; no keystore/private DB/media committed.

Build used existing JDK21.0.12.1+1 and SDK36 with explicit
`-PapkVersionCode=23 -PapkVersionName=0.10.0-ui-v2-g3-rc2`,1worker/Xmx1024m.
Version23 was unused in known prior artifact/docs inventory. Production graph
excludes this task's generated Fake fixtures and all G1 showcase material.

## Actual browser screenshots

Fresh browser profile, generated non-private test data, Fake external ports,
real production components/Services/PreviewRecipeLibrary. **Not concept art,
not Android, not real Provider or Native source-authentication proof.**

| Warm Ivory state | Screenshot |
| --- | --- |
| AI input |[Input](evidence/g3-remainder/01-ai-input.png) |
| Two source screenshots |[Images](evidence/g3-remainder/02-ai-two-images.png) |
| Review / field location |[Review](evidence/g3-remainder/03-ai-review.png) |
| Inferred/missing acknowledgement |[Gate](evidence/g3-remainder/04-ai-review-confirmation-gate.png) |
| Parser complete |[Complete](evidence/g3-remainder/05-link-parser-complete.png) |
| Parser partial |[Partial](evidence/g3-remainder/06-link-parser-partial.png) |
| Finder3candidates |[Candidates](evidence/g3-remainder/07-finder-three-candidates.png) |
| Selected source extracting |[Extracting](evidence/g3-remainder/08-finder-selected-extracting.png) |
| Uncertain save |[Recovery](evidence/g3-remainder/09-save-uncertain.png) |
| Pending share / dirty draft retained |[Pending](evidence/g3-remainder/10-share-pending.png) |

320px/200% solid captures: [Warm Ivory](evidence/g3-remainder/warm-ivory-320-font200-solid.png),
[Pure Glass](evidence/g3-remainder/pure-glass-320-font200-solid.png),
[Soft Sage](evidence/g3-remainder/soft-sage-320-font200-solid.png).
Whole-page capture is evidence of scroll reachability, not a device screenshot
or a claim that a sticky footer permanently sits at its photographed document position.

## Data / security / Git stop

No SQLite4/Preview7/Backup2, repository/media/reference, Native KeyStore/IME,
Provider/Responses/source matching, SSRF, share lease or restore transaction
implementation changed. No new permission/dependency/Logo. No Key, private
screenshot, raw Provider output or DB snapshot added. Temporary intake screenshots
are excluded from Recipe media and Backup; existing cleanup owners retained.

Normal focused commits and push on feature only. Final delivery commit and remote
equality are reported after committing docs, avoiding a circular SHA reference.
Main/history untouched; no tag/merge/deploy/realAI/video/G4. Stop for independent
review and safe, explicitly resumed Android supplement.
