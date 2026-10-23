# UI V2 — scope map / G0

Authority: approved specification + execution file, not the older pasted brainstorming prompt. Concept A is locked. Only G0/G1 are authorized.

## Verified repository state

- Remote main and tree freshly match `649804a8209413f9d682f1079a4fd19ea84cd064` / `2d1993bcab8dbb59c540b8225d51259562ad0316`.
- Source checkout remains clean on `exp/recipio-video-visual-p1`; independent sibling worktree `recipe-step-app-ui-v2` starts from stable main, not from its experiment descendants.
- New feature: `feat/recipio-ui-v2-glass-minimal`. No unknown local/remote target branch existed.
- Reference hash matches `44c053738390829a7c805512600a026136089da445abaa1a26f45a033e0d05f4`.
- Existing CURRENT_STATE/ROADMAP describe an older Logo-pending point. They are historical evidence, not current remote state. No previous NOT_RUN is promoted to PASS.
- Applicable user AGENTS instructions govern; no additional on-disk AGENTS exists in the source tree/ancestors inspected.

## Owners, callbacks, states (paths under src/native)

| ID | Current owner / source | Actions and state that must be preserved | G1 |
| --- | --- | --- | --- |
| P01 Home | library-app.tsx, RecipeLibrary.list/getDetails | local search, create-time order, loading/empty/no-match/error, explicit openFinder | isolated exemplar |
| P02 Library | library-app.tsx | all/short/medium/long, pagination, query/filter/scroll restore | navigation/search fixture only |
| P03 Detail | recipe-detail.tsx + CookingOverview | edit/back/remove/focus/guided/complete callbacks; complete full steps; null fields valid | isolated exemplar |
| P04 Focus/Guided | step-viewer.tsx, recipe-step-content.tsx | Focus selected step, Guided index0, previous/next read-only, explicit final completion; busy/error | isolated exemplar |
| P05 Editor | recipe-editor.tsx / recipeDetailsSchema | name-only valid, media cancel, dirty leave, save failure/uncertain, step-tip reorder | deferred G2 |
| P06 AI Input | ai/intake-screen.tsx / AiIntakeService | explicit request, key/image/request busy, cancel/discard, cleanup retry | deferred G3 |
| P07 Review | ai/preview.tsx, review-panel.tsx, save-recovery.tsx | shared editor, review gate, duplicate-title confirmation, original UUID uncertain lookup | deferred G3 |
| P08 Link | link-import/screen.tsx / service.ts | input/reading/parser choices/ready/AI/preview/saving/uncertain/error; explicit fallback | deferred G3 |
| P09 Finder | find-recipe/screen.tsx / service.ts | searching/results/extracting/review/uncertain; independent paid actions, source contract | deferred G3 |
| P10 Cooking | cooking-completion.tsx, cooking-history.tsx | explicit recordCooking UUID; optional extras, retry, summary,20-entry cursor | deferred G2 |
| P11 Changes | recipe-change-history.tsx / summary | read-only previous/new values,20-entry cursor, loading/empty/error | deferred G2 |
| P12 Settings | library-app.tsx, backup/backup-controls.tsx, ai/ai-settings.tsx | SAF/replace/uncertain; native-only key input, real version | navigation placeholder explicitly labelled only |
| O01 Add | library-app.tsx Dialog | manual / text-images / link / finder; navigation only, no automatic fetch | Base UI Sheet showcase |
| O02 More | currently direct detail buttons, no production More menu | edit/record/history/delete kept as callbacks, not new services | display-only action explanation |
| O03 Discard | editor/completion confirm; AI/link/Finder dialogs differ | preserve input, respect request cancel/generation; no generic semantic replacement | safe Dialog component state |
| O04 Danger | record delete/native-key/backup confirmations | current recipe delete is reversible immediately; not same as irreversible delete | component state only |
| O05 Undo | library-app.tsx + RecipeLibrary.remove/undo/purgeExpired | original5s deadline, cleanup warnings, no renewed window | static state example, no invented timer |

Share controller/pending banner, route locks, native IME first-Back, restoring and uncertain gates stay untouched. G1 does not initialize NativeApp, PreviewRecipeLibrary, IndexedDB, native plugins or Provider services.

## Locked vs adjustable

Locked: approved Logo, actual RecipeDetails fields, SQLite4/Preview7/Backup2, optional Guided, explicit cooking completion, three root destinations, no new functionality.

Adjustable within spec: spacing, optical alignment, CSS fallback and responsive wrapping. G1 tokens/components are candidates, not a production-default system or user-accepted final UI.

## Intentional poster corrections

Three tabs, not five. Recently added, not recently viewed. No global recent-cooking aggregation, rating slogans, notification, favorites, tags, scaling, timers, checkable ingredients, video, fake statistics or marketing poster frame. Deep cooking text has a stable solid background, not text on a busy food photo.

User approved generating demo food images after the initial no-photo asset audit. Four final images (three covers and one actual demonstration step) are used only by the isolated showcase. Original reference is documentation, never bundled as UI or sliced into food assets.

## Skill/application choices

Installed HR Product Design System + Product UI/UX Playbooks17–21 are reused, not installed as fictitious standalone skills. Existing Base UI/shadcn behavioral primitives, React rules, test-first inline execution and fresh final review are used. The approved spec overrides generic Skill defaults for new concepts, global styles, framework migration or extra features.

Native worktree creation was attempted but reports `Not a git repository` at this chat's parent cwd. Git fallback creates the explicitly approved branch/worktree at the verified repository. Node dependencies are an existing read-only-target junction; no package version or lockfile change.
