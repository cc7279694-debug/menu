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
- The cloud CI workflow performs an opt-in `app.recipio.local.next` unsigned
  release **identity/build check only**, and never publishes the unsigned
  APK. Its success must come from a real GitHub run, not this document.

## Owner-managed persistent signing

Manual-only workflow:
`.github/workflows/recipio-signed-next.yml`

Five GitHub **Actions repository secrets** required before any signed build:

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
the secrets in GitHub repository Settings → Secrets and variables → Actions.

This assistant's currently available GitHub connector cannot set repository
secrets or ensure external key custody. The workflow will refuse to build
without all values and the explicit manual confirmation phrase.

**GitHub registration caveat:** `workflow_dispatch` workflows must first
exist on the repository's default branch to be manually discoverable. This
file currently exists **only on the feature branch**, because the accepted
stable `main` is explicitly frozen. Therefore this workflow is a **prepared
gate, not yet manually runnable**. Do not merge all G4 code into main merely
to expose the button. A later explicitly authorized minimal workflow-only
registration or carefully gated signing branch must be reviewed separately
before dispatch.

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
