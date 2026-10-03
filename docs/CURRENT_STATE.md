# Current State

## Current Stage

APK-0 Android local foundation implemented and emulator-verified; awaiting user acceptance.

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

- APK-0 user acceptance on a physical phone. No later module has been started.

## Pending

- APK-1 daily recipe library, APK-2 backup, APK-3 cooking records, APK-4 optional AI, APK-5 links/video.
- Physical-phone, OEM backup behavior and release-signing verification.

## Current Problems

- Normal pages still require Auth/Supabase.
- Local cache is partial and keyed by authenticated user IDs.
- Images remain in Supabase Storage.
- AI import and nutrition analysis use server-only API routes.

## Technical Debt

- Next.js route and Server Action boundaries must be extracted before the Vite cutover.
- Browser IndexedDB and Android SQLite need shared contract tests.

## Current Branch / Module

`feat/recipio-apk-0` / APK-0 complete on emulator; local commit only, no push or deployment. Previous Web entries above describe preserved legacy assets, not the native runtime.

## Next Recommended Task

Accept APK-0, then separately authorize APK-1. The superseded Web sequence is not the next task. See `docs/checkpoints/2026-10-03-apk-0.md` for current implementation, artifact and evidence.

## Native implementation / risks

- Bundled Vite/React, Capacitor Android, SQLite schema v1; name-only CRUD/details/search/pagination and five-second delete undo.
- Flight-mode cold launch, force-stop/reopen and versionCode 1 → 2 overwrite upgrade passed on Android emulator. Actual SQLite integrity checked.
- No INTERNET permission, no login or hosted runtime; automatic backup disabled and transfer exclusions configured.
- Debug APK only. Full backup is APK-2; uninstalling or clearing data loses local records.
- Dependency audit: 21 findings (6 moderate, 14 high, 1 critical), requiring a separate scoped review.
