# Architecture

## Current transition state

Next.js App Router renders the application. Supabase Auth, Postgres, Storage and Server Actions currently provide the primary data path. Dexie/IndexedDB caches selected recipes, drafts, shopping state and cooking sessions.

## Target local state

```text
React UI
  -> Application services
  -> Repository interfaces
       -> IndexedDB/Dexie (browser/PWA)
       -> SQLite + filesystem (Android)
  -> Optional AI adapter (Qwen 3.8 Flash)
```

## Ownership

- Local database: recipes, plans, shopping, cooking history, settings and import drafts.
- Local media index: original images, thumbnails, MIME type, byte size and local path/blob key.
- AI service: optional, online-only, never the source of truth for saved records.
- Supabase/Vercel: transition fallback and rollback deployment only until local acceptance.

## Transition rule

New UI code must depend on Repository interfaces rather than importing Supabase clients directly. The legacy adapter remains available until the local vertical slice is accepted.

## Implemented browser slice

- `/offline/app` is the current feature boundary for device-local recipe list, detail, create and edit flows.
- The local recipe service maps shared editor input to the Dexie repository and adapts records to the existing offline UI.
- Authenticated `/recipes` pages still use the legacy Supabase path during the transition.
- If the local repository is empty or unavailable, compatible legacy snapshots remain readable; promoting a legacy recipe preserves favorite and source metadata.
- Local media is intentionally deferred to the next module, so unavailable images degrade to placeholders without blocking recipe text.
