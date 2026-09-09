# Current State

## Current Stage

Local-only migration, browser recipe vertical slice.

## Completed

- Existing Next.js/Supabase/Vercel recipe app is on `feat/recipe-app-pwa-deepening`.
- Existing IndexedDB cache, offline shell, recipe drafts and cooking-session persistence are present.
- Architecture audit confirmed Supabase still owns primary data and server actions.
- Local-only architecture, roadmap, decisions and audit plan are recorded in the repository.
- A typed Dexie-backed `RecipeRepository` and version 4 local recipe store are implemented and tested.
- `/offline/app` can now list, open, create and edit device-local recipes through the repository boundary without requiring a Supabase profile.
- The existing authenticated Supabase route and legacy offline snapshot cache remain available as transition fallbacks.
- First-use empty state exposes local recipe creation, and legacy-only recipes preserve favorite/source metadata when promoted locally.

## In Progress

- Preparing the local media index so recipe images can follow the same device-owned architecture.

## Pending

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

`feat/recipe-app-pwa-deepening` / Modules 1–2 complete; Module 3 is next.

## Next Recommended Task

Implement the local media index and browser storage tests without making image failures block recipe text.
