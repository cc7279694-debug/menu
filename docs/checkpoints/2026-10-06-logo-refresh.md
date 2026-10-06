# RECIPIO Logo Refresh — 2026-10-06

Status: `RECIPIO_LOGO_REFRESH_PENDING_DEVICE_TEST`.
Scope: approved visual assets only; no product development.
Branch: `feat/recipio-logo-refresh`, from stable main
`8b2246dbfac674aa837cb25675893fbbef2d79c5` / `v0.8.0-share-intake`.

## Actual changes

- Exact approved 1254 × 1254 PNG preserved in `assets/brand/recipio-logo-source.png`;
  SHA-256 `a6fc20eaba83264f3586339d7f662f16ab59909ec5721d86e63c0e9a159a50e2`.
- Native header/favicon image replaced without any React, layout or navigation edit.
- All five Android density families regenerated: normal, round, adaptive foreground.
- Adaptive background warm ivory; existing adaptive/Manifest references retained.
  Old unused robot/cyan-grid template drawables replaced by same-brand aliases.
- Eleven existing splash images replace the blue Capacitor template; canvas sizes
  unchanged. Existing legacy Web/PWA/touch/favicon branding also replaced.
- Added reproducible conversion/check tooling, non-destructive emulator smoke,
  asset documentation and this checkpoint. No dependency added or upgraded.

Master and derived square icons remain 1:1. No AI generation/editing, redraw,
sharpening, recoloring, isolated symbol enlargement or new decorative effects.
Dark-symbol radius 28.1934dp fits within the conservative 33dp adaptive safe radius.
Original/round/rounded-square/squircle simulation visually inspected: symbol intact,
no conspicuous small nested adaptive panel. Simulation is not device evidence.
No old branding remains in the enumerated active resources; OEM launcher caches
and actual recents appearance remain to be checked on the user's phone.

## Fresh verification of this implementation

| Check | Actual result |
| --- | --- |
| Source + 32 derived asset consistency / dimensions / safe-zone / references | PASS |
| Node syntax / targeted ESLint for both new tools | PASS |
| TypeScript `npm.cmd run typecheck` | PASS |
| `npm.cmd run build:local` | PASS |
| `npm.cmd run sync:android` | PASS after sequential rerun |
| Android `:app:lintDebug :app:assembleDebug` | PASS, 208 tasks, 60 executed, 148 up-to-date, 1m35s |
| Android lint | 0 errors, 38 warnings; not claimed warning-free |
| APK package/version/launcher XML | PASS via SDK aapt2 |
| Debug APK signature and compatibility with v15 certificate | PASS; APK Signature Scheme v2 |
| Packaged header + 15 launcher + 11 splash PNGs | 27/27 byte-equal to current source resources |
| Executable packaging comparison with v15 | Only resource-class `classes8.dex` differs; other 20 JS/CSS/DEX entries byte-equal |
| Business/Native/Manifest/dependency/config diff | No changes |
| New changed text credential-shaped scan | 0 findings |
| Full 998 / 144 / 89 suites and real AI | Not Run, explicitly outside this visual-only task; AI calls0 |

The first overlapping Web build/sync attempt failed with an output-directory
EPERM. Root cause was two builds writing `dist-native`; serialized sync passed.
No application/config changes were needed. Local build retains a >500KB chunk
warning. Android lint includes icon duplication/opaque launcher warnings because
the same complete approved image is preserved; no monochrome redesign is added.

## Actual Android evidence — partial, not a full PASS

Only dedicated `Recipio_Backup_36` / Android36 / emulator5580 was operated.
The independently running Mirra5582 was not stopped or controlled.

The installed v15 was checked first; v16 installed with `adb install -r`.
The installed APK hash exactly matched the delivered v16. The following
automated assertions actually passed in the Android WebView:

1. Existing eight-table/image baseline obtained without writes or key access.
2. v15 → v16 covering installation succeeded with matching package/APK hash.
3. All row values/IDs/timestamps/order and referenced image bytes unchanged;
   SQLite user_version4, integrity_check ok, foreign_key_check empty.
4. Cold launch and home DOM reachable; header loads the exact new PNG at unchanged
   CSS40 × 40 with natural192 × 192, verified with SHA-256.
5. Existing generated local recipe opened; subsequent data/image snapshot equal.

The complete smoke did **not** pass: Android System UI showed
`System UI isn't responding`, with host free memory below600MB while both AVDs
ran. Launcher label assertion then failed; the captured screen was still Home,
not the app drawer. Home/detail screenshots also contain that System UI overlay.
They are **not** represented as unobstructed manual visual PASS.

Actual Launcher ordinary/round mask and recents visual acceptance: **Not verified**.
Final second-cold-start assertion: **Not Run**, reached after the failed stage.
No successful `android-smoke.json` was fabricated. Ignored
`artifacts/logo-refresh/android-smoke-failure.json` preserves five completed
checks. Screenshot evidence is retained locally in the same ignored folder.
Only this run's owned AVD was then normally shut down, without wipe/uninstall;
Mirra remained running. No networking/VPN configuration was changed.

The smoke tool's display override selection was separately corrected after a
failing reproduction; override540 × 1200 takes priority over physical1080 × 2400.
Override/no-override checks, syntax and ESLint passed. This is test tooling only.

## Immutable deliverable

- APK: `E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-logo-refresh-v16-debug.apk`
- Bytes: **17,213,126**
- SHA-256: `cf68b073e6fb96cda52df4d328f7d7b6c429e3204af477907175344338bdf20f`
- Package: `app.recipio.local`
- versionCode: **16**; versionName: **0.8.1-logo-refresh**
- Debug signing certificate SHA-256:
  `29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9`
- Earlier v15/v14/v13 APKs were preserved; no delivery path was overwritten.

Only resource/version metadata differ; no Recipe, AI, WebImport, Share Target,
SQLite, Backup, Preview, security or network implementation changed. Frozen
SQLite4 / Backup2 / Preview7 are retained. No real AI, deployment, main merge,
new release tag or next-module work occurred.

## Stop / next

Normal focused feature commit/push only. Final commit/remote equality and clean
status are reported after commit, avoiding a self-referential documentation SHA.
Stable main must remain8b2246d. User phone acceptance must verify cover installation,
retained recipes, header logo, desktop icon, round/OEM adaptive masks and recents.
Do not promote main or start another module without separate approval.
