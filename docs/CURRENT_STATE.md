# Current State

## V29-R3-A1 — READY_FOR_INDEPENDENT_REVIEW — 2026-11-05

On `integration/recipio-v29-r3-a1`, R3 limited acceptance was registered in3998147;
version-only integration source747f80a38761882a19522e4c8f61a5f09a90068d keeps the
accepted R3 product sourcebc045ad, inherits V28 and excludes paused N2.
Original package/code29/name0.11.2-personal.1 unsigned Release built and inspected:
15,149,572bytes /95f52141cdcb228353fd98edb7611599132c16ab243100e30216ff6b96b5d995.
454scopedJS/30files,25pureJVM,typecheck,lint0error/5existingwarnings, Web build,
sync/isolation and Gradle release PASS.16Fake owner-helper tests PASS separately.
Owner signing succeeded after the first failed attempt. The original failure
cause remains UNKNOWN. Independent official v2/v3, V28 certificate match, package
version, payload and APK SHA passed. Signed SHA
`b7226af457af39fcf049d082cfe82813a0ad120957d562b9ee5c908e06f3ae4d`.
On the dedicated offline API36 AVD, actual V28→V29 install -r and cold start passed.
Both UI exports retained identical data.json and three synthetic image payloads.
Soft Sage settings screenshot regions matched. Disk and V28 ANR recovery are in
the report. Owned AVD stopped. Xiaomi14, real XHS/AI and Android synthetic parser
instrumentation remain NOT_RUN. N2 paused. [Signed upgrade evidence](v29/V29_R3_A1_SIGNED_UPGRADE.md).

## P0 XHS-R3 — ACCEPTED / FROZEN — PASS WITH NOTES（限定范围） — 2026-11-05

User relayed ChatGPT's scoped independent acceptance for sourcebc045ad/evidence1298517.
[Registration](verification/xhs-real-link-r3/INDEPENDENT_ACCEPTANCE.md) retains
submitter-only409character receipt, diagnosticDoH-only HTTP, offline replay,
Fake-IP refusal, UNKNOWN original XiaomiDNS and all realAI/phone/update NOT_RUN.
This is not whole-platform, phone or release acceptance. The earlier submission
below is retained as history. N2 stays PAUSED_BY_USER.

User reprioritized real anonymous XHS link intake. New isolated worktree/branch
`fix/recipio-xhs-real-link-r3` starts fromf552d14: its initial production is identical
to accepted R2c2c55d21, with N1 history but no unaccepted N2 segmentation code.
Fixed sourcebc045adfc9bb5b6a9698580f9c1cad593d90ab35 adds only the verified public
`noteData.data.noteData` layout with mandatory exact target ID; no recommendation search.
Sample A real anonymous302→200 via diagnostic DoH, default TLS and production pin:
same real response replays from state_unsupported to target_text/409 code points.
Production Service replay yields partial,0automaticAI,1explicitFake,0saves.
**REAL_PUBLIC_LINK_PASS is limited to PC_DIAGNOSTIC_DOH + REAL_RESPONSE_OFFLINE_REPLAY**;
default system DNS still safely refuses Fake-IP. No default-system-DNS/Android/Xiaomi
or post-patch fresh-network E2E claim; original phone DNS cause remains UNKNOWN.
196link-import tests/25pureJVM, typecheck, lint0error/5existingwarnings, local build
and isolation PASS. RealAI/phone/Android/more-real-samples/real-save NOT_RUN.
No sample URL/HTML/body/ID/token in Git; V28 hash and contracts unchanged.
[Review](verification/xhs-real-link-r3/REVIEW.md) / [task](verification/xhs-real-link-r3/TASK.md).
N2 source51a2d92/evidenceab7f6f9 and its own workspace are retained and explicitly
PAUSED_BY_USER; no merge/transplant or emulator retry. Historical N1/R2 evidence
below is inherited history, not a new real-link PASS.

## XHS-R2-N1 — READY_FOR_INDEPENDENT_REVIEW — 2026-11-03

