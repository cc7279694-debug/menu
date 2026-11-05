# V29-R3-A1 — scope and fixed inputs

2026-11-05, authorized candidate preparation, not phone/release acceptance.

## Goal

Package accepted R3 into original-package V29 and prepare same-key owner signing;
if the owner completes the private step, run isolated synthetic V28→V29 upgrade
when the4GiB memory gate and explicit RECIPIO device ownership permit it.

## Baseline

Branch `integration/recipio-v29-r3-a1` starts at fixed R3 evidence1298517, whose
product files equal accepted sourcebc045ad. It inherits V28 sourcecf806554 and
accepted R2; no moving branch replaces the accepted inputs. R3 registration is
3998147dcd5d68f8284a6529a2f0660e69d30e6b, documentation only.

- Package `app.recipio.local`, code29, name`0.11.2-personal.1`.
- Signed V28 bytes15,194,675 / SHA-256
  `52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b`.
- Required existing V27/V28 certificate SHA-256
  `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
- N2 source51a2d92 is not an ancestor; its segmentation classes are absent.
  N2 remains PAUSED_BY_USER, original worktree/evidence unchanged.

## Allowed changes and verification

Only version defaults, task-specific non-sensitive signing/preflight helpers and
evidence/docs. Product code remains accepted R3. Build Web resources with
`VITE_RECIPIO_VERSION=0.11.2-personal.1`; verify actual packaged display version,
package/version, unsigned state, isolation, permissions, CRC and payload bytes.
Run necessary integrated link/review/storage/theme/backup tests, typecheck/lint,
pure JVM safety tests, versioned Web build/sync and bounded release compilation.

Use official Android tools. An existing-key-only helper may prompt once in a
private masked local window; no Codex capture of input, no new identity, no key
read/copy by Codex, no password in args/env/files/logs. Output conflicts stop.
Without owner completion: OWNER_SIGNING_REQUIRED; unsigned APK is not an
installable deliverable and upgrade/device items stay NOT_RUN.

## Non-goals and stop

No real XHS requests (budget exhausted), real AI, production DoH, Cookie/login,
private APIs/bypass, security relaxation, phone/private data/backup operations,
V28 modification, key generation, main merge, release or N2 resumption.
SQLite4/Preview7/Backup2 and identity/data/AI contracts remain unchanged.

Stop with fixed source/evidence, candidate metadata and owner Xiaomi checklist
for ChatGPT review. No phone success is implied by PC/synthetic evidence.
