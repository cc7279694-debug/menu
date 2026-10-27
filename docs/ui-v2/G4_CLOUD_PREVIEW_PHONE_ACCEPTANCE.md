# RECIPIO G4 cloud-preview: user phone smoke acceptance — 2026-10-26

**Scope-only decision: CLOUD_PREVIEW_PHONE_SMOKE_ACCEPTED — PASS WITH NOTES.**

This record is based on the user's direct chat feedback: after installing the
independent cloud-preview v25 build and being asked to check three items, the
user reported “都没有问题，测试通过”. This is **user-reported Android phone
experience**, not a GitHub-hosted connected test or an assistant-operated phone.

## Tested release identity (fixed)

- GitHub Actions run: https://github.com/cc7279694-debug/menu/actions/runs/40198321167
- Source and workflow commit of APK: `00a765600020bb6fe90f667ffa7b3e3413341bd4`
- Artifact `recipio-ui-v2-g4-v25-cloudpreview-debug.apk`
- Application ID: `app.recipio.local.cloudpreview` — separate from `app.recipio.local`
- VersionCode `25` / VersionName `0.10.0-ui-v2-g4-rc2-cloudpreview`
- SHA-256 `6af4910aa7932a5b3a172695849b691f03ca2475b5c6719758a3be72fa3aaba4`
- GitHub-generated runner debug signing identity, **not** the original app certificate.
  No long-lived cloud signing key has been set up.

## User-reported checks

| Check requested immediately before user's reply | User-reported result |
| --- | --- |
| Change Pure Glass and Soft Sage; exit and reopen App; selected theme retained | PASS |
| Create an isolated test recipe/photo and check photo on list/detail | PASS |
| Open cooking mode, inspect steps and controls, return normally | PASS |

The previous v24 **historical** screenshot showed “图片暂不可用”. The
user-reported cloud-v25 phone experience did not reproduce that symptom.
**Do not claim a verified root cause or a general fix** from this observation
alone. No source edits were needed for this acceptance entry.

## Existing fresh cloud engineering evidence

- Windows: 204 test files / 1161 JS/TS tests PASS, Typecheck PASS, lint 0 errors
  / 5 inherited warnings, local build and production-isolation PASS.
- Ubuntu: Android JVM unit task, lint, debug APK and AndroidTest APK compilation
  PASS. No connected AndroidTest method was executed.
- No fresh real paid AI/Provider calls.

## Important open G4 gates

- **Original application identity:** `app.recipio.local` v23 is a different
  package from the preview. No original v23→G4 same-signature upgrade, original
  data/backup preservation or backup/restore migration was tested in this cloud
  build. Previous owned v21→v24 emulator preservation is historical, not this
  phone test.
- True Android IME first/second Back, cold/hot external Share Target, full
  connected suite, TalkBack real service/focus, reproducible performance baseline,
  actual native failure-path tests and destructive restore remain NOT_RUN unless
  specifically supported by later evidence.
- The preview runner debug key is not persistent. Installing a subsequent
  cloud-generated preview as an update may fail signing verification. Do not
  uninstall the main app or clear its data to work around this.
- No main merge/tag/deploy/release and **no overall G4 ACCEPTED/FROZEN**.

## Next decision

User's requested workflow is cloud code/build plus personal phone experience,
without running full validation on their Windows host. Prioritize a **durable,
secure signing/upgrade and protected-data transfer plan** before claiming an
upgradable final app. Perform any remaining cloud-hosted Android smoke on a
completely isolated synthetic-data emulator; never imply it protects or
migrates the original on-phone app.

Evidence source: user message in this conversation, not a source-code test.