On `verification/recipio-xhs-r2-n1`, fresh5.996GiB admission allowed a new,
owned API36 AVD. Final test sourceb38f82d7:12 unique Android tests and51 scoped
JS/TS tests PASS; actual Picker/codec/temp/review/save and relevant IME Back
verified offline with generated data/Fake HTTP, real AI/XHS/phone calls0.
600×1800 keeps readable test text;1080×7200 actually becomes307×2048 and
14px text is not reliably readable/24px degraded. This is a recorded clarity
limitation, not all-long-image PASS or model accuracy proof. [Report and evidence](verification/xhs-r2-n1-20261103/ANDROID_VERIFICATION.md).
Web/sync and scoped debug builds PASS; original failures,3system-startup ANRs
and [earlier memory blocker](verification/xhs-r2-n1-20261103/CHECKPOINT.md) remain.
Only androidTest/docs changed; production sourcec2c55d21, signedV28,
Native network/codec,SQLite4/Preview7/Backup2/Key/themes are unchanged.
Owned AVD stopped/data preserved; other projects and android/.idea/ untouched.
Xiaomi/OEM/TalkBack/real XHS/AI/full historical connected and other unrun items
remain NOT_RUN. Stop for independent review; no signing/phone/main/new module.

## XHS-R2 — ACCEPTED / FROZEN — PASS WITH NOTES — 2026-11-03

User supplied ChatGPT's limited independent acceptance for sourcec2c55d21,
browsercb4d5e86,evidence28b1a6bf. [Registration](verification/xhs-r2-20261103/INDEPENDENT_ACCEPTANCE.md).
Original notes, failures and NOT_RUN are preserved. The historical submission
below is not new Android,real-platform or Provider proof.

## XHS-R2 — READY_FOR_INDEPENDENT_REVIEW — 2026-11-03

On `fix/recipio-xhs-r2`, product repair `c2c55d21` inherits A3 `54607862` and
A1 `cf806554`. Strict target ownership remains; bounded direct note records
and non-sensitive read diagnostics are added. The link screen opens the existing
screenshot intake in place, preserving the unverified title only as a UI hint;
only chosen text/images go to explicitly triggered AI. Review/save/temp cleanup
remain on existing services. Active settings return refreshes key availability.

Fresh scoped444 JS/TS,25 pure JVM, typecheck, lint(5 existing warnings), isolated
Web build and production isolation PASS. Final browser harness `cb4d5e86`:
27 synthetic flows/12 actual screenshots/0 external requests. No real XHS/AI,
phone/Native Picker/IME/TalkBack or APK/connected verification. Exact live failure
cause remains UNKNOWN. [Review and evidence](verification/xhs-r2-20261103/REVIEW.md).
Existing signed V28 hash unchanged; Native/SQLite4/Preview7/Backup2/Key/Provider
unchanged. No new APK/main merge/release; awaiting independent review. Prior
acceptances, ANRs and NOT_RUN below remain historical evidence, not rerun claims.

## V28-A3 — V28_A3_OWNER_PHONE_UPGRADE_GATE_READY — 2026-11-02

User supplied ChatGPT's scoped A2 independent verdict: **ACCEPTED / FROZEN —
PASS WITH NOTES**, frozen sourcecf806554 and evidence081f98f8. Registration:
[A2 independent acceptance](v28/V28_A2_INDEPENDENT_ACCEPTANCE.md). Historical
reports, ANR logs, failed attempts and NOT_RUN remain unchanged at that commit.

Existing unique v28 APK passed fresh read-only official apksigner/aapt2/zipalign
checks: app.recipio.local,code28/name0.11.1-personal.1,15,194,675bytes,
SHA52dfed4e…3d94b59b, actual single certificate5a3f7cb8…adc251d. Before/after
hash/size/last-write unchanged. [A3 read-only receipt](v28/a3-evidence/read-only-apk-verification.json).
No build, signing/key/password access, APK creation/copy, ADB, device operation,
personal-backup access/upload or real AI call in A3. Frozen product/data contracts
and existing untracked android/.idea/ remain protected.

