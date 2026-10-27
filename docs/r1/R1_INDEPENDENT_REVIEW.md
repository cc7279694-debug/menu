# RECIPIO R1 — independent no-key scope acceptance

Date: 2026-10-26.

**Verdict: R1_NO_KEY_SCOPE_ACCEPTED — PASS WITH NOTES.**

This is **not** overall R1 acceptance. No key creation, Secrets upload,
signed release or physical-phone migration was independently witnessed.

## Verified evidence

- Current branch (before writing this review):
  `95cc8c5076eac7d62b5c12cf7c3ba7f37602bb9f`.
- Actual tested source: `d830733ab1a0dc4d88ea6c06bc325524fcc88a1b`.
- Verified the final commit differs only in documents:
  `docs/CURRENT_STATE.md`, `docs/r1/R1_NATIVE_EVIDENCE.txt`,
  `docs/r1/R1_VERIFICATION.md`.
- GitHub Actions run [40288815966](https://github.com/cc7279694-debug/menu/actions/runs/40288815966)
  is **SUCCESS** with three genuine successful jobs.
- Independently read Windows logs: 206 test files / **1168/1168 JS/TS PASS**,
  typecheck PASS, lint PASS with existing warning count, Vite/WebView build
  PASS; production graph report = 305 modules, 9 shared V2, zero showcase
  modules and zero fixture assets.
- Independently read Ubuntu Gradle logs: `:app:testDebugUnitTest`,
  `:app:lintDebug`, `:app:assembleDebug`,
  `:app:assembleDebugAndroidTest`, opt-in separate `:app:assembleRelease`
  all successful. No fabricated JVM assertion count.
- Independently read cloud emulator job/log: isolated API36
  `Recipio_R1_Fixture`, `emulator-5554`; actual
  `OK (11 tests)` for two targeted classes; fixed generated fixture APK
  package identity and artifact hash checked. This is **not** full connected
  regression or actual user data.
- Existing Backup v2 and frozen-v1 ZIP tests, generated Android archive/SQLite
  cases, cloud scripting checks are within the passing suite.
- GitHub `main` remained `4a26b88658a309b0b06d24f42a764bdaf72eaaec`
  at inspection.

## Notes and remaining blockers

1. `recipio-signing` Environment's exact branch/approval/admin settings and
   zero Secrets are based on Codex administrative readback; no accessible
   independent GitHub Admin/Secrets endpoint was available in this review.
2. R1 owner key/certificate identity and **two independent decrypted/verified
   offline copies** do not exist yet. The synthetic 7-Zip preflight is not
   offline private-key backup proof. Do not weaken these to two folders on a
   single computer drive. The source explicitly reports no two external media.
3. Permanent signed `app.recipio.local.next` candidate: **NOT_BUILT**;
   Environment Secrets: **NOT_PROVISIONED**; signature upgrade v26→27:
   **NOT_RUN**; real Android SAF import UI and original phone migration:
   **NOT_RUN**. No genuine cert/APK final SHA exists.
4. The 11 emulator cases cover targeted native archive/SQLite, not full
   Android user flows, IME, TalkBack, same-certificate upgrade, real SAF
   browsing or performance comparison.
5. GitHub signing Job must remain manually approved, on isolated runner, with
   secret values only at final signing step; no key, plaintext secrets or
   personal backups to chat, git or CI logs. Do not claim G4 acceptance.

## Next gate (one batched owner interaction)

The user can later provide **two truly independent offline storage devices**
(e.g. two trusted USB devices or one USB device plus an external disk). At that
point execute a single owner-controlled session with a reviewed helper:
private password entry, long-lived PKCS12 key creation (only after existing
identity search), public certificate fingerprint pin, two actual decrypt-and-
reopen backup verifications, safely provision five GitHub Environment Secrets.
Stop at any failure; do not run sign-next without a later explicit owner
approval for actual signing and protected Environment approval.

Do not demand additional full historical product regressions. After approved
signing, complete the remaining integrated R1 candidate and native migration
gates together, then arrange one phone acceptance.

**Overall R1: RECIPIO_R1_BLOCKED_OWNER_ACTION.**
**Overall G4: PENDING, not frozen or merged.**
