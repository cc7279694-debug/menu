# Official Android signing preparation — owner action required

The authorized base is main `19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe` and the isolated branch is `chore/recipio-official-signing`. This checkpoint does not authorize installation or claim a signed release. The earlier custom signing tool and branch remain untouched.

## Identity and upgrade boundary

- Archived v23 APK: `app.recipio.local`, version code 23, certificate SHA-256 `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`.
- `C:/Users/CDD/.android/debug.keystore` exists. The file metadata does not prove its usability or certificate identity. No private key content or password was read.
- Current phone version is unknown. Version 27 exceeds the known v23/v24 artifacts, but has not been compared with the actual installed version. Do not install or upgrade the user's phone.
- No new signing identity was created. The separate `.next` route remains undecided and unverified.

## Preparation and verification

- Android Studio official Windows ZIP (1,526,567,345 bytes) matched the published SHA-256 `6e83e7ce3e0a76c4e8e78d98eb5ef538cbc9fb386c745bda425fc0bacb9de6d4`. Extraction in `E:/CODEX/Tools/recipio-android-studio-2026.2.1.8-final` succeeded and `studio64.exe` Windows signature is valid. Two earlier interrupted extractions remain preserved and must not be launched.
- The dedicated SDK and JDK critical tool hashes were compared to existing sources. Release build installed SDK Build-Tools 35 into the dedicated SDK using a previously present license. Ignored `android/local.properties` selects this SDK.
- Studio bundles Java 25; ignored project-local `.gradle/config.properties` and `.idea/gradle.xml` select the tested JDK 21 via `GRADLE_LOCAL_JAVA_HOME`. Studio was launched with this Android project, but first-run setup, import, and actual IDE JDK selection remain NOT_CONFIRMED.
- Dependency installation, TypeScript and lint passed; lint reported five existing warnings. Final `sync:android` passed with `VITE_RECIPIO_VERSION=0.11.0-personal.2`; the version appears in the synced bundle. Production isolation passed: 324 modules inspected, zero showcase modules and named fixture assets.
- Six targeted synthetic-data test files passed, 230 tests. The full JS/TS run was interrupted due to memory and remains NOT_RUN. Historical G7 tests are not represented as new tests.
- `:app:assembleRelease` passed using JDK 21. The unsigned APK is `android/app/build/outputs/apk/release/app-release-unsigned.apk`, 15,145,012 bytes, SHA-256 `e07565397555df9cd95cdbc6c79a8b9c5075bc92ab4ca663b657232234b0df0e`. `aapt` reports `app.recipio.local`, code 27 and version `0.11.0-personal.2`. Debuggable and testOnly flags were absent from the APK manifest and no known fixture names matched. `apksigner verify` reported missing signature as expected. This unsigned APK is not installable and is not a final delivery.
- Actual Studio signing, signed APK metadata/certificate verification, device tests and same-certificate upgrade remain NOT_RUN.

## Next step

The owner completes any Studio first-run setup and project sync, verifies that the configured JDK is used, and selects an existing keystore privately in the official APK signing wizard. Do not create a new keystore or submit a password to chat. Stop the old-package route if the old identity is unavailable or the signed APK fingerprint mismatches; obtain the owner's separate decision before using a new identity. Verify package, installed-version relationship, certificate, version, APK hash and device tests before considering delivery. Do not operate the user's phone or data.