[Owner-only Xiaomi14 upgrade guide and blank checklist](v28/V28_A3_XIAOMI14_OWNER_GUIDE.md)
are prepared, not executed. Stop for ChatGPT/user authorization before any
phone operation. Xiaomi/OEM/TalkBack/real AI quality and actual phone upgrade
remain NOT_RUN; original phone dns_blocked cause UNKNOWN. A2 is limited emulator
and artifact acceptance, not phone/whole-product release. G4 PENDING and R1
broader signing/personal-migration DEFERRED_BY_USER remain unchanged.

## V28-A2 — ACCEPTED / FROZEN — PASS WITH NOTES — 2026-11-02

User-authorized independent registration is linked above. The following retains
the submitter's actual scope and limits; no A2 test was rerun or promoted in A3.

User accepted/froze A1 sourcecf80655/evidence07f9437 with notes, and authorized
same-existing-key signing plus a new isolated synthetic-data upgrade test.
On `verification/recipio-v28-a2`, frozen unsigned hash/package/version and actual
v27 public certificate reverified PASS. Owner completed private signing with
the existing v27 identity. Actual signed v28 verification PASS: apksigner v2/v3,
same v27 certificate5a3f7cb8…adc251d, app.recipio.local,code28,
0.11.1-personal.1, non-debug/non-testOnly, zipalign and all483 original payloads
unchanged. APK15,194,675bytes, SHA-25652dfed4e…3d94b59b. No product/schema/version
change, key generation, Codex password/key-content access or old launcher use.

Later resource admission5.335GiB passed. On a new dedicated API36 AVD,
actual signed v27 was seeded through normal Backup v2 restore UI, then v28
installed with `install -r`, preserving appId/firstInstallTime. Actual before/
after native exports have byte-identical data.json and all3 images: all7
collections/IDs/UTC times/order preserved. Soft Sage survives cold start and
upgrade. Offline search/IME Back/Focus/history, explicit edit persistence and
the XHS intake entry/cancel passed controlled UI checks; real web/AI calls0.
Post-smoke export confirms only the intentional title/update-time/history
change, cooking count still1 and all3 media unchanged.

Initial system ANRs preceded v27 installation; logs retained, one Wait recovery,
no later ANR/crash events. UI-automation stale/empty-tree and checked-state
limitations are retained, not represented as accessibility PASS. Raw SQLite
file/paths, Xiaomi/OEM/TalkBack/performance/real XHS/AI remain NOT_RUN.
Current unique APK moved with its directory to
`E:/CODEX/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk`;
same bytes/hash/certificate rechecked. Dedicated AVD stopped gracefully with
data preserved. No phone, key or product change; no new signing/password step.
[A2 historical handoff](v28/V28_A2_REVIEW.md). Scoped acceptance registered;
no phone or release approval.

## V28-A1 — READY FOR INDEPENDENT REVIEW, unsigned build only — 2026-11-02

Historical handoff below; user-confirmed A1 acceptance is the frozen A2 input.

On isolated `integration/recipio-v28-a1`, source
`cf806554ac38346644613dd8b3bf700aeb48b14f` inherits fixed main19bb5c9,
B1 registration6c580bf and XHS sourceeef0bec/evidenceae14346 by ancestry;
no repeated merge/cherry-pick or moving-main replacement. Only version defaults
change to code28/name0.11.1-personal.1; original app.recipio.local and all accepted
business/storage/theme/security blobs are preserved. XHS's independent scoped
freeze is [registered](verification/xhs-module-20261101/INDEPENDENT_ACCEPTANCE.md);
its live-platform/device limits remain.

