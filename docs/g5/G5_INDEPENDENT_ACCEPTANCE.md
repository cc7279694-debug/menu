# RECIPIO G5 · Independent acceptance

Decision date: 2026-10-26.
**G5-IMPLEMENTATION ACCEPTED / FROZEN — PASS WITH NOTES.**
Independent reviewer: ChatGPT.

This decision covers only the authorized G5-A–E daily-cooking UX/UI scope
on `feat/recipio-g5-daily-cooking`. It is **not** an acceptance of G4's entire
release, R1 signing/migration, a phone upgrade or a production APK.

## Fixed provenance

- Approved G5 start: `d3846b62b620f5a2a3bce0708473ce6b6bad3c06`
- Final code/tests/workflow: `e5fbe1b75c97295b214dea9ed0f0ad202b2b6b60`
- Documentation and screenshots delivery before this registration:
  `1d0e53a8728d247957c0b2852dbdd5ddc7652605`.
  GitHub comparison verified the only intervening commit changed Markdown,
  text/JSON evidence and PNG screenshots, **not code, tests or workflows**.
- Verified CI run:
  https://github.com/cc7279694-debug/menu/actions/runs/40313302175
  Four actual GitHub Jobs each `success`. Stable `main` remained
  `4a26b88658a309b0b06d24f42a764bdaf72eaaec`; legacy UI branch
  remained `d3846b62b620f5a2a3bce0708473ce6b6bad3c06`.

## Engineering evidence independently inspected

| Gate | Result | Evidence scope |
| --- | --- | --- |
| G5 targeted UI tests | PASS, 5 files/20 cases | Included in full run, not added again |
| Full JS/TS | PASS, 210 files/1184 tests | Windows CI completed test logs |
| TypeScript / ESLint | PASS | Existing 5 lint warnings, 0 errors |
| WebView / import isolation | PASS | 313 modules, 13 shared V2, 0 showcase/fixtures |
| Gradle JVM suite | PASS, reported 189 cases | Committed class-level XML-derived counts and successful actual Gradle task |
| Android sync, lint, debug and test APK compilation | PASS | Compilation, not all test methods running |
| Real-page browser | PASS, 16 groups and 20 layout checks | Chromium, generated Preview v7 data and Fake external ports |
| Android API36 | PASS, actual 21 methods | 11 archive/SQLite, 8 IME/Back and 2 editor/cooking on fresh owned emulator |
| Real AI calls | 0 | Fake only |
| Android physical-phone / OEM / TalkBack / OS font / real-device performance | NOT_RUN | Never relabel browser CSS200% as OS font scaling |
| Permanent-signature upgrade / user-data migration | DEFERRED/NOT_RUN | R1 owner decision unchanged |

The independent source diff includes only UI/readability/layout/presentation,
dedicated tests, test-only Android automation, cloud validation scripts and
documentation. It has no production change to `android/app/build.gradle`,
`AndroidManifest.xml`, `package.json`, schema v4, Preview v7, Backup v2,
secret/HTTP provider protocols, frozen logo or repository contracts.

Actual source checks: local search keeps existing query/filter ownership;
read errors no longer masquerade as empty libraries; hidden long titles remain
accessible in the full button name; recipe Focus/Guided still creates zero
records on ordinary viewing. The only record insertion still requires explicit
completion, native G5 test verifies two clicks yield exactly one record.
`listCookingRecords` is backed by `ORDER BY cooked_at DESC,id DESC` so
`CookingOverview.rows[0]` is a real latest entry.

I opened and visually compared the actual `before/after` Warm home,
detail and cooking screenshots plus Pure/Sage home, G5 editor, review panel,
320px CSS200%, completion and last-record screens. Home card timing/title
hierarchy, rounded cooking photo/step layout and latest-record rendering are
genuine but restrained improvements, not the previously approved UI being
replaced with a new design.

## Notes (non-blocking)

1. Browser QA's native file input shows English system text such as
   `Choose File / No file chosen`. Android uses the actual native picker.
   Keep a localization polish check in a future UX round; do not claim that
   all OS/browser controls are Chinese.
2. In recipe overview, `较早的 N 次记录` counts the **two other displayed
   entries within the existing 3-row preview**, not all historical records.
   With many real records, clearer future text would avoid implying there are
   only N older records; full history remains accessible via
   `查看做菜记录`. This is presentation copy, not a counting/data mutation.
3. Native run used an ephemeral, cloud-runner-signed
   `app.recipio.local` **in a fresh empty cloud VM only**, not the user's
   original package/certificate. No APK was delivered for phone installation.
4. Native Activity recreation is not process cold-start; Browser loaded
   offline is not Android airplane-mode cold start. Unselected historical
   connected tests, real TalkBack, OEM, system font scaling and same-device
   performance retain explicit `NOT_RUN` status.
5. Failures in earlier G5 CI runs were retained in
   `docs/g5/G5_REVIEW.md`; the final 40313302175 run actually passed.
   No speculative assertion about root causes of historical v24 cover
   presentation or about production migration.

## Final decision and freeze

**G5-A through G5-E scoped implementation: ACCEPTED / FROZEN — PASS WITH NOTES.**
Freeze the tested production code at `e5fbe1b75c97295b214dea9ed0f0ad202b2b6b60`.
No new tests or code run were performed during this independent documentation
registration. **Do not merge main, generate a signing key, change R1
DEFERRED_BY_USER, ship a formal APK, uninstall the original app or claim G4
full acceptance.** Further enhancements require a new authorized scope.
