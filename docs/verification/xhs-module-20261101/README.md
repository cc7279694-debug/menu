# Xiaohongshu link intake — comprehensive acceptance handoff

Date: 2026-11-01. **READY FOR INDEPENDENT MODULE REVIEW — NOT ACCEPTED/FROZEN.**

The user authorized registration of BLOCKING-01 and a bounded whole-module
review-preparation pass. No new product development, APK, phone operation or
real Provider request is part of this handoff.

## Immutable source and evidence map

| Item | Fixed source / evidence |
| --- | --- |
| Module base | `6c580bf0d00ff3162a965d53ce7835ca4484b27c` |
| Initial XHS implementation | `87e3fa6cafa22876d0f5140c8166b9e92fb6d7ca`, historical after ownership repair |
| Final product/test source | `eef0bec324a96f5ca97a0e050b30417d39e20448` |
| Independently reviewed repair evidence | `b4676ffa8e82d11636c0e3df115882fcc1c99165` |
| Current preparation | Documentation and existing synthetic captures only; source remains exactly `eef0bec` |

Use the fixed delivery commit supplied in the handoff message, not moving `main`
or a branch tip. The report's relative links resolve within that fixed snapshot.

- [Entire module source diff, base → final source](https://github.com/cc7279694-debug/menu/compare/6c580bf0d00ff3162a965d53ce7835ca4484b27c...eef0bec324a96f5ca97a0e050b30417d39e20448).
- [Original implementation](https://github.com/cc7279694-debug/menu/compare/6c580bf0d00ff3162a965d53ce7835ca4484b27c...87e3fa6cafa22876d0f5140c8166b9e92fb6d7ca).
- [Target-ownership repair](https://github.com/cc7279694-debug/menu/compare/0a78dbc9cd2b5c4747d8856ee822608e1ca2c7f5...eef0bec324a96f5ca97a0e050b30417d39e20448).
- [BLOCKING-01 formal closure and every retained NOTE](../xhs-blocking01-20261101/INDEPENDENT_ACCEPTANCE.md).
- [Final-source commands, failure history and clean reruns](../xhs-blocking01-20261101/test-results.txt).
- [Bounded link-import contract](../../link-import-contract.md).

## What is fixed, diagnosed and unsupported

| User concern | Actual outcome and limit |
| --- | --- |
| Some short links show `dns_blocked` | Legal domains/query parameters were already accepted. Safe errors now distinguish Fake-IP, other unsafe DNS, redirect, HTTP access and HTML restrictions. No unsafe address is allowed. The particular phone's DNS cause is still unconfirmed; connectivity is not claimed repaired. |
| Public page descriptions were lost | A bounded inert reader can extract the addressed note's title/description from supported public state. A target ID is required. This is synthetic/source evidence, not a newly proven real-note success. |
| Wrong note or recommendations accepted | BLOCKING-01 independently CLOSED / PASS WITH NOTES. Unknown ownership yields no body/candidate; generic XHS Recipe JSON-LD is conservatively excluded. |
| Only title/ingredients, no steps | Title-only/partial/unreadable and media limitations are explicit; source-absent amounts/time/steps are not filled deterministically. Incomplete AI previews remain visibly incomplete and reviewed before save. |
| Cannot obtain full recipe | Existing local text supplementation, explicit screenshot/text AI, and manual intake remain alternatives. No automatic AI or persistent import job. |
| Login/captcha or image/video-only instructions | Remain platform/reader limits. No cookie/login/private API, script execution, signature/challenge bypass or media downloading. |

Matched XHS prose stays a **partial source for optional explicit AI/manual work**;
it does not open a complete generic JSON-LD Parser Preview. Ordinary recipe sites
retain their original JSON-LD complete/partial Preview behavior. Do not interpret
the ordinary-site `complete` browser case as an XHS structured-import success.

## Whole-module bounded source inspection

Codex's source self-check found **no additional confirmed blocking defect within
the inspected paths**. This is not ChatGPT acceptance or a guarantee about all
platform pages, Android devices or live services. No new test gap requiring
product/test changes was identified; sufficient same-source checks were not rerun.

| Review area | Source and available evidence | Current disposition |
| --- | --- | --- |
| Legal short/note URL and query preservation | [WebImportRequest](../../../android/app/src/main/java/app/recipio/local/WebImportRequest.java), [WebUrlSafety](../../../android/app/src/main/java/app/recipio/local/WebUrlSafety.java), JVM URL/request cases | Source/controlled checks covered; phone DNS unknown |
| All-address validation, Fake-IP refusal | WebUrlSafety; mixed/null/private/mapped tests | Safeguard retained; no bypass/fallback |
| Redirect pinning, TLS, HTTPS downgrade, bounds | [SafeWebFetcher](../../../android/app/src/main/java/app/recipio/local/SafeWebFetcher.java), controlled JVM fetch tests | Static/controlled evidence; real TLS/Android not run |
| Bridge admission/cancel/error categories | [LocalWebImportPlugin](../../../android/app/src/main/java/app/recipio/local/LocalWebImportPlugin.java), [TS bridge](../../../src/native/link-import/native-bridge.ts), [contract](../../../src/native/link-import/contract.ts), bridge/contract tests | Narrow inputs/results; native runtime remains not run |
| Target ownership and inert parsing | [xhs-page](../../../src/native/link-import/xhs-page.ts), [visible-text](../../../src/native/link-import/visible-text.ts), [parser](../../../src/native/link-import/parser.ts), regressions | B01 closed independently; generic sites preserved |
| Completeness, limitations, fallback UI | [screen](../../../src/native/link-import/screen.tsx), [page-status](../../../src/native/link-import/page-status.ts), screen and browser checks | No step-free complete claim; all alternatives explicit |
| AI authorization and review | [service](../../../src/native/link-import/service.ts), existing AiIntakeService/Preview, intake-review tests | No automatic request or direct unreviewed save |
| Duplicate/UUID/uncertain save/restore/lifecycle | Service, screen and current intake-review/service tests | Existing guards retained; source/controlled evidence only |
| Formal data/media/backup boundary | Existing source/portable backup tests and unchanged storage/AI/media code | SQLite4 / Preview7 / Backup2 unchanged |

## Current-source evidence, reused without repeated execution

| Evidence at final source `eef0bec` | Result and scope |
| --- | --- |
| JS/TS affected regression | 16 files / **284 PASS**, 0 failures/skips/unhandled errors; not full repository tests |
| Native public-network JVM checks | **25 PASS**, freshly compiled pure JVM; not Gradle or device instrumentation |
| Chromium | **14 flows PASS**, 0 external requests / page-console errors / real AI calls |
| TypeScript / lint / local build / isolation | PASS; lint 0 errors / 5 existing warnings; 326 production modules / 15 shared V2 / 0 showcase or fixture assets |
| B01 independent re-review | CLOSED / PASS WITH NOTES; 7 screenshots independently checked for hash/bytes/visual state, command receipts not independently rerun |

The first threads run had worker-start timeouts and is not a PASS. The two
affected files then passed 20/20 under one forks process, followed by all 16 files
passing 284/284 in a fresh final run. The RED run's80 cases (7 expected failures),
GREEN80, first264 and retry20 overlap;
never add them. Five existing lint warnings, Vite config/chunk warnings and two
JSDOM `scrollTo` notices remain visible in the receipts.

The initial `87e3fa6` evidence (275 tests, 24 browser flows) is **historical**.
Its XHS-URL `partial/complete` fixtures predate the ownership repair and cannot
establish the final XHS policy. It is not added to or relabeled as current tests.

### Complete current browser visual index

- [Ownership run JSON](../xhs-blocking01-20261101/browser-ownership.json): 3 cases × 3 themes = 9 flows.
- [Compatibility run JSON](../xhs-blocking01-20261101/browser-compatibility.json): public state, ordinary-site complete recipe, login, challenge and video = 5 flows.
- [Full 14-image index and hashes](visual-index.json).
- Seven previously delivered captures remain in [the original evidence](../xhs-blocking01-20261101/screenshots).
- [Seven additional existing captures](screenshots) now complete that visual index:
  the five compatibility images and Pure Glass/Soft Sage resolved-target images.

All are existing Chromium captures from the fixed `eef0bec` run, generated data,
a390×844 viewport (full-page captures), isolated storage and fake HTTP/Provider
ports. No recapture,
image alteration, real page/media or credential. Equality of safe-state captures
across scenarios is expected, not evidence of separate content retrieval. The
seven newly published images await ChatGPT visual review; previous absence is
preserved as a historical NOTE, not retroactively called independently reviewed.

## Checks newly performed for this preparation

Only bounded source inspection and Git/evidence-integrity checks: final source
identity, exact doc-only delta, pinned browser JSON/counts, image hashes/bytes and
metadata, links, sensitive-pattern checks and ordinary feature-branch push.
The [preparation receipt](preparation-checks.json) records these, separately from
the reused product tests. No JS/JVM/browser/type/lint/build tests were repeated.

## Remaining limits and explicit NOT_RUN

- Xiaomi14 / physical phone/OEM, TalkBack, Android system font and performance,
  real IME/Back, flight-mode process cold start and actual native picture display.
- Android bridge/plugin lifecycle and cancellation; Gradle/connected Android;
  any v28 build, installation, signature/upgrade/data-retention verification.
- Real HTTPS certificate/hostname/SNI handshake: native TLS settings are reviewed
  statically; JVM downgrade cases use an interceptor and most socket tests use
  controlled HTTP. Do not call those real HTTPS or Android results.
- Actual anonymously readable XHS recipe end-to-end, the phone DNS root cause,
  new platform probes, real Provider/model quality and improved recognition rate.
- Full repository regression, full historical browser/Android acceptance.

The supplied anonymous sample ended at login, not a successful recipe import.
Desktop Fake-IP did not establish the user's no-VPN phone failure cause. Access
restrictions and image/video-only steps remain unsupported by this webpage reader.
These are disclosed acceptance limits; ChatGPT must decide the bounded module
verdict. No universal reliability or completed device acceptance is claimed.

## Protected state and stopping point

No product/tests/CI/dependencies/Android resources or version changes in this
preparation. No signing-key access/change, database or personal-media operation,
backup restore, phone operation, v28 APK, merge/main, tag, release or deployment.
Existing untracked `android/.idea/` is preserved and excluded. Existing accepted
G5/G6/G7 and search-focus B1 evidence, G4 PENDING and deferred R1 history remain.

Wait for independent comprehensive module acceptance. Even a scoped PASS here
does not authorize v28 construction/signing or installation; those require the
next explicit user authorization and the existing v27 signing identity.
