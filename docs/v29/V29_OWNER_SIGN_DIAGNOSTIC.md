# V29 owner signing failure — scoped diagnostic handoff

2026-11-05 · **BLOCKED / OWNER_ACTION_REQUIRED**.

The owner's first real attempt reported `SIGN_FAILED`. The original helper
discarded the official tool's detailed failure output, so the actual cause is
**UNKNOWN**. This does not establish an incorrect password or damaged keystore.

- The failure left one unsigned staged snapshot,15,149,572bytes, matching the
  frozen SHA-256 `95f52141cdcb228353fd98edb7611599132c16ab243100e30216ff6b96b5d995`.
  The signed staging file and public success receipt are absent. The original
  stage, launcher and failed evidence are preserved.
- The frozen helper reached the sign invocation after public preflight and
  alignment checks. This confirms neither successful key unlock nor signing.
  See [sanitized observation](sign-diagnostic-evidence/owner-sign-failure-1.json).
- Installed SDK36 help supports the existing flags and sequential stdin lines.
  Actual official `PasswordRetriever` read both generated UTF-8 fixture lines
  with the same restricted environment; JDK default=UTF-8, default type=pkcs12.
  [Safe receipt](sign-diagnostic-evidence/stdin-transport.json) and
  [synthetic probe](sign-diagnostic-evidence/StdinProbe.java). No key was loaded
  and no signing occurred in this probe. It says nothing about the owner password.

The helper correction is **diagnostic only**. It classifies sign-phase tool
failure in private process memory into fixed categories, without preserving or
displaying raw output, paths from errors, exception text or password. The
existing password input/transport, exact APK, certificate, signing flags,
same-key identity and publication checks are unchanged. No automatic retry.

32 mock tests passed: the original16 and16 new diagnostic cases. The16 new
cases failed before the correction, then passed. They cover fixed error codes,
no raw child output/exception context, no signing-stage code leaking into other
phases, and no retry. [RED](sign-diagnostic-evidence/red-mock-tests.txt) /
[final GREEN](sign-diagnostic-evidence/green-mock-tests.txt) /
[receipt](sign-diagnostic-evidence/mock-tests-receipt.json). Static comparison
kept the frozen inputs, preflight, signature command and password transport
unchanged. No need to rebuild or repeat product/device regression for this
helper-only change.

Use the **new diagnostic launcher**, not the original generic-error launcher:

`E:/CODEX/RECIPIO-Signing/v29-r3-owner-signing-diagnostic/START_V29_SIGN_DIAGNOSTIC.cmd`

Close the failed window, double-click the new launcher and enter the existing
password once in its private starred field. A new attempt is needed because the
original detailed error was not retained and private input cannot be recovered
by Codex. If successful, reply “签名已完成”; if it fails, reply only with the
new fixed error code. No password or private-window screenshot. Preserve both
attempts; do not repeatedly retry, create a new key or install on the phone.

Product source remains `747f80a38761882a19522e4c8f61a5f09a90068d`. The unsigned
APK, V28, signing identity and data are unchanged. No rebuild, actual signing by
Codex, key read/copy, network/XHS/AI, AVD or phone operation. Signed V29,
V28→V29 upgrade and Xiaomi14 verification remain pending. Existing R3 and N2
boundaries and [original handoff](V29_R3_A1_REVIEW.md) remain intact.
