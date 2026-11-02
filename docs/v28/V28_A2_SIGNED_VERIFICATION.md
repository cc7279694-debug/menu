# V28-A2 actual signed candidate verification

Date:2026-11-02. Branch:`verification/recipio-v28-a2`.
Result: **BLOCKED — ANDROID_ENVIRONMENT_LIMIT**. Signing/static inspection PASS;
required isolated upgrade verification NOT_RUN. This is not release approval.

## Fixed input and actual output

| Item | Independently checked value |
| --- | --- |
| A1 frozen source | `cf806554ac38346644613dd8b3bf700aeb48b14f` |
| A1 evidence | `07f9437377df96687b7545d88f16fa6fdff872b6` |
| Unsigned input SHA-256 | `e8969bd0d18af8c34fe8472d8bd96d162b51216a8fc1a15ef8f8c5c5d9837e6a` |
| Signed v28 path | `E:/RECIPIO-Signing/recipio-personal-release-v28/recipio-personal-v28.apk` |
| Signed v28 bytes | 15,194,675 |
| Signed v28 SHA-256 | `52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b` |
| Actual signer SHA-256 | `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d` |
| Actual v27 signer | Same single signer, verified from the actual signed v27 APK |
| Actual v27 APK SHA-256 | `b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95` |
| Package/version | `app.recipio.local` / code28 / `0.11.1-personal.1` |
| Manifest | debuggable=false; testOnly=false |

The owner entered the existing password privately. Codex did not collect/read
the password or keystore contents, create/replace a key, or execute the obsolete
fixed-v27 launcher. Signing used the already frozen unsigned input; no product
rebuild or business changes were made. The public owner receipt was checked
against the actual output, rather than accepted as sole evidence.

## Executed checks

Official tools:Android SDK Build Tools36.0.0 and existing JDK21, local only.

| Check | Result/evidence |
| --- | --- |
| `apksigner verify --verbose --print-certs` actual v28 | PASS, exit0; [public output](a2-evidence/signed/apksigner-v28.txt) |
| `apksigner verify --print-certs` actual v27 | PASS, exit0; [public output](a2-evidence/signed/apksigner-v27.txt) |
| `aapt2 dump badging` actual v28 | PASS, exit0; [metadata](a2-evidence/signed/apk-badging.txt) |
| `aapt2 dump xmltree --file AndroidManifest.xml` | PASS, exit0; [manifest](a2-evidence/signed/apk-manifest.txt) |
| `zipalign -c -P 16 4` actual v28 | PASS, exit0; [explicit exit receipt](a2-evidence/signed/zipalign-result.json); normal stdout empty |
| Actual SHA-256/bytes, owner receipt, signer/package/version | PASS; [read-only verifier receipt](a2-evidence/signed/signed-apk-verification.json) |
| ZIP CRC/no duplicate entries, input→signed payload comparison | PASS; all483 original entry bytes identical; signed486entries |
| Frozen unsigned/v27 hashes and product files vs A1 | PASS unchanged; signing/helper documents do not alter frozen product blobs |

apksigner reports v2=true/v3=true. v1/v3.1/v4/SourceStamp=false are retained in
the raw output; they are not relabeled as verified. Exactly three ZIP additions
are signing metadata: `META-INF/MANIFEST.MF`, `META-INF/RECIPIO-.RSA`,
`META-INF/RECIPIO-.SF`. There are no other entry additions/removals.

Earlier9 helper Fake tests and A1 product/build tests remain historical
preparation evidence, not freshly rerun Android or cryptographic tests. No
unnecessary full product tests, rebuild, product AI/web request or new APK was made.

## Android admission and remaining validation

Fresh [admission snapshot](a2-evidence/signed/emulator-admission.json): free
physical memory2.578GiB, required minimum4GiB. Per the approved resource rule,
**no emulator was started or created and no ADB command was run**. No other
project process/device was stopped, reused or inspected; no physical phone was
operated. No upgrade defect was observed because no upgrade was attempted.

| Required Android evidence | Status |
| --- | --- |
| New dedicated clean RECIPIO A2 AVD/device ownership | NOT_RUN — resource gate |
| Actual signed v27 install and synthetic recipe/image/history/theme seed | NOT_RUN |
| Actual before-upgrade export/data identity and image-hash capture | NOT_RUN |
| Same-key v28 `install -r`, without uninstall or data clear | NOT_RUN |
| After-upgrade IDs/times/order/counts/content, image bytes and theme comparison | NOT_RUN |
| Cold start, local search/edit/offline image/history, B1 and XHS entry smoke | NOT_RUN |
| Xiaomi14/OEM/TalkBack/IME and real personal-data upgrade | NOT_RUN — outside this isolated task |
| Real AI | NOT_RUN, calls0 |

There is no fabricated before/after comparison. Signature identity supports the
upgrade prerequisite but does not prove runtime data retention. SQLite4,
Preview7, Backup2 and v27 APK remain unchanged. No main merge, Release, phone
installation, personal-data operation or next module.

Resume only after fresh safe-resource admission, at step2 of the
[A2 checkpoint](V28_A2_CHECKPOINT.md#resume-after-signing-verification), using a
new isolated AVD and controlled data. Preserve the existing signed output; no
repeat signing/password prompt is required. Any identity/version/crash/data-loss
failure stops before a workaround or frozen-source change.