Fresh integrated421 JS/TS (30files),25 pure JVM, typecheck/lint/versioned Web
build/isolation/Capacitor sync and16 copied-asset identity checks PASS. Initial
memory admission3.214GiB blocked Gradle; later6.376GiB allowed unsigned Release
compilation. Final assembleRelease/aapt2/ZIP/asset/unsigned/zipalign checks PASS:
app.recipio.local,code28/name0.11.1-personal.1,15,148,384bytes,SHA e8969bd0…9837e6a.
Initial CLI argument failure and corrected successful build are retained; five
lint and Vite/JSDOM/Gradle warnings remain. This is not installable signed output.
No signing/key access, phone/data operation, upgrade or main merge. v27 artifacts
and untracked android/.idea/ preserved. [A1 full report and next-stage safety](v28/V28_A1_REVIEW.md).
Await independent review; Android runtime/IME/TalkBack/real AI/signing and same-key
upgrade/data retention remain NOT_RUN, not inferred from compilation/static checks.

## Xiaohongshu module — READY FOR INDEPENDENT COMPREHENSIVE REVIEW — 2026-11-01

Historical handoff below; later scoped acceptance is registered for V28-A1 above.

The user supplied ChatGPT's independent re-review verdict and authorized its
registration: **BLOCKING-01 — CLOSED / PASS WITH NOTES**, source
`eef0bec324a96f5ca97a0e050b30417d39e20448`, evidence
`b4676ffa8e82d11636c0e3df115882fcc1c99165`. This closes only the ownership
blocker, not the whole module. [Formal registration and retained notes](verification/xhs-blocking01-20261101/INDEPENDENT_ACCEPTANCE.md).

Bounded whole-module source inspection found no additional confirmed blocker;
product source remains exactly `eef0bec`. Existing 284 affected JS/TS,25 pure
JVM,14 browser flows and typecheck/lint/build/isolation evidence is reused without
retesting. The remaining existing captures are published for full visual review.
All notes, initial failures/reruns and device/native/TLS/live-platform/real-AI
NOT_RUN remain. Phone DNS is unconfirmed and login/media-only limits unresolved.
[Complete module handoff](verification/xhs-module-20261101/README.md).
No APK, signing change, phone/data operation or main merge. Await ChatGPT review.

## Xiaohongshu BLOCKING-01 — historical repair handoff

ChatGPT blocked delivery `0a78dbc9` for unowned page-shell text and Recipe
JSON-LD. Source patch `eef0bec324a96f5ca97a0e050b30417d39e20448` closes those
paths: recognized XHS pages never fall back to generic body text; unowned generic
JSON-LD is not accepted; unresolved short pages cannot infer identity from one
note. Valid matched note prose and ordinary recipe-site parsing remain. This is
a targeted repair; its later limited closure is registered above. Final source checks: 284 affected JS/TS,
25 pure JVM and14 synthetic browser flows PASS; typecheck/lint/build/isolation
PASS. Initial worker-start timeouts and successful reruns remain recorded.
Device/IME/TalkBack/real AI remain NOT_RUN, real AI calls0; no APK or main merge.
[Fresh evidence and limits](verification/xhs-blocking01-20261101/README.md).

The original implementation and evidence below remain historical context.

On `fix/recipio-xhs-link-reliability`, tested source
`87e3fa6cafa22876d0f5140c8166b9e92fb6d7ca` adds bounded public note-text
extraction, safe DNS/access diagnostics, title-only/partial-result explanations,
local text supplementation and an incomplete-AI-result warning. Explicit AI,
review and existing save/recovery contracts remain. Fresh checks:275 scoped
JS/TS tests,25 pure JVM tests, typecheck/lint/build/isolation and24 synthetic
three-theme browser flows PASS. These are not Android or real-AI results.

The supplied real sample ended at a platform login page during an independent
safe diagnostic; desktop system DNS separately returned Fake-IP addresses. The
user's phone DNS cause is unconfirmed. No DNS exceptions or production DoH were
added. Image/video steps and restricted pages remain unsupported by webpage
reading; Xiaomi/IME/TalkBack and native device execution remain NOT_RUN.
SQLite4 / Preview7 / Backup2, the signed v27 APK and signing identity are
unchanged. No main merge, new APK or phone operation. See
[bounded review evidence](verification/2026-11-01-xhs-link-reliability.md).

