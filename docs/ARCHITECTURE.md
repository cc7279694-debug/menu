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
