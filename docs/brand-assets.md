# Approved RECIPIO brand assets

## Source and permitted conversion

The user's final PNG is preserved byte-for-byte at `assets/brand/recipio-logo-source.png`.
Original attachment: `codex-clipboard-8ef56b02-6f29-400b-b8ab-9810b9c2e791.png`.
Source: 1254 × 1254 RGB PNG, 1,409,269 bytes.
SHA-256: `a6fc20eaba83264f3586339d7f662f16ab59909ec5721d86e63c0e9a159a50e2`.

No AI, redraw, color adjustment, sharpening, added shadows, isolated symbol scaling,
or source cropping is permitted. Every raster derives from uniform scaling of the
complete square image. Its existing gradient, rounded panel and shadow remain.
Header reference, 40 × 40 CSS size, typography and layout are unchanged.

## Reproduction and verification

Run from the repository root, using the existing installed Sharp dependency:

```powershell
node scripts/brand-assets.mjs --write --preview
node scripts/brand-assets.mjs --check
```

`--write` intentionally replaces only the enumerated brand assets. `--check` does
not write and checks all derived bytes, source hash, safe zone and references.
The optional ignored `artifacts/logo-refresh/mask-preview.png` is a mask simulation,
not evidence of an Android or physical phone test.

| Density | Launcher / round px | Adaptive foreground px |
| --- | ---: | ---: |
| mdpi | 48 | 108 |
| hdpi | 72 | 162 |
| xhdpi | 96 | 216 |
| xxhdpi | 144 | 324 |
| xxxhdpi | 192 | 432 |

All launcher and round PNGs remain complete square originals. Android applies the
round mask. Adaptive foreground uses the entire original on its 108dp canvas;
there is no additional padding or separate enlarged symbol. Dark symbol pixels
fit within radius 28.194dp of the center, inside the conservative 33dp circular
safe zone. The platform's 108dp layers and 66dp safe zone are described in the
[Android adaptive icon specification](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

Adaptive background `#FDFAF4` matches the rounded average of the source's four
corner pixels. Both existing adaptive XML files still point to the same foreground
mipmap and background color. Previously unused Android template vectors now
reference these assets instead of retaining a robot/cyan grid.

Other outputs: Native header/favicon 192px; legacy Web/PWA 192/512/maskable512;
Apple touch 180px; ICO 16/32/48/256 PNG frames. Eleven existing splash canvases keep
their original dimensions, with the complete square source centered on matching
ivory; only the previous blue Capacitor branding is replaced.

## Narrow Android smoke

`scripts/verify-logo-android.mjs` operates only on the existing generated-data
`Recipio_Backup_36` AVD, serial `emulator-5580`. It requires installed v15, uses
install-r, compares all eight tables and real image-reference hashes in memory,
and never clears data, changes networking, reads a key or calls AI. Successful
evidence cannot be overwritten; a failed run records only safe metadata and
completed checks. Read the checkpoint for this run's actual partial result.

```powershell
node scripts/verify-logo-android.mjs <absolute-adb.exe> emulator-5580 <absolute-v16.apk>
```

## Build identity

The existing Gradle version-property mechanism is used; default business/build
configuration is not rewritten:

```powershell
npm.cmd run typecheck
npm.cmd run build:local
npm.cmd run sync:android
.\android\gradlew.bat -p android :app:lintDebug :app:assembleDebug --offline --no-daemon --max-workers=1 --console=plain '-Dorg.gradle.jvmargs=-Xmx512m' '-PapkVersionCode=16' '-PapkVersionName=0.8.1-logo-refresh'
```

Run Web build and Capacitor sync sequentially: both rebuild `dist-native`.
Copy the result only to a new `artifacts/recipio-logo-refresh-v16-debug.apk` and
refuse an existing target. Never overwrite v15/v14/v13 delivery artifacts.

SQLite4 / Backup2 / Preview7, package `app.recipio.local`, all business behavior,
navigation, Native plugins and online/security boundaries remain unchanged.
