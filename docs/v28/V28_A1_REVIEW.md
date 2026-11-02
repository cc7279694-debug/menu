# V28-A1 accepted-source integration — review handoff

Date: 2026-11-02. Branch: `integration/recipio-v28-a1`.
**V28-A1 READY FOR INDEPENDENT REVIEW — UNSIGNED BUILD ONLY.**
This is not formal-version acceptance, a signed APK delivery or phone testing.

## Fixed integration source and accepted inputs

Integration source: `cf806554ac38346644613dd8b3bf700aeb48b14f`.
The subsequent evidence commit changes documentation only. Read the immutable
delivery SHA supplied in the handoff message, not a moving branch or `main`.

| Retained capability | Fixed acceptance / inheritance source |
| --- | --- |
| G3–G7, library/edit/search/cooking/history/intake/serving | Main `19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe`; original G5/G6/G7 independent records remain in docs |
| Search B1 keyboard rounded ring / touch border | Acceptance registration `6c580bf0d00ff3162a965d53ce7835ca4484b27c`; [B1 review](../ui-v2/SEARCH_FOCUS_B1_REVIEW.md) |
| XHS safe reading, error categories, completeness, ownership | Final source `eef0bec324a96f5ca97a0e050b30417d39e20448` |
| Scoped XHS comprehensive acceptance | Evidence `ae1434601a2ddf2212fb05460efcabb3d969ab1e`; [formal registration](../verification/xhs-module-20261101/INDEPENDENT_ACCEPTANCE.md) |

Each fixed source is an ancestor of `ae14346`, and `eef0bec → ae14346` is
documentation/evidence only. The integration branch starts at that fixed commit;
there is no repeated merge, cherry-pick, rebase or moving-main replacement.

