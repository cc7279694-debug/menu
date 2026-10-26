# RECIPIO G4 — safe signing and cross-install migration preparation

**State: PREPARATION ONLY.** No signing key has been provisioned, no
permanently signed new APK exists, and no user's backup has been transferred.
G4 overall remains pending.

## The identity problem

The accepted original `app.recipio.local` v23 has certificate
SHA-256 `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
The successful cloud v25 experience APK has independent package
`app.recipio.local.cloudpreview` and a non-persistent runner-generated signer.
It cannot overwrite or access the original user's data. Future GitHub
runner-generated debug APK signatures are also not guaranteed to match.

Instead of risking an incompatible reinstall, the proposed *separate*, future
candidate package is `app.recipio.local.next`. Its package identity is only
opted in with `-PrecipioSignedNext=true`. Merely compiling the unsigned
release variant is not enough to deliver a signed upgradeable application.

## Non-destructive data transfer

Current Backup v2 format and service are portable across installation IDs
and include all reference-tracked images, old versions, ingredients, steps,
changes and cooking history, not Android app keys or the appearance selection.

Future user-directed procedure, **not yet performed on a phone**:

1. Keep the original app installed. In its Settings open Data & Backup and
   export a complete local `.recipio` file with the Android system picker.
2. Keep that file privately in local storage. **Backups are not encrypted** and
   can contain personal photos and notes. Do not upload them to ChatGPT,
   GitHub, a CI runner, a public folder or a shared link.
3. Install the independently signed new app *alongside* the original only
   after app-identity and signing/cert gates are accepted.
4. Select Import & Restore on the new app; verify preview counts and warning.
   The action REPLACES current new-app data, it does not merge. Either cancel
   (no original changed) or separately confirm if the target new app has no
   irreplaceable content.
5. Verify actual recipe/media/history rows and images using the phone. Keep
   the original app and source backup. Uninstalling the original is a separate
   later user decision and is not part of this phase.

This existing archive protocol does not authorize copying Android private
app files between sandboxed identities.

## Evidence and its scope

- `src/native/backup/independent-install-migration.test.mjs` uses two
  separately instantiated SQLite repositories, realistic portable v2 assets,
  original recipe + prior modifications + cooking photo/record, explicit
  preview/cancel/confirm semantics and malformed-media rejection.
- It does **not** exercise Android SAF, native ZIP parsing, actual bytes or
  full-device data readback. Those are still device gates. Existing Java
  archive and connected tests remain separately scoped.
- GitHub Actions run [40259291222](https://github.com/cc7279694-debug/menu/actions/runs/40259291222)
  **SUCCESS** at tested source `0092bed5ad09e667fc802e0c63a6bfe78be49bbd`:
  205 JS/TS files / **1163 tests PASS**, Typecheck PASS, ESLint 0 errors /
  5 historical warnings, production build/isolation PASS; Android JVM/lint/
  debug build PASS. The new 2 migration checks are included, not extra.
- Cloud CI compiled opt-in **UNSIGNED** release with
  `app.recipio.local.next`, code26/name0.10.0-ui-v2-g4-rc3-next,
  and verified the identity using aapt; PASS. It does **not** publish the
  unsigned APK or prove native backup migration.

## Owner-managed persistent signing

Manual-only workflow:
`.github/workflows/recipio-signed-next.yml`

Five GitHub **Actions Environment secrets** are required in a dedicated `recipio-signing` environment before any signed build. **Do not place signing material in repository-wide secrets**; the protected signer job is the only job that references this environment:

- `RECIPIO_NEXT_KEYSTORE_B64`: base64 representation of an owner-secured
  Android JKS/PKCS12 signing keystore
- `RECIPIO_NEXT_STORE_PASSWORD`
- `RECIPIO_NEXT_KEY_ALIAS`
- `RECIPIO_NEXT_KEY_PASSWORD`
- `RECIPIO_NEXT_CERT_SHA256`: lowercase 64-digit digest of the key's public
  certificate; pinned for every future signed app build

Never enter private keys, keystore passwords or base64 signing keys into
this chat, public GitHub, workflow_dispatch inputs or CI logs. Create and
back up the private key securely outside the repo, and only then configure
these **Environment secrets** under GitHub repository **Settings → Environments → `recipio-signing` → Environment secrets**. If suitable, also restrict allowed deployment branches and require owner review before the signer job proceeds.

This assistant's currently available GitHub connector cannot create GitHub
Environment secrets, generate a key under your permanent control, or ensure
external key custody. Only the final signer and secret-availability check steps
receive signing key environment variables; the package installation, tests,
web build, Gradle build and artifact upload never receive them. The workflow will refuse to build
without all values and the explicit manual confirmation phrase.

**GitHub registration caveat:** `workflow_dispatch` workflows must first
exist on the repository's default branch to be manually discoverable. This
file currently exists on the feature branch and a **one-file-only draft PR #1**
(`ci/recipio-signed-workflow-registration` → `main`) has been prepared:
https://github.com/cc7279694-debug/menu/pull/1. The PR is deliberately **NOT
MERGED**. It contains no unfinished G4 business code. The owner must separately
authorize this narrow default-branch registration before any manual dispatch.
Even after merge, no action starts automatically and no key exists until the
owner configures the environment and private signing material.

**DO NOT TRIGGER** until the owner accepts the new permanent package ID and
the key custody arrangement. New packages from a lost signing key cannot
receive ordinary APK upgrades.

## Remaining gates

- User sign-key preparation / new identity approval: **PENDING**
- Perpetual signed APK produced/verified: **NOT_RUN**
- Original v23 backup export → new identity native restore: **NOT_RUN**
- Original data safety on physical phone: **NOT_RUN**
- Full Android connected / true IME / TalkBack / performance: **NOT_RUN**
- G4 overall frozen or main merged: **NO**

The cloud G4 v25 throwaway-preview phone smoke is accepted within its original
scope and does not count as a signed migration.
