# Current State

## G5 daily cooking experience — IN_PROGRESS — 2026-10-26

Authorized continuous G5-A through G5-E from verified baseline
`d3846b62b620f5a2a3bce0708473ce6b6bad3c06`, isolated branch
`feat/recipio-g5-daily-cooking`. R1 signing and personal migration remain
DEFERRED_BY_USER; no new owner custody/signing task or phone installation.

Presentation refinements implemented for library recovery/cards, add/intake
guidance/review, detail/reference Sheet, actual last cooking record and optional
extras. SQLite4 / Preview7 / Backup2 / Repository / Provider / Logo unchanged.
Cloud run40306242741 at sourcef4d1e62:210 JS/TS files /1184 PASS,
189 JVM PASS (0 skipped), TS/lint/build/isolation PASS. Browser16 grouped checks,
20 geometry checks and25 actual screenshots PASS, with0 external origins/page
errors/console errors. Native20/21: the sole failure is still before Back.
Bounded diagnostics prove the generated image request remains pending in Google
Photos (0 Provider posts), before Native image results or JS validation. The7
other IME/Back and2 new manual-IME/cooking/Activity-restart cases PASS.
This is not complete G5 validation or acceptance. Preserve all failed evidence.

Next: test-only positive system-picker confirmation within the original deadline,
plus two screenshot framing corrections, then fresh source cloud verification.
No safety-rule relaxation, unknown-data operation, main merge or release.
See [G5 execution contract](g5/G5_EXECUTION.md). Older sections below retain
their historical/module-specific meanings.

## R1 formal signing and personal-data migration deferred — 2026-10-26

**RECIPIO_R1_SIGNING_MIGRATION_DEFERRED_BY_USER.** The owner explicitly chose
not to proceed with two offline physical signing-key backups and the permanent
release/migration process at this time. This is a **voluntary pause**, not a
new security failure or a completed R1 acceptance. Do not purchase/request
storage, generate/reuse private signing keys, upload Secrets, dispatch signed
builds, import personal backups, uninstall either existing app or merge G4
product code unless the owner later explicitly resumes and authorizes.

Previously reviewed **no-key R1 engineering scope remains accepted with notes**:
source `d830733ab1a0dc4d88ea6c06bc325524fcc88a1b`, cloud run 40288815966,
206 JS/TS files / 1168 PASS and isolated API36 native fixtures 11 PASS.
Real permanent signing, signer identity, two actual offline backups, same-signer
upgrade, full real SAF UI, official APK and original-personal-data migration
remain **NOT_RUN**. G4 overall remains PENDING. The accepted original
`app.recipio.local` v23 and separate v25 cloudpreview are untouched;
cloud-preview runner signatures are not durable for future in-place upgrades.

Other RECIPIO product/UI work may proceed only as separately requested,
with cloud development, synthetic data and protected legacy identity; avoid
making permanent-update or production-migration claims.
The historical R1 owner-action blocker below explains the technical reasons,
but the current task status is **DEFERRED_BY_USER**.

## R1 independent no-key acceptance — 2026-10-26

