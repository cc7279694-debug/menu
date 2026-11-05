# V29-R3 existing-identity owner helper

This is one fixed local owner action for V29, not a signing framework, a new
identity or a production feature. Do not use the V27/V28 launchers. No GUI or
real signing is run during preparation; status remains **OWNER_SIGNING_REQUIRED**.

The unsigned APK is locked to
`E:/CODEX/Tools/recipio-v29-r3-a1-20261105/recipio-v29-r3-a1-unsigned.apk`,
source `747f80a38761882a19522e4c8f61a5f09a90068d`, package
`app.recipio.local`, code29, name `0.11.2-personal.1`. The verified unsigned
input is15,149,572bytes, SHA-256
`95f52141cdcb228353fd98edb7611599132c16ab243100e30216ff6b96b5d995`.
The fixed hash is now frozen; a pending/non-SHA value still fails closed before
any tools or password prompt. This does not complete the owner's signing gate.

Only the existing identity under
`E:/CODEX/RECIPIO-Signing/recipio-personal-identity-v1/personal-signing.p12`
is used. The previous signed V28 hash is fixed to
`52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`;
certificate SHA-256 must equal
`5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
No Python key-content read, copy, write, key generation, backup decryption,
legacy PowerShell tool, network, AI, APK build or phone operation exists here.

When the candidate is frozen and the owner is ready, double-click
`START_V29_EXISTING_KEY.cmd` in a private desktop session. It validates the
unsigned hash/package/release manifest/alignment and actual V28 certificate
before asking for the **existing password once**, in a visible-star field.
The password is transient in the owner's private process memory, passed only
through child stdin. It is never a command argument, exported environment
value, file, receipt or tool log. No perfect memory-erasure claim is made.
Codex must not observe or capture this private window. Do not send its screenshot.

Official zipalign checks the already aligned frozen input before signing;
the helper does not rewrite that input. Signing explicitly enables v2/v3 and
disables v4 rather than relying on defaults. Official apksigner verifies exactly
one expected signer and **v2=true, v3=true**. Unsigned/signed identities must be
code29/name/package correct, non-debuggable and non-testOnly. All original ZIP
entry bytes must survive; duplicate entries and unexpected additions fail.

Final output is created exclusively only after checks:

- `E:/CODEX/RECIPIO-Signing/recipio-personal-release-v29/recipio-personal-v29.apk`
- Same directory: public `OWNER_RESULT.json`.

Output conflicts, changed input/previous APK, missing existing key, wrong
certificate/version/schemes or errors stop without overwrite or automatic
retry. A failed staging attempt is preserved under `recipio-v29-r3-staging`;
it contains APK intermediates, never a copied key or password. An output without
a valid success receipt is not success; preserve it and stop. Codex independently
checks the actual signed APK after owner completion. No installation or upgrade
claim follows from signing; those remain separately gated.

## Owner signing diagnostics

The earlier `SIGN_FAILED` attempt discarded its raw tool output. There is no
recoverable stderr and its actual cause remains **UNKNOWN**; it does not prove
the owner typed the wrong password. The failed staging files remain unchanged.

Only an owner-initiated new local attempt can establish a more specific
failure category. For that one attempt, the helper checks a bounded in-memory
prefix of apksigner sign stderr for known ASCII diagnostics and exposes only a
fixed category. `SIGN_STORE_PASSWORD_REJECTED` or `SIGN_KEY_PASSWORD_REJECTED`
means the provider rejected unlocking the store or key; neither proves an
input mistake. `SIGN_ALIAS_MISSING` means no usable key was reported for the
alias. Other categories cover rejected options, keystore format/provider,
file access/I/O, closed stdin, timeout, process start and unknown failures.
A generic "Wrong password?" hint is not treated as a confirmed password error.

No raw stdout/stderr, arguments, exception chain, password or path is emitted
from the signing diagnostic. Other tool stages retain their original failure
codes. No automatic retry, changed signing parameters or new key route is
introduced. If an owner attempt stops, report only its fixed error category.

`python -m unittest -v test_sign_existing` in this directory uses only generated
non-APK ZIPs, non-key text fixtures and Fake official tools. It neither invokes
real signing nor proves cryptographic/device success. Never run `preflight(FIXED)`,
the GUI or the launcher as an automated test.
