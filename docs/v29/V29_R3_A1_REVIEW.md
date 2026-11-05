# V29-R3-A1 — integrated unsigned candidate and owner signing gate

2026-11-05 · **BLOCKED / OWNER_ACTION_REQUIRED — OWNER_SIGNING_REQUIRED**.
All authorized no-password preparation is complete. This is not an installable
signed deliverable, Android upgrade acceptance or Xiaomi14 direct-link success.

## Fixed source and accepted inheritance

- Branch:`integration/recipio-v29-r3-a1`.
- R3 acceptance registration:`3998147dcd5d68f8284a6529a2f0660e69d30e6b`;
  [registered limited conclusion and full NOTES](../verification/xhs-real-link-r3/INDEPENDENT_ACCEPTANCE.md).
- Product/version source:**`747f80a38761882a19522e4c8f61a5f09a90068d`**.
- Accepted R3 source:`bc045adfc9bb5b6a9698580f9c1cad593d90ab35`;
  fixed prior evidence:`12985171de9f14626dc6b3eb9ec6227b5db8a973`.
- V28 sourcecf806554 is an ancestor. This branch starts at fixed R3 evidence,
  whose product tree equals bc045ad, then registers acceptance and changes only
  version defaults. No moving-main replacement, merge or cherry-pick guessing.
- [Version-only exact delta from R3](evidence/version.diff.patch);
  [full product delta from V28](evidence/v28-to-v29-product.diff.patch) includes
  previously accepted R2 diagnostics/auxiliary screenshot flow and R3; those are
  inherited accepted source, not new V29 development.
- N2 source51a2d92 is not an ancestor; segmentation native classes and JS entry
  are absent from source and packaged payload. N2 stays PAUSED_BY_USER.

## Unique frozen unsigned input — do not install this file

`E:/CODEX/Tools/recipio-v29-r3-a1-20261105/recipio-v29-r3-a1-unsigned.apk`

- Bytes:**15,149,572**.
- SHA-256:**`95f52141cdcb228353fd98edb7611599132c16ab243100e30216ff6b96b5d995`**.
- Actual package:**app.recipio.local**; code**29**; name**0.11.2-personal.1**.
- Official aapt2:non-debuggable/non-testOnly; allowBackup=false; permissions equal
  the actual signed V28. CRC, ZIP/asset isolation and official zipalign PASS.
- Official apksigner explicitly rejects the unsigned APK for missing signature
  metadata; v1 metadata and APK signing block absent. This expected failure is
  **not** a signed candidate PASS.
- All16dist Web files match Android copied assets and APK entry bytes. Packaged
  display version matches; old V28 display version/test fixtures/Showcase/keys/
  database/backup archives/remote Capacitor server URL are absent.
- [Actual metadata](evidence/unsigned-apk-metadata.json), [aapt2 badging](evidence/apk-badging.txt),
  [manifest](evidence/apk-manifest.txt), [inspection source](evidence/inspect_unsigned.py),
  [asset checks](evidence/asset-precheck.json).

## Fresh verification on the fixed integrated product

| Executed check | Result | Evidence |
| --- | --- | --- |
| Selected integrated JS/TS | **454PASS /30files**, no failures/skips | [log](evidence/targeted-tests.txt), [selected paths](evidence/selected-tests.txt) |
| Pure JVM public-network safety | **25PASS**:7URL/14fetch/4request | [log](evidence/jvm-tests.txt), [exact commands/source and dependency hashes](evidence/jvm-network-receipt.json); local MockWebServer only |
| TypeScript | PASS | [log](evidence/typecheck.txt) |
| Lint |0errors/5existing warnings | [log](evidence/lint.txt) |
| Versioned production Web build / Capacitor sync | PASS | [build](evidence/build.txt), [sync](evidence/sync.txt) |
| Production graph isolation |326modules/15sharedV2/0Showcase or fixture assets | [log](evidence/isolation.txt) |
| Android release compile | PASS,192tasks executed;2m25s | [log](evidence/assemble-release.txt); JDK21/SDK36, offline,1worker,no persistent daemon,1GiB heap/384MiB metaspace |
| Release resources admitted |5.5676GiB free, threshold4GiB | [admission](evidence/gradle-admission.json); no other tasks stopped, no SDK install |
| New owner helper | **16Fake tests PASS**, RED16fail→GREEN16 | [final receipt](evidence/signing-helper-tests/receipt-final.json), [final log](evidence/signing-helper-tests/green-final.txt), [initial failure](evidence/signing-helper-tests/red.txt) |
| Static baseline/helper cross-check | SOURCE_REVIEW_PASS | Accepted R3 unchanged, fixed package/version/hash/certificate, no N2 or new identity; not device/cryptographic execution |

