# Current State

## Current Stage

Local-only migration, foundation slice.

## Completed

- Existing Next.js/Supabase/Vercel recipe app is on `feat/recipe-app-pwa-deepening`.
- Existing IndexedDB cache, offline shell, recipe drafts and cooking-session persistence are present.
- Architecture audit confirmed Supabase still owns primary data and server actions.
- Local-only architecture, roadmap, decisions and audit plan are recorded in the repository.
- A typed Dexie-backed `RecipeRepository` and version 4 local recipe store are implemented and tested.

## In Progress

- Preparing the local recipe list/detail vertical slice to consume the repository boundary.

## Pending

- Local recipe UI wiring.
- Local media, plan, shopping, cooking history and backup/restore.
- Vite/Capacitor/SQLite runtime.
- AI direct-call boundary and final removal of cloud runtime dependencies.

## Current Problems

- Normal pages still require Auth/Supabase.
- Local cache is partial and keyed by authenticated user IDs.
- Images remain in Supabase Storage.
- AI import and nutrition analysis use server-only API routes.

## Technical Debt

- Next.js route and Server Action boundaries must be extracted before the Vite cutover.
- Browser IndexedDB and Android SQLite need shared contract tests.

## Current Branch / Module

`feat/recipe-app-pwa-deepening` / Module 1 complete; Module 2 is next.

## Next Recommended Task

Finish and verify the Dexie recipe repository, then wire one recipe list/detail path behind the repository without removing the legacy cloud path.
