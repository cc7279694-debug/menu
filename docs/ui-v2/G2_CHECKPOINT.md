# G2 checkpoint — 2026-10-23

Status: **UI_V2_G2_PENDING_ANDROID_TEST**. Not accepted/frozen as a stable product
release. G1 user approval inherited; G2 independent review still required.

## Goal / delivered scope

Apply the approved G1 Warm Ivory to real local Home/Library/search, Detail,
manual Editor, Focus/Guided, Completion, CookingHistory and ChangeHistory.
Use existing services and state owners, not a new product/router/data model.
Shared125-line layout extraction preserves the three-theme G1 showcase.
G3 original AI/Link/Finder/settings/Backup/Share paths remain reachable and
guarded, without redesign or real Provider calls.

## Verified implementation

Production source commit `ad4df5a49c5f5a4e39f11b537f93f0fc1aa92e43` includes
the earlier71f7f10/fbcf018 source commits. Later delivery commit is docs/evidence
only; use git log for its exact SHA. Raw final source fingerprints are included.
No production source changed after the final full validation.

Fresh final JS/TS198files/1079PASS (native491 and new G2=16 are subsets),
typecheck PASS, ESLint0errors/5 legacy warnings, local build/isolation/sync PASS.
Browser11 groups, G1 themes41×3 PASS. JVM22suites/188tests explicitly rerun PASS.
Android lint0errors/38 warnings; assembleDebug PASS. See G2_VERIFICATION.md and
evidence/g2/test-results.txt for commands, failure history, limits and scopes.

## Internal candidate

`artifacts/recipio-ui-v2-g2-v21-debug.apk`,17,249,848 bytes.
SHA-256 `c2c770e12e1af995c522da3d1e2b898ad1eca2a6fe3535ea3a065fe524d57090`.
Package `app.recipio.local`,code21/name0.10.0-ui-v2-g2-rc1,min24/target36.
Certificate matches accepted v19; all15 embedded public assets match final web
bytes. APK signature/static upgrade prerequisites verified, installation is not.
The earlier v20 was retained, not overwritten; it is not the final candidate.

## Data / safety / inherited constraints

SQLite4 /Preview7 /Backup2, RecipeLibrary, media references, Native IME/KeyStore,
Provider/SSRF/Finder/Share contracts and Logo untouched. No new dependency,
permission, font, production food asset, theme persistence or timer state.
Creation order/search/100-offset pagination, original save/dirty/uncertain gates,
five-second deadline and explicit idempotent completion remain protected.
Restore respects real asynchronous layout until user interaction. Sheets own
their native page Back; no second IME state machine, delay or debounce.

## Unverified / next boundary

Android install/UI/IME/Back/picker/offline/upgrade NOT_RUN. Available dedicated
AVD requires2GB plus host headroom; final free memory about2.7GiB, below4GiB
safety gate. No other project emulator/process/data touched, no SDK installed.
Connected phone untouched. Browser evidence never substitutes for native tests.
38 Android warnings are retained in unchanged code/resources/dependencies;
no unrelated cleanup or claim of a newly rerun old-baseline count comparison.
Screens use non-private controlled records/patterns, not food-photo art direction.

Stop for ChatGPT/user independent review and a safe dedicated Android smoke.
Do not merge main, tag, deploy, start G3/G4 or resume video work. Stable main
must stay649804a8209413f9d682f1079a4fd19ea84cd064. All current changes stay on
the existing feature branch; final push/read-back and clean tree are reported
in the handoff. The local review is not independent ChatGPT acceptance.