## Search focus B1 — ACCEPTED / FROZEN — PASS WITH NOTES — 2026-10-28

ChatGPT's independent review accepted the B1 follow-up on
`fix/recipio-search-focus`, tested source
`d29ff1a34d3fc4a06affffac7ccc048e9c956ce4`. It checked the two review ZIPs,
six source/evidence files and hashes, nine theme screenshots, the GitHub commit
and focus handling. The keyboard ring, subtle touch border and three-theme
visual evidence passed. The 37 targeted tests, TypeScript, lint and build were
accepted as the submitter's report, not independently rerun. Normalized Git
blob hashes matched despite line-ending differences in the packet.

Xiaomi 14, TalkBack, Android IME dismissal and the `:has()`-unsupported browser
fallback remain NOT_RUN. Five existing lint warnings remain. This acceptance is
limited to B1; it does not imply a new APK or release. The accepted signed v27
APK and personal signing identity remain unchanged. The
[B1 review evidence](ui-v2/SEARCH_FOCUS_B1_REVIEW.md) and
[original review record](ui-v2/SEARCH_FOCUS_REVIEW.md) are historical records.

## Personal official signing — ready for independent review — 2026-10-28

The user superseded the old-keystore and Android Studio wizard route: a new
personal signing identity will use `app.recipio.local`; the user accepts a
fresh installation and will manually uninstall the incompatible old app only
after independent acceptance. No old personal data will be migrated.

On `chore/recipio-official-signing`, the unsigned v27 Release was built and
inspected. The user-operated launcher and local script use official Android
signing tools and create an encrypted 7-Zip backup outside the repository. The
script has been exercised with disposable test material; the user privately
completed signing. The resulting APK signature, package, version, alignment and
hash passed independent static verification. The signing receipt reports an
encrypted-backup round trip; the backup remains on the same drive. A fresh
isolated Android 16/API 36 AVD passed installation, cold start and home-screen
checks; this is not a physical-device or independent acceptance claim. No phone
or personal data was touched. See
[personal signing checkpoint](r1/PERSONAL_OFFICIAL_SIGNING.md); the earlier
[Studio checkpoint](r1/OFFICIAL_SIGNING_PREPARATION.md) records the superseded route.

## G7 independent acceptance — ACCEPTED / FROZEN — PASS WITH NOTES — 2026-10-27

**RECIPIO_G7_ACCEPTED / FROZEN — PASS WITH NOTES.** ChatGPT completed the
scoped G7 A–E independent acceptance; the user supplied the formal conclusion
under RECIPIO_G7_ACCEPTANCE_REGISTRATION. Accepted delivery:
`6f1df12806318d19ebe06d07068717d58a44d70b`. This registration changes only
three documents and does not rerun product tests or alter tested source.
[Formal independent acceptance](g7/G7_INDEPENDENT_ACCEPTANCE.md).

User-authorized G7 A–E is on isolated `feat/recipio-g7-reliable-intake`, based on
G6 independent-acceptance registration `69e221567038e1e32668f882b31e57a589c483de`.
Current draft checks, source reference Sheet, original evidence/current edit
separation and transient row identity are implemented in existing renderers.
Manual-new uses only local fill checks. Existing duplicate, confirmation and
uncertain/save identities remain authoritative; no new persisted review entity.