- [Exact A1 delta from accepted input](https://github.com/cc7279694-debug/menu/compare/ae1434601a2ddf2212fb05460efcabb3d969ab1e...cf806554ac38346644613dd8b3bf700aeb48b14f).
- [Accepted product changes beyond fixed main](https://github.com/cc7279694-debug/menu/compare/19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe...eef0bec324a96f5ca97a0e050b30417d39e20448).
- [Task boundary and build procedure](V28_A1_SCOPE.md).

Only version defaults change: code **28**, candidate name **0.11.1-personal.1**.
Package remains **app.recipio.local**. Product/test/CI/dependency/native logic
and accepted B1/XHS code are unchanged from the input. SQLite4, Preview7,
Backup2, repositories, AI/key handling, three themes, media and original Logo
retain their accepted blobs. No signing configuration or secret is added.

## Fresh integrated verification

All commands use the integrated source above. See [command receipts](evidence/test-results.txt),
[selected test paths](evidence/selected-tests.txt), [identity checks](evidence/integration-checks.json),
[asset checks](evidence/asset-precheck.json), [APK metadata](evidence/unsigned-apk-metadata.json)
and [resource admission](evidence/gradle-admission-final.json). The executed
[unsigned inspection helper](evidence/inspect_unsigned.py) is evidence only,
outside the production build; it contains no signing operation.

| Check actually run | Result and scope |
| --- | --- |
| Selected integrated JS/TS regression, one forks worker | **30 files / 421 PASS**, 0 failures/skips; includes the XHS/intake review tests, not421+284 |
| Public-network Java tests, freshly recompiled | **25 PASS**, pure JVM; not Gradle/native/device tests |
| TypeScript | PASS |
| Lint | PASS, 0 errors /5 existing image warnings |
| Versioned production Web build | PASS; `VITE_RECIPIO_VERSION=0.11.1-personal.1` |
| Production graph isolation | PASS,326 production modules /15 shared V2 /0 showcase or fixture modules |
| Capacitor Android sync | PASS; no tracked generated-source delta |
| Copied Web asset identity | PASS,16 built files byte-identical in Android public assets |
| Web/Android source-version preparation | PASS, candidate version present in bundle, old version absent, Gradle defaults28/name match |
| Static Release identity/security | PASS, original package/default unsigned release, no debug/testOnly source flags, backup disabled |
| Android `:app:assembleRelease` | **PASS**, JDK21/SDK36, single worker, unsigned;192 tasks,47 executed/145 up-to-date |
| Actual v28 package/manifest/ZIP/unsigned isolation | **PASS**, original package/code28/name; no debug/testOnly/signature/test assets; permissions equal v27 |
| APK install/runtime/upgrade | **NOT_RUN**, intentionally outside A1 |

Coverage includes link reading/error categories/target ownership and ordinary
site parsing; explicit AI/review/save/restore guards; B1 search; library and
editor/recipe storage; theme persistence; v1/v2 backup validation, repository
transactions and failed restore; AI security/offline separation. These use
controlled data and adapters, not personal data; they do not establish Android
native SQLite behavior or on-device persistence.

No full historical repository run or browser recapture was needed: business/UI
source is unchanged, and the existing accepted visual evidence remains linked.
Three JSDOM `scrollTo` notices, the existing Vite config/chunk warnings and five
lint warnings are preserved. No warning was suppressed to obtain a PASS.

## Android compile admission and artifact protection

The first environment check found3.48GiB free. After frontend checks/sync,
compile admission found3.214GiB, below the existing4GiB threshold, so Gradle was
not started then. A later final check found6.376GiB; actual build admission was
6.262GiB and retry admission6.221GiB. The existing official SDK/JDK was used
without SDK installation, emulator or device operations. Gradle used one worker,
no persistent daemon,1GiB heap/384MiB metaspace; no signing flags/config/keys.

The first command failed before compilation because PowerShell split the
unquoted numeric version argument into a task. Supplying string-array arguments
fixed the command; no source/test change was made. The final build passed in
1m7s. Both receipts remain, not just the green result. The initial unbounded
credential-pattern scan also matched nine interior `sk-` substrings of Tailwind
`mask-*` utilities; a token-boundary check resolved these false positives without
changing any APK bytes. No credential values were printed. Existing Gradle
flatDir/deprecation warnings remain.

The inspected unsigned artifact is **not an installable user deliverable**:

- Local path: `E:/CODEX/Tools/recipio-v28-a1-20261102/recipio-v28-a1-unsigned.apk`.
- Bytes: **15,148,384**.
- SHA-256: `e8969bd0d18af8c34fe8472d8bd96d162b51216a8fc1a15ef8f8c5c5d9837e6a`.
- Package/version: `app.recipio.local`,28,`0.11.1-personal.1`.
- Official `apksigner verify` returned the expected explicit missing-signature
  error (`Missing META-INF/MANIFEST.MF`); v1 metadata and APK signing block are
  absent. ZIP CRC, official zipalign, aapt2 badging/manifest and asset checks pass.
- Actual ZIP contains no fixture/showcase/test assets, signing-key/database/
  backup archive files or remote Capacitor server URL. All16 built public files
  match; current display version is packaged and the old version is absent.
- No debuggable/testOnly, allowBackup=false; permissions equal preserved v27.

The existing unsigned **v27** file was copied byte-for-byte to a fresh QA folder
before any possible build. It remains v27 and is not this task's candidate:
15,145,012 bytes, SHA-256
`e07565397555df9cd95cdbc6c79a8b9c5075bc92ab4ca663b657232234b0df0e`.
The actual signed v27 APK remains unchanged at SHA-256
`b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`.
Neither APK is uploaded or presented as a new installable deliverable.

## Same-key signing and upgrade preparation, not executed

Before signing in the next separately authorized stage:

1. Pin the independently approved source and this exact unsigned hash. If any
   build input changes, repeat the necessary unsigned compilation/inspection.
   Do not sign an older cached v27 APK merely because its filename matches.
2. Recheck manifest/package/code28/name and unsigned hash before signing. The
   official-tool and ZIP/asset checks above are build evidence, not runtime
   or same-key upgrade acceptance. A filename or arbitrary apksigner error is
   never proof of correct identity/unsigned status.
3. Reuse the existing v27 personal identity, public certificate SHA-256
   `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
   Any certificate mismatch stops upgrade delivery; never generate a replacement.
4. Do **not** run the historical personal-signing launcher. It is fixed to v27
   and calls `keytool -genkeypair`; it is preserved as history, not a v28 updater.
   No private key/password/keystore/backup was read or requested in A1.
5. After signing authorization, test V27→V28 `-r` update only on an owned,
   isolated device with synthetic data; no uninstall/clear-data. Compare IDs,
   content/times/order, covers/step/history images, cooking/change records,
   themes, backup and offline startup. Same certificate and code increase are
   prerequisites, not proof of upgrade-data preservation.

No phone installation, private data export/restore, signed v28, certificate
reuse test or same-key upgrade test has occurred in this stage.

## Limits / NOT_RUN / stopping point

- Physical Xiaomi/OEM, Android IME/Back, TalkBack/system font, native lifecycle,
  real image rendering, flight-mode cold start, device performance: NOT_RUN.
- Full Gradle JVM/connected Android test suites, APK runtime/installation,
  signing and V27→V28 controlled upgrade/data retention: NOT_RUN. The scoped25
  pure JVM checks and actual unsigned compilation/inspection are separate PASS.
- Live XHS anonymous success, phone DNS root cause, real TLS/SNI and real AI
  quality: NOT_RUN. Login/captcha/access and unread image/video/speech steps
  remain limits. No claim that all XHS links now work or phone DNS is repaired.
- Real paid AI calls0; no real website probing, phone operations, key access,
  new identity, main merge, tag, release, deployment or next product module.

Only the new integration branch is pushed. Original feature history and the
existing untracked `android/.idea/` are protected. Await ChatGPT independent A1
review; do not declare formal-release acceptance or proceed to signing/install.
