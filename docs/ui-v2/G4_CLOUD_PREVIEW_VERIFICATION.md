# RECIPIO G4 — isolated cloud-preview build receipt

Date: 2026-10-25. Status: **CLOUD_BUILD_PASS / G4_PENDING_DEVICE_TEST**.

## Exact provenance

- Feature source/CI HEAD at run: `00a765600020bb6fe90f667ffa7b3e3413341bd4`
- GitHub Actions: https://github.com/cc7279694-debug/menu/actions/runs/40198321167
- Jobs: Windows JS/TS validation **SUCCESS**; Ubuntu cloud Android debug
  build **SUCCESS**. This proves compilation/testing, **not** Android app runtime.
- Stable `main` remains `649804a8209413f9d682f1079a4fd19ea84cd064`.
- Production G4 theme ACK/contrast patch: checkpoint `5d27e392a5421dec3bdbebfabf0487835daf768d`.
  Subsequent changes: GitHub Actions cloud jobs, opt-in debug
  `applicationIdSuffix ".cloudpreview"` and test-only Node `node:sqlite`
  module loading adjustment. No SQLite/Backup/Provider contract migration.

## Fresh cloud checks

| Check | Actual result |
| --- | --- |
| Typecheck | PASS |
| ESLint | PASS, 0 errors / 5 existing image warnings |
| Full JS/TS including Native source suite | 204 files, **1161/1161 PASS** |
| Production Vite build | PASS |
| Production import/isolation graph | PASS, 305 modules / 9 shared V2 / 0 showcase / 0 fixture assets |
| Gradle JVM unit task | PASS (`:app:testDebugUnitTest`) |
| Android lint task | PASS (`:app:lintDebug`) |
| Android debug app + instrumentation APK compilation | PASS |
| Android cloud-preview applicationId/version/signature validation | PASS (CI aapt/apksigner and artifact hash checked) |
| Connected Android, IME, true TalkBack, actual cover presentation | **NOT_RUN / NOT_CONFIRMED** |
| Original-package same-signature upgrade/data preservation | **NOT_RUN** (different package & certificate) |
| True baseline performance, real paid Provider, destructive restore | **NOT_RUN** |

The cloud build uses a GitHub-runner-generated **different debug signing
identity**. The APK must **not** be offered as an upgrade to the existing
`app.recipio.local` product. There is no permanent signing key for future
cloud-preview upgrades; future preview signing compatibility is not guaranteed.

## Exact immutable test APK

- GitHub Actions artifact ID: `12600679585`, original name:
  `recipio-g4-v25-cloudpreview-UNVERIFIED-android`
- APK: `recipio-ui-v2-g4-v25-cloudpreview-debug.apk`
- Application ID: `app.recipio.local.cloudpreview`
- VersionCode: `25`
- VersionName: `0.10.0-ui-v2-g4-rc2-cloudpreview`
- Size: `17,256,628` bytes
- SHA-256: `6af4910aa7932a5b3a172695849b691f03ca2475b5c6719758a3be72fa3aaba4`
- GitHub artifact expiration (currently configured): 2026-11-01 13:39 UTC;
  preserve the verified copy outside CI if later work depends on it.
- ZIP SHA256SUMS was independently read back and validated against extracted
  APK bytes. No phone install performed by ChatGPT.

## Open G4 acceptance gates

- User optional, throwaway phone experience with a generated test recipe/photo
  in the independently installed cloud-preview app; no personal data import.
- Actual Android immediately forced-stop/reopen theme persistence with ACK.
- A real device image screenshot should display the chosen photo, not the
  historical “图片暂不可用” placeholder. Diagnosis if it persists.
- Real Android IME/Back, offline, share, connected tests and TalkBack remain
  separate from completed cloud build.
- The user's original `app.recipio.local` v23 remains untouched. No
  `main` merge, tag, release or G4 freeze without independent acceptance.