JS coverage includes real-layout synthetic regression, target ID mismatch and
unowned recommendations/JSON-LD rejection, ordinary website parsing, title/media/
login/challenge/error categories, explicit AI/manual review/UUID save recovery,
library/editor/search/storage/history paths, theme persistence and Backup v1/v2
validation/transactions.196link-import tests are a **subset** of454, not extra.
Browser Repository/Fake evidence does not prove native on-device persistence.

Existing warnings retained:5image-lint warnings,2JSDOM scrollTo notices, Vite
config/chunk warnings, Gradle flatDir/deprecation/dependency unchecked notices.
Sync resolved the shared node_modules junction into cross-worktree generated
Gradle paths. Only those generated paths were restored to their accepted local
`../node_modules` references (same resolved dependency bytes); their final Git
blobs equal the fixed source. No unknown work was reset or cleaned.

## Existing certificate and signing status

Actual unchanged signed V28:
`E:/CODEX/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk`.
SHA-256:`52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`.
Official public APK verification:**v2=true,v3=true**, certificate:
`5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
[Public signature output](evidence/v28-public-signature.txt). No keystore was
opened, copied or inspected by Codex.

The pinned new [existing-key-only helper](../../scripts/v29-r3-signing/README.md)
uses official apksigner/zipalign and requires the owner's private password
input. Its16tests use non-key/non-APK fixtures and Fake tools, not a temporary
signing identity. They cover wrong inputs/version/certificate/v2/v3/debug/
testOnly, output conflict, payload changes and password redaction. The helper
has no key-generation, key-content read/copy, old PowerShell module, network or
phone operation. Password is transient only in the private process and stdin;
no args/env/files/logs or memory-erasure guarantee.

**Only current required owner step:** double-click
`E:/CODEX/RECIPIO-Signing/v29-r3-owner-signing/START_V29_EXISTING_KEY.cmd`,
enter the existing password once in the masked window, then reply “签名已完成”.
Do not send the password or a private-window screenshot. No GUI was started by
Codex. If it fails, return only its error category; preserve failed staging and
do not overwrite outputs or repeatedly retry.

Future signed output (currently **NOT_CREATED**, not a download):
`E:/CODEX/RECIPIO-Signing/recipio-personal-release-v29/recipio-personal-v29.apk`.
The helper publishes exclusively after v2/v3/certificate/identity/alignment/
payload validation and writes public OWNER_RESULT.json. Codex must still recheck
the actual signed APK independently. Any existing-output conflict stops.

## NOT_RUN, safety and resume point

- **NOT_RUN:** owner private signing; actual V29 signature/v2/v3/certificate and
  signed APK SHA; Android install/cold start/synthetic R3 WebView runtime;
  V28→V29 same-signature upgrade and actual recipe/image/history/theme retention;
  Xiaomi14/OEM/TalkBack/IME/real AI/model quality/real XHS network requests.
- No simulator was launched or connected device operated: unsigned input is not
  installable, so upgrade testing stops at the owner gate. No debug key/reinstall
  or data-clear substitute is used. No pre-existing AVD data is reused/cleared.
- R3's409characters remain the submitter's prior receipt; raw text was not
  committed or fetched again. Diagnostic DoH success is not default-DNS/phone
  success; original Xiaomi dns_blocked remains UNKNOWN. No new real requests
  were authorized or made, and Fake-IP/SSRF/pin/TLS/downgrade protections remain.
- SQLite4/Preview7/Backup2/Repository/media semantics, Provider/Key, themes/Logo
  and original-package identity remain unchanged. V28 and all personal data are
  untouched. No new permission/dependency/key/main merge/Release/N2 resumption.

After owner completion: read only the public result and actual V29 APK; compare
signature/certificate/version/hash/payload against the frozen input. Then recheck
≥4GiB free and create a fresh exclusive RECIPIO API36 AVD. Install actual V28,
restore **repository-generated synthetic** seed using normal App UI, select
non-default theme, cold start and export a new before-V28 backup. Only then
normal target-serial `install -r` of the verified V29, no uninstall/clear;
export after-V29 and compare IDs/times/order/all collections/media bytes and
theme/package install identity. Source seed is not the before-upgrade export.
Stop on any mismatch without changing frozen business source or destroying the
failed state. Preserve system ANR/failure evidence if the environment fails.

[Owner phone checklist](V29_R3_A1_OWNER_CHECKLIST.md) is preparation only; no
phone action until explicit later permission and independent review. Stop here
for owner signing and ChatGPT review; do not claim formal release or phone PASS.
