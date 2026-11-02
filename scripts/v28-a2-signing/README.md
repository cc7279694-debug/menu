# V28 existing-identity owner helper

Double-click `START_V28_EXISTING_KEY.cmd` in a private desktop session. The
small window validates the fixed inputs, then asks for the **existing v27 key's
password once**, with visible masking characters. This is not a new password.
Do not send the password or a screenshot of the private window to Codex.

Only the existing `recipio-personal-identity-v1/personal-signing.p12` is used.
No key generation, keystore write/copy, old signing module, backup decryption,
network, APK build, device or installation operation exists in this helper.
Official apksigner reads the password through stdin; it never enters arguments,
environment variables, files, Git or tool logs. Passwords exist transiently in
the private process memory; no perfect memory-erasure claim is made.

Input APK hash, package/version and v27 public certificate are checked before
asking for the password. Signing goes to a fresh staging directory. Verification
must match the v27 certificate, original package/code28/name, alignment and all
original ZIP payload entries. The final directory is created exclusively only
after those checks. Any conflict, tool/certificate/payload failure stops, with
no automatic retry or overwriting. Failed staging remains for diagnosis.

Success produces exactly one candidate:

`E:/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk`

and its public `OWNER_RESULT.json`. If the success receipt is missing, a leftover
directory/file is **not success**; preserve it, stop and report the safe error
category. Codex must independently verify the real APK after owner completion,
not merely trust the window or receipt. Runtime upgrade remains NOT_RUN until
the separately gated owned-emulator checks complete.

`test_sign_existing.py` uses generated non-APK ZIPs, non-key text files and a
Fake tool runner; it never invokes real signing or creates a signing identity.
