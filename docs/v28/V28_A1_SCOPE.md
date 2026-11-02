# V28-A1 integration and unsigned build preflight

Authorized: 2026-11-02. Branch: `integration/recipio-v28-a1`.
Plan recorded with the integration source. Execution results are in
[the A1 review handoff](V28_A1_REVIEW.md); this is not release acceptance or
signing/installation authorization.

## Fixed inheritance

| Accepted input | Immutable source |
| --- | --- |
| Main, G3–G7 baseline | `19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe` |
| Search-focus B1 registration | `6c580bf0d00ff3162a965d53ce7835ca4484b27c` |
| Final XHS product/test source | `eef0bec324a96f5ca97a0e050b30417d39e20448` |
| Scoped XHS comprehensive acceptance evidence | `ae1434601a2ddf2212fb05460efcabb3d969ab1e` |

All three source inputs are ancestors of the fixed evidence commit. The linked
worktree already provides isolation. Create the integration branch at that
fixed commit; no merge/cherry-pick/rebase or moving-branch replacement is needed.
The original XHS branch and the pre-existing untracked `android/.idea/` remain.

Main-to-input business changes are the accepted B1 and XHS work only. Existing
v27 build/signing-history files are retained as history, never executed for
V28 signing. Product source at branch creation is identical to `eef0bec`.

## Minimal candidate change

Prepare only `android/gradle.properties` version defaults:

- Package remains `app.recipio.local`.
- versionCode `28`, greater than v27.
- Candidate versionName `0.11.1-personal.1`, a patch-version label for this
  integration, not a claim of formal release acceptance.
- Build Web assets with `VITE_RECIPIO_VERSION=0.11.1-personal.1` so Settings
  agrees with the Android manifest; then sync the already built assets.
- SQLite4 / Preview7 / Backup2, repositories, themes, original Logo, AI keys,
  Provider behavior, media and native network security stay unchanged.

## Verification contract

Run one bounded integrated regression set covering link import/intake review,
B1, recipe CRUD/edit/storage, theme persistence, backup compatibility/rollback,
AI security/offline separation. Use one forks worker and synthetic data only.
Recompile the existing 25 public-network JVM checks if available; do not repeat
the whole historical product suite, real websites or paid Provider calls.

Run TypeScript, lint, the versioned local production build and production graph
isolation. Verify asset identity after Capacitor sync. Before Gradle, recheck
available physical memory; require at least4GiB and use the existing official
JDK21/SDK36, one worker, no daemon. Do not install an SDK or stop other tasks.
If the gate fails, preserve completed source/Web checks and explicitly report
Android compilation NOT_RUN / ENVIRONMENT_BLOCKED, not a new APK.

If compiled, only `:app:assembleRelease`, without signed-next/cloud-preview flags,
signing configuration or secrets. Preserve any previous unsigned output before
the build. Verify original package/code28/name, no debuggable/testOnly, no test/
Showcase assets, asset version/hash identity and explicit absence of signatures.
Keep the unsigned file clearly labeled as non-installable preflight output.

## Next-stage boundary

Do not invoke the historical personal signing launcher: it creates a new key and
is fixed to v27. Future signing needs the existing v27 identity, whose public
certificate SHA-256 is
`5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
No key/password/keystore is read by A1. No signing, emulator, phone, backup of
personal data, uninstall, installation or upgrade is authorized here.

After independent A1 acceptance and separate user authorization, validate the
same certificate and monotonically increasing version, then use only controlled
synthetic data to test V27→V28 upgrade without uninstall/clear-data. Compare IDs,
times/order/content/images/history, theme/backup and offline behavior. Real
phone migration/installation remains user-controlled; never silently create a
replacement identity or treat unsigned inspection as upgrade evidence.

XHS scoped acceptance does not solve the phone DNS cause, platform login/captcha,
image/video-only steps, real model quality or native/OEM/IME/TalkBack evidence.
Keep those limits; do not merge main, publish, sign or start another module.
