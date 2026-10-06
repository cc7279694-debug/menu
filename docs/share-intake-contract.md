# APK-5C-A Android Share Text / Images

## Frozen scope

Baseline main `7205a3c56fa39d95268146a2e5fa3efd72d3418c` / `v0.7.0-share-target`; feature `feat/recipio-share-intake`; versionCode15 / `0.8.0-share-intake`. SQLite4 / Preview7 / Backup2 unchanged. No new dependency, migration or permission; no video, HTML, VIEW, social-platform special case or automatic online action.

## Input and routing

- SEND exact text/plain: EXTRA_TEXT, or one ClipData item with an explicit CharSequence text. No HTML read, conversion or coerceToText.
- Exactly one unique HTTP(S) URL retains APK-5B Link Import, including title+URL and identical repeats. Optional bounded companionText stays only in memory.
- No URL: preserve all Chinese/newlines/Emoji as AI input. Multiple different URLs: invalid multiple_links with explicit text/manual-link/ignore choices; never select first.
- Text maximum32KiB UTF-8; AI text maximum30,000 codepoints, no truncation. Invalid inputs return only allowlisted safe reasons.
- SEND image/* / SEND_MULTIPLE image/*: EXTRA_STREAM first, ClipData URI fallback. Exact URI dedup preserves first occurrence;1–6 images;7 unique rejected as a whole. Optional EXTRA_TEXT does not change image routing even with URLs.
- Only external content URIs with transient read grants; reject own FileProvider, including user-qualified authorities. No broad storage permission, persistent grant or URI handed to JS.

## Receipts and lifecycle

Strict union: empty / url{id,url,companionText?,replaced} / text{id,text,replaced} / media{id,imageCount,text?,replaced} / invalid{id,reason,text?,replaced}; invalid text is permitted only for multiple_links. UUIDs are opaque ownership handles, not file paths.

Process-memory one pending slot. Processing media is not consumable until staged. Native retains leased media after consume; replacement and Ignore call releaseShare. Activity recreation reclaims only the latest owned, not-yet-transferred receipt; scrubbed launch Intent does not replay. An old destroyed Bridge cannot consume the new Activity's receipt. Process death may lose unhandled inputs; next startup retires any verified orphan reader before bounded marked-cache cleanup.

Safe home/library/settings/detail/changes/history auto-prefill without network. Dirty editor/completion, AI input/images/request/Preview, occupied Link input/fetch/result, restore preview/busy/uncertain, Focus/Guided, modal and write lock defer. Empty AI may accept; empty Link auto-accepts URL only. Async opening rechecks current mounted owner and latest receipt before applying.

Banners expose only hostname/type/count and safe reasons; never full text/query/URI/path. JS and native failed-release ownership stays actionable for retry, including final-pin deletion failures. Unknown/unmarked files are not broadly removed.

## Share → existing AI

Native stage private controlled JPEG → fresh existing AI operation → transferShareImagesToAi → existing AiTemporaryImage metadata. No share-cache paths cross Bridge. All images succeed before state is applied; partial failure discards only the fresh AI operation. Source staging is removed only after full transfer succeeds. It then uses normal remove/move/Picker/edit/IME/Preview gate/Cancel/temp cleanup.

prepareSharedInput never calls organize. Only user Start may send one Provider request. No automatic fetch/parser/AI/Preview/save/overwrite. Sources, raw Intent, AI raw response and screenshots are never permanent Recipe media or Backup content; user-confirmed ordinary Recipe fields use RecipeLibrary.createDetails.

## Verification boundary

Generated fixtures and Fake Provider only, real paid AI0. JS/SQLite JVM checks do not substitute Android ContentResolver, real WebView/IME, OEM Share Sheet or coverage-upgrade/offline validation. Actual result and any unrun check live in verification/share-intake*.md and the checkpoint.