Tested production/tests/workflow: `e8c2f948544d8650919456bd2421b7a04ea218b4`.
Accepted [cloud run40460260275](https://github.com/cc7279694-debug/menu/actions/runs/40460260275)
passed all4jobs:221files/1503JS/TS,189JVM and25 fresh API36 native tests,
0failures/0skips. Targeted225/122 are included in1503, never added. Typecheck,
lint(0errors/5existing warnings), local build/isolation, sync, Android lint and
both fixture APK builds PASS. G7 browser29groups/39geometry/16screenshots and
current-source G6 browser33groups PASS,0external origins/page/console errors.
Selected9actual synthetic PNGs are archived in `g7/screenshots/`.

Real Chromium/WebView exposed a Sheet/Editor Back ownership bug after capture-only
tests passed. Minimal UI deferral/layout registration fixed it; native IME routing
and all save/storage services are unchanged. Test-first RED and resolved earlier
failures remain documented. [Historical review/checkpoint](g7/G7_REVIEW.md) records
scope, exact evidence, screenshot provenance and all NOT_RUN. Final delivery after
the tested SHA changes documentation/screenshots only. Its READY_FOR_REVIEW state
is the historical handoff, preserved unchanged; the formal conclusion above
supersedes it without overwriting failure/repair evidence.

Physical phone/OEM/TalkBack/system font scale/performance/flight-mode process cold
boot/native image pixel presentation and deferred signing/personal migration are
NOT_RUN. Native generated-image DOM decoding is not image-pixel acceptance;
controlled selection is not a real SAF claim. Browser external Provider/HTTP and
temporary-image adapter are Fake. Real paid AI calls remain0.
Unexecuted historical connected tests remain NOT_RUN; the25 selected API36 cases
are not full historical connected coverage. CSS200% is not Android system font
acceptance. Five existing lint warnings and narrow/large-text observation NOTES
remain. No claim of improved model recognition accuracy or overall release.

No real AI, local heavy tools, personal-device/data operation, user APK, signing,
main merge or G8. G5/G6 scoped freeze below remains valid. G4 PENDING and R1
DEFERRED_BY_USER remain unchanged.
Next: wait for ChatGPT's separately authorized next-stage plan; no automatic G8,
R1 resumption, main merge or release.

## G6 independent acceptance — ACCEPTED / FROZEN — PASS WITH NOTES — 2026-10-27

**RECIPIO_G6_ACCEPTED / FROZEN — PASS WITH NOTES.** ChatGPT's independent
G6-A–E acceptance was supplied and confirmed by the user for registration.
Accepted delivery: `e295dd20973ec9c20ad21738214b6d5a5981280a`; only docs/evidence
follow tested source below. This registration changes documentation only and
does not rerun product tests. [Formal independent acceptance](g6/G6_INDEPENDENT_ACCEPTANCE.md).

Authorized G6 A–E implemented on isolated branch
`feat/recipio-g6-serving-adjustment` from G5 accepted/frozen `cb40a9fb`.
Tested source `d8f2e3afcaffce886d4a08caec7ce99a97a4531d`, cloud
[40440306979](https://github.com/cc7279694-debug/menu/actions/runs/40440306979):
all four jobs PASS.217 targeted (included in full),212 files/1381 JS/TS,
189 JVM and23 real fresh API36 native tests PASS,0 skips. Typecheck,
lint(0 errors/5 existing warnings), build/isolation, sync and both Android
fixture builds PASS. Browser33 groups/39 geometry/9 computed materials,
12 actual screenshots,0 external/page/console errors.7 selected PNGs archived.

One transient target is shared by detail and existing Focus/Guided reference
Sheet. Whole-field safe amounts scale conservatively; unknown/unsafe values
remain original. Invalid drafts retain last valid display. Kitchen/history/
edit-cancel preserve the target; leaving/reopening/switching/successful save/
restart reset it. No adjustment persistence/network/automatic cooking record.
Only explicit completion records once. Earlier-history preview wording fixed.
SQLite4/Preview7/Backup2, Repository/media/Provider/Logo/dependencies unchanged.

Physical phone/OEM/TalkBack/Android system font scaling/performance/native
image-pixel presentation/process flight-mode cold boot and deferred signing/
personal migration remain NOT_RUN. User v23/v25 and personal data untouched;
internal ephemeral CI APKs are not user update candidates. G5 scoped acceptance
below remains valid, G4 remains PENDING, R1 remains DEFERRED_BY_USER.

NOTES remain: only explicit supported quantity/unit fields scale; complex or
unsafe amounts retain original text. Extremely narrow/large-text layouts and
vertical Sheet scrolling remain an observation item, not OS-font acceptance.
Five existing lint warnings remain. The scoped G6 freeze does not freeze G4.

Next: wait for separately authorized work; no automatic G7, main merge,
release or R1 resumption. [Historical G6 review/checkpoint](g6/G6_REVIEW.md),
[approved task](g6/G6_TASK.md) and [execution ledger](g6/G6_EXECUTION.md).
Neither delivery nor acceptance registration changes the tested source.

## G5 independent acceptance — 2026-10-26

**G5 IMPLEMENTATION ACCEPTED / FROZEN — PASS WITH NOTES**, scoped to daily
cooking UX A–E at tested source
`e5fbe1b75c97295b214dea9ed0f0ad202b2b6b60`, CI
[40313302175](https://github.com/cc7279694-debug/menu/actions/runs/40313302175):
1184 JS/TS, 189 JVM and 21 fresh cloud API36 native PASS. 16 browser groups,
20 layout checks and visual screenshots were independently examined. The
delivery commit only changed documentation and screenshots, not tested
production logic. Two minor UX notes retained: browser file picker uses
English system strings, and older-cooking preview counts only displayed
entries; the full record list is preserved.

**This is not G4 release/freeze**: physical phone/OEM, actual TalkBack,
Android system font scaling, real-device performance and other device tests
remain NOT_RUN. R1 durable signing/personal backup migration stays
**DEFERRED_BY_USER**. Old `app.recipio.local` v23 and independent cloudpreview
v25 are untouched. No product merge to stable main and no formal release.
[Full scoped independent acceptance](g5/G5_INDEPENDENT_ACCEPTANCE.md).

## G5 daily cooking experience — READY_FOR_REVIEW — 2026-10-26

Authorized continuous G5-A through G5-E from verified baseline
`d3846b62b620f5a2a3bce0708473ce6b6bad3c06`, isolated branch
`feat/recipio-g5-daily-cooking`. R1 signing and personal migration remain
DEFERRED_BY_USER; no new owner custody/signing task or phone installation.

Presentation refinements implemented for library recovery/cards, add/intake
guidance/review, detail/reference Sheet, actual last cooking record and optional
extras. SQLite4 / Preview7 / Backup2 / Repository / Provider / Logo unchanged.
Final source/tests: e5fbe1b75c97295b214dea9ed0f0ad202b2b6b60, cloud run40313302175:
all4 jobs PASS.210 JS/TS files /1184 tests,189 JVM,21 actual API36 native
cases PASS (0 skipped). Typecheck/lint(0 errors,5 existing warnings), web build,
isolation, sync and both Android APK builds PASS. Browser16 grouped checks,
20 geometry checks and25 actual screenshots PASS,0 unexpected external origins,
page or console errors. Native includes all8 real IME/Back cases,11 storage/
backup cases and2 real G5 draft/cooking/Activity-restart cases. The image test
was repaired to select the actual DocumentsUI filename row, not its thumbnail
preview; production image/security logic was not changed. Failed evidence is
preserved and explained, not relabeled as a product failure or ignored.

20 selected generated-data screenshots and concise receipts are in
docs/g5/evidence. No formal/user APK is delivered. Physical phone/OEM,TalkBack,
Android OS font scaling, device performance, process cold boot in flight mode,
unselected historical connected classes and deferred signing/migration remain
NOT_RUN. Local heavy checks were avoided/stopped for low RAM; none inferred PASS.

G5's subsequent scoped independent acceptance is recorded above. Its former
review-ready state here is historical; it does not authorize G4 freeze,
R1 resumption, safety relaxation, personal-data operation, main merge or release.
See [G5 review/checkpoint](g5/G5_REVIEW.md) and [execution contract](g5/G5_EXECUTION.md). Older sections below retain
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
