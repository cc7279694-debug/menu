# Xiaohongshu BLOCKING-01 — targeted review follow-up

**Later outcome:** BLOCKING-01 is independently **CLOSED / PASS WITH NOTES**;
see the [formal registration](INDEPENDENT_ACCEPTANCE.md). The full module is
still pending [comprehensive review](../xhs-module-20261101/README.md).
The original handoff status and all evidence below are preserved as history.

Status: **PATCH READY FOR INDEPENDENT REVIEW**, not ACCEPTED / FROZEN.
Date: 2026-11-01. Review only this blocker; no new product module.

## Fixed source and exact scope

- Repository: `cc7279694-debug/menu`.
- Branch: `fix/recipio-xhs-link-reliability`.
- Previously reviewed delivery: `0a78dbc9cd2b5c4747d8856ee822608e1ca2c7f5`.
- New source/tests/browser-fixture commit: `eef0bec324a96f5ca97a0e050b30417d39e20448`.
- [Exact eight-file source/test diff](https://github.com/cc7279694-debug/menu/compare/0a78dbc9cd2b5c4747d8856ee822608e1ca2c7f5...eef0bec324a96f5ca97a0e050b30417d39e20448).
- The subsequent delivery commit adds only this evidence and documentation.
  Read the immutable delivery SHA supplied in the review request. The original
  [review entry](../xhs-link-20261101/README.md) remains historical evidence.

## Root cause and bounded fix

1. `visible-text.ts` previously entered the platform-only path only when a
   title/body/state was found. A recognized XHS page with no state fell back to
   generic `main/body`, admitting recommendations and App-shell prose. Every
   recognized platform page now stays on the restricted extraction path. An
   unresolved target has empty body; a sanitized document title can still be
   displayed. It is page metadata, not proof of a complete target recipe.
2. `service.ts` previously retained generic Recipe JSON-LD regardless of target
   ownership. It could open a complete Parser Preview for note B while the URL
   requested A. Generic Recipe JSON-LD on these platform hosts is now conservatively
   excluded, including when valid A state is accompanied by B metadata. Ordinary
   recipe websites still use the original JSON-LD parser and visible-text path.
3. `xhs-page.ts` no longer treats a singleton note on an unresolved short-link
   page as target identity. A final `/explore/<id>` or `/discovery/item/<id>` URL
   must identify a matching state entry. Normally redirected short links can
   still reach that path; unredirected/unsupported paths safely degrade. Query
   parameters are neither stripped nor reinterpreted.

Valid addressed public state still supplies its title and description. Reading
never calls AI. Title-only results cannot start AI before local text is added.
Matched readable text can enter the existing explicit AI → review → save path.
No generic XHS JSON-LD candidate is claimed to be a supported structured import.
No new parsing model, target-selection UI, network fallback or persistence.

## Fresh verification

See [command receipts](test-results.txt) and the two browser result JSON files.
All source/test files in those runs equal the fixed source commit above.
The initial RED and focused GREEN preceded that commit with identical final
source/test blobs; browser and wider affected checks ran at the committed SHA.

| Check | Actual result |
| --- | --- |
| RED, three files | 7 failures / 73 passes, expected content-ownership failures |
| GREEN, same three files | 80 PASS |
| Affected link-import + intake-review, final clean run | 16 files / 284 PASS; 0 failed/skipped/unhandled errors |
| Public-network Java tests, freshly recompiled | 25 PASS; pure JVM, not Android |
| TypeScript | PASS |
| Lint | PASS; 0 errors, 5 existing image warnings |
| Local production build | PASS; existing large-chunk warning |
| Production isolation | PASS; 326 production modules, 15 shared V2, 0 showcase/fixture assets |
| Browser ownership cases | 9 PASS: 3 cases × 3 themes |
| Browser compatibility cases | 5 PASS, Warm Ivory |
| Browser external requests / errors / real AI | 0 / 0 / 0 |

The first wider run used one threads worker: 264 tests passed but two UI files
did not start (worker handshake timeouts), so that run was **not PASS**. With
the build and browser work finished, those exact two files passed 20/20 using
one forks worker. A fresh final run of all 16 affected files then passed 284/284
using the same single-process settings, without changing code or timeout limits.
The failed receipt and both reruns are preserved. Do not add the overlapping
80/264/20 counts to the final 284. The final run also reports two JSDOM
`Window.scrollTo` not-implemented notices and Vite's existing config-loader
warning; this is not Android scrolling evidence. The build's chunk warning and
the five lint warnings were not suppressed.

New regressions exercise missing state with `main/body` recommendations; note A
versus B JSON-LD; valid A state alongside B JSON-LD; unresolved singleton short
pages; and absent-state ownership warnings. Service checks reject parser save,
keep the store empty, block title-only AI, and ensure explicit AI receives only
matched A text. Login/challenge tests reject unrelated complete JSON-LD. Existing
affected tests cover ordinary parser import, valid target extraction, title and
partial/video prompts, transient supplements, manual review, duplicate titles,
UUID recovery, save failure and restore invalidation.

Browser checks use the actual LibraryApp/LinkImportService with generated data
and fake HTTP/Provider ports. A/B cases expose no Parser Preview or save button;
valid A plus unrelated metadata stays partial. Compatibility covers normal
public state, a complete ordinary-site recipe, login, challenge and video notes.
These are submitter checks, not ChatGPT's independent rerun or real-platform proof.

## Screenshots and provenance

[Screenshots](screenshots) are actual Chromium captures at 390×844, generated
test data only. Fourteen captures were made; the seven selected files listed in
[screenshot hashes](screenshot-sha256.txt) are the delivered visual evidence.
Other seven captures remain local and are not claimed as GitHub visual evidence.
Missing-state and wrong-target intentionally render the same safe title-only
state within each theme, so those image hashes are equal.

- Three themes: `*-missing-state.png` and `*-wrong-target.png`.
- Warm Ivory: `warm-ivory-resolved-unrelated.png`.
- [Ownership browser results](browser-ownership.json).
- [Compatibility browser results](browser-compatibility.json).

## Safety and unchanged boundaries

The exact diff touches only three link-import production files, their three test
files and two isolated browser-test files. Native fetch/address validation,
per-hop pinning, TLS and HTTPS downgrade protections are byte-for-byte unchanged.
All-address checks and Fake-IP refusal are still enforced by the freshly run
JVM tests. No production DoH, cookies, authentication, script execution, private
API, video/image download or real Provider request was added or executed.

Save/recovery/duplicate logic, AI service/keys, storage, SQLite4, Preview7,
Backup2, dependencies, Android resources and original Logo are unchanged.
The v27 signed APK was read-only hashed and still has SHA-256
`b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`.
No signing material was accessed. No APK build, install, phone operation,
personal-data read/write, main merge, tag, release or deployment.

New evidence contains no real sample URL/body, credentials or personal media.
The pre-existing untracked `android/.idea/` directory is preserved and excluded.

## NOT_RUN and platform limits

- Xiaomi14 / other physical devices and OEM behavior; TalkBack; Android IME/Back.
- Native bridge/device execution, Gradle and connected Android tests; APK build.
- Actual platform page re-fetch, real AI quality, phone DNS root cause.
- Full repository JS/TS suite and full historical browser/Android acceptance:
  this is bounded affected regression, not a claim of whole-product acceptance.

The earlier supplied sample's anonymous login restriction remains unresolved;
this patch does not promise to read restricted or image/video-only recipes.
No new real URL probe or paid AI call was performed. Stop for ChatGPT's bounded
BLOCKING-01 re-review; do not mark the entire module ACCEPTED automatically.