**R1_NO_KEY_SCOPE_ACCEPTED — PASS WITH NOTES**, based on direct ChatGPT review
of GitHub run [40288815966](https://github.com/cc7279694-debug/menu/actions/runs/40288815966)
and R1 reports. Source at successful run
`d830733ab1a0dc4d88ea6c06bc325524fcc88a1b`; prior feature HEAD
`95cc8c5076eac7d62b5c12cf7c3ba7f37602bb9f` only changes docs afterward (verified one-commit diff).
206 JS/TS files/1168 tests PASS; TS/Lint/WebView/isolation PASS; Android
JVM/lint/debug/test APK/unsigned separate .next build PASS; owned cloud API36
native instrumentation **11/11 PASS**, not a physical phone/Saf UI test.
The source run had three successful CI jobs and used generated data only.

**Overall R1 remains RECIPIO_R1_BLOCKED_OWNER_ACTION**, not accepted/frozen.
User-managed private key/certificate, two separately verified offline backups,
five signing Environment Secrets, real same-signer upgrade, final signed APK,
real SAF UI and personal data migration all **NOT_RUN**.
The signing Environment's configured limits and Secrets=0 are Codex-reported
administration readback, not independently re-queried by ChatGPT's connector.
Original v23, accepted cloud-preview v25 and all personal data untouched.
Main remains `4a26b88658a309b0b06d24f42a764bdaf72eaaec`.
No new source change, no cloud build re-run, no main merge, no key generation.

[Independent scoped review](r1/R1_INDEPENDENT_REVIEW.md).

## R1 milestone — 2026-10-26

R1 is authorized as one continuous milestone. S01-R accepted by ChatGPT and
PR2 merged to main `4a26b88658a309b0b06d24f42a764bdaf72eaaec`.
Main/feature signing workflow blobs match; protected `recipio-signing` has
zero Secrets. No G4 product merge or overall freeze.

Owner has no two offline backup media and explicitly requested completion of
the no-key work first. Signing/certificate custody/provisioning remains
**BLOCKED_OWNER_ACTION_NO_OFFLINE_MEDIA**. Do not generate replacement keys,
capture private input, sign a formal candidate or touch personal phone data.

No-key verification PASS on source `d830733ab1a0dc4d88ea6c06bc325524fcc88a1b`,
cloud run [40288815966](https://github.com/cc7279694-debug/menu/actions/runs/40288815966):
206 files /1168 JS/TS tests; typecheck/lint/build/isolation; Gradle JVM/lint,
debug/androidTest APKs and separate unsigned `.next` release; fresh API36 cloud
emulator **11 native fixture tests PASS** (actual evidence read back).
JVM task completion is verified; no unsupported per-case JVM total is claimed.
The first cloud run exposed a test-only Android JSONObject compatibility error;
it was fixed without changing production code, then the complete run passed.

Permanent signing, two real offline backups, Secrets provisioning, same-signer
`.next` upgrade, SAF restore UI and personal-phone migration are NOT_RUN.
No signed candidate delivered, main/product/schema/Backup unchanged, no real AI.
See [R1 execution](r1/R1_EXECUTION.md), [verification](r1/R1_VERIFICATION.md),
[native receipt](r1/R1_NATIVE_EVIDENCE.txt) and [owner signing plan](r1/R1_OWNER_SIGNING_PLAN.md).
Overall: **RECIPIO_R1_BLOCKED_OWNER_ACTION**, not G4 frozen/accepted.
The older sections below are historical stage receipts, not current facts.

## Signing workflow registered — 2026-10-26

**PR #1 merged as explicitly authorized**, squash commit
`4e244cd05059d9d700dd46051a2fa55e50722029` on stable `main`.
The only modified path is newly added
`.github/workflows/recipio-signed-next.yml`; no G4 product/backup/Native
code has been integrated into `main`. Signer workflow is manual-only;
a signed APK has **NOT** been generated, and the `recipio-signing`
Environment/private owner-managed signing secrets are **not yet configured
or verified**. No automatic signer run, data migration, or G4 acceptance.
Next gate: owner-generated, securely backed-up private signing key and protected
GitHub Environment configuration; never share secrets in chat.
[Full status](ui-v2/G4_SIGNING_MIGRATION_PLAN.md).

## Signing/migration preparation — 2026-10-26

**PREPARATION_ACCEPTED_FOR_CONTINUATION — PASS WITH NOTES**, not G4 accepted.
Cloud CI run `40259291222` at implementation/test commit
`0092bed5ad09e667fc802e0c63a6bfe78be49bbd` ended SUCCESS on both
hosted Windows and Android jobs. New cross-install portable Backup v2 service
tests are 2 cases in the **205 files / 1163 JS/TS tests PASS**; Typecheck,
lint 0 errors / 5 historical image warnings, Vite build, production isolation
PASS (305 modules / 0 showcase / 0 fixtures). Android JVM/lint/build PASS.
Unsigned opt-in Release code26/name0.10.0-ui-v2-g4-rc3-next compiled with
`app.recipio.local.next` and package assertion PASS; intentionally not
uploaded, **not installable as a release**. This is no true Android migration.

A secret-gated signing workflow is prepared on the feature branch but has
**NOT_RUN** and cannot be manually dispatched via workflow_dispatch until it
exists on GitHub default branch (which remains unchanged). No signer private
key, cert fingerprint or GitHub secrets have been provisioned. The new app ID
is a proposal awaiting explicit permanent-identity and key-custody approval.
See `ui-v2/G4_SIGNING_MIGRATION_PLAN.md`. The original v23, accepted cloud
preview v25, user data and G3/G4 historical test statuses remain unchanged.
No main merge/tag/deploy and no overall G4 freeze.

## Cloud-preview phone feedback — 2026-10-26

**CLOUD_PREVIEW_PHONE_SMOKE_ACCEPTED — PASS WITH NOTES** (limited to independent
`app.recipio.local.cloudpreview` v25). User reports all three requested phone
checks PASS: immediate-reopen appearance retention; generated recipe cover on
list/detail; cooking steps, buttons and return. GitHub Actions 40198321167
has both jobs SUCCESS (204 files /1161 JS/TS tests, Android JVM/lint/build).
The old v24 cover presentation symptom did not recur in user experience; its
root cause is NOT independently established.

**G4 overall remains PENDING**, not ACCEPTED/FROZEN: the independent runner
debug certificate and package cannot replace original `app.recipio.local`
v23. Original-data preserving upgrade/migration, connected Android, true IME,
TalkBack and performance are still NOT_RUN for this delivered preview.
Do not uninstall existing app, merge main or claim official release.

[Exact phone feedback attribution and open gates](ui-v2/G4_CLOUD_PREVIEW_PHONE_ACCEPTANCE.md).

## Cloud verification update — 2026-10-25

The Windows PC resource-blocked G4 checkpoint below is historical. GitHub Actions
cloud build at source/workflow commit `00a765600020bb6fe90f667ffa7b3e3413341bd4`
has now **succeeded** (run 40198321167). It ran 204 test files / **1161 JS/TS
tests PASS**, typecheck PASS, lint 0 errors / 5 inherited warnings, local Vite
build and production isolation PASS; Ubuntu runner `:app:testDebugUnitTest`,
`:app:lintDebug`, `:app:assembleDebug`, and `:app:assembleDebugAndroidTest`
PASS. The compiled AndroidTest APK was **not** executed.

Cloud-preview APK: `app.recipio.local.cloudpreview`, code25 /
`0.10.0-ui-v2-g4-rc2-cloudpreview`, 17,256,628 bytes,
SHA-256 `6af4910aa7932a5b3a172695849b691f03ca2475b5c6719758a3be72fa3aaba4`.
This GitHub runner-debug-signed, separately installed preview is **not** a
replacement for the accepted on-phone `app.recipio.local` v23; it contains no
old personal data. No native emulator run, preserving upgrade, original-package
signature match, actual immediate-restart theme persistence, cover display,
IME/Back, TalkBack, realistic performance, real AI call, or user phone test
has passed. G4 remains **PENDING_DEVICE_TEST**, not accepted/frozen.

[Cloud receipt](ui-v2/G4_CLOUD_PREVIEW_VERIFICATION.md).
No main merge, tag or deployment.

## Current stage

2026-10-25 — G3 remains **ACCEPTED / FROZEN — PASS WITH NOTES**.
G4 is **UI_V2_G4_PENDING_DEVICE_TEST**, including unfinished final host
regression/build. This does not mean that only a phone check remains.

Branch: feat/recipio-ui-v2-glass-minimal. Worktree:
E:/CODEX/VIBE CODING/recipe-step-app-ui-v2. Resume entry:
aee5177fa1a03239e56532fe8de4c75b3943ec7f.
Stable main649804a8209413f9d682f1079a4fd19ea84cd064 / v0.9.1-logo-refresh unchanged.
No merge, tag, deploy or new product/video module.

G3 registration0541107 retains the user's/ChatGPT's v23 phone acceptance,
not Codex phone execution. Delivery2080f86/sourcee182a72 and earlier G2/G3-0
freezes/history remain intact. See the existing acceptance records.

## Current source patch

- Three image-placeholder CSS mappings now use existing secondary, fixing actual
  normal-copy contrast4.3739:1. No new palette/layout/Logo.
- Actual Android v24 immediate force-stop lost Pure/Sage. Separate disk
  observation confirmed delayed LevelDB writing (~914ms).
- Source now uses existing Filesystem/Data for one validated theme enum;
  Native write ACK confirms theme. Initial read and serial writes are ordered;
  latest intent owns UI; latest failure returns to last successful ACK.
  Missing can inherit legal legacy cache; malformed existing value→Warm.
  Web keeps localStorage; errors visible; no LibraryApp remount.
- Android ShareTarget test-only obsolete Home readiness selector corrected;
  downstream behavior assertions retained, runtime not yet executed.
- SQLite4/Preview7/Backup2, Key/Provider/SSRF/media/restore contracts,
  permissions and dependencies unchanged. Enum file outside Backup/media.

## Evidence and limits

Current frozen source: **2 focused files /44 tests PASS**,27.30s, with readonly
review of ACK-race repair. Full v25 JS/TS was **ABORTED_RESOURCE** at0.457GiB
free (12:35+08), without a final count; no Vitest remained after own run stopped.
Final post-patch typecheck/lint/build/graph/sync/JVM/Android lint/APKs and
Native105/IME8 are **NOT_RUN**. No v25 APK exists yet.

Earlier v24 passed203files/1133,188JVM and74browser groups; these predate the theme
patch and are not finalv25 results. Detailed evidence and failures:
[G4 resume verification](ui-v2/G4_RESUME_VERIFICATION.md).

Actual owned API36 v21→v24 preserving install passed: all28original recipes,
3images and8table rows/ID/time/order/history preserved. Subsequent controlled
native core smoke preserved every original; added only1generated recipe/image/
record. Navigation/SAF/search/filter/editor discard/Focus/Guided0→1 passed until
the real theme failure. These are v24 simulator facts, not v25/phone evidence.

Open observation: native cover screenshot shows fallback despite a successful
DOM decode check. Actual image presentation is NOT_CONFIRMED; distinguish late
presentation/loading failure in the next safe run, not by assuming screenshot PASS.

## Candidate and next position

Intended code25/name0.10.0-ui-v2-g4-rc2, only after fresh final checks.
Immutable v24 is diagnostic history; v23 retained. Actual TalkBack and valid P01
comparison remain NOT_RUN. TalkBack installed/not enabled; signed pre-V2 v19 is
available, but TTID/CDP-ready/rAF proxies do not prove all P01 requirements.

Resume [G4 checkpoint](ui-v2/G4_CHECKPOINT.md), not product development/replanning.
Keep host checks serial, emulator gate>=4GiB plus live ownership. Old5580 belongs
to VPN; owned5582 emulator now stopped. Restore original Warm preference after
next safe validation (RCA left legal Pure cache); protect original rows/media.

No other project/phone/process operations, SDK/new AVD, background queue,
paid AI, main/tag/deploy or next module. Dev/preview5184/5186 stopped; unrelated
showcase5182 untouched. Await safe resources/user continuation.
