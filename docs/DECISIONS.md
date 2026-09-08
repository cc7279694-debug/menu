# Decisions

## 2026-09-08 — Local-only runtime before cloud retirement

### Decision

Make device-local storage the source of truth for the new browser/PWA/Android runtime. Keep Supabase/Vercel as a rollback version during migration.

### Context

The user prioritizes fast domestic access, offline use and no VPN dependency. Existing data is small and does not need migration or multi-device sync.

### Alternatives

Keep Supabase as the primary source with a larger cache; build a separate Android client; or gradually introduce a shared local Repository layer.

### Reason

The Repository layer allows browser IndexedDB and Android SQLite to share business logic without duplicating the product, while avoiding a premature distributed sync system.

### Consequences

The migration temporarily carries both legacy cloud and local paths. AI remains online-only, and local backups become the recovery mechanism.

## 2026-09-08 — Basic link import and nutrition first

### Decision

Keep basic link/image import and post-import nutrition analysis in scope, but defer advanced link compatibility and nutrition precision/UI refinement.

### Context

These capabilities are valuable but are not required for the core offline recipe experience.

### Reason

Separating the core local data path from optional AI prevents an AI outage from blocking cooking and recipe editing.

### Consequences

The first local version must show clear AI-unavailable states and allow manual editing/saving without AI results.
