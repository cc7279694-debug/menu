# Search focus visual fix — awaiting independent review

## Scope

The Xiaomi 14 report describes a dark rectangular outline inside the rounded
search field when focused. The input inherited the global `:focus-visible`
outline. Only `src/native/ui-v2/layout.css` is changed: the search container
uses its theme's existing focus token for its 1px border on `:focus-within`; the
inner search input suppresses its own focus-visible outline; forced-colors mode
adds a 2px system `Highlight` outline to the rounded container. The global focus
rule and search logic are unchanged. Other controls, including the clear button,
retain their original keyboard focus outline.

```diff
+ .recipio-ui-v2 .v2-search:focus-within { border-color: var(--v2-focus); }
+ .recipio-ui-v2 .v2-search input:focus-visible { outline: none; }
+ @media (forced-colors: active) {
+   .recipio-ui-v2 .v2-search:focus-within { outline: 2px solid Highlight; outline-offset: 2px; }
+ }
```

## Fresh verification

- Real Chromium, fresh isolated browser contexts with an empty local preview
  database, viewport 390 × 844: warm ivory, pure glass and soft sage all passed.
  Before the fix, the inner input had a solid 2px outline; afterwards it had
  `outline-style: none` and the existing rounded outer border changed to the
  current theme focus color. The container's position, 350 × 52 size and 18px
  corner radius were identical before and after in all themes.
- Click/focus, type, keyboard Tab and Shift+Tab, the clear button and focus
  return, blur without clearing, navigation between home and library, and
  forced-colors outline passed in all themes. No page or console errors were
  reported. Six actual before/after screenshots are kept separately as local
  review evidence, not included in this text packet.
- Existing targeted Vitest suites passed: 3 files / 36 tests. JSDOM emitted its
  existing `window.scrollTo` not-implemented messages. TypeScript and lint passed
  (0 errors, 5 existing warnings); local Vite build passed.
- This was browser evidence, not an Android IME or Xiaomi-device test. Android
  system Back/keyboard dismissal, TalkBack and physical phone are NOT_RUN.
- The accepted v27 APK and personal signing material were not changed. No APK
  was built or installed for this fix. Any later update must use versionCode
  greater than 27 and the existing personal signing identity.

## Decision boundary

The change awaits ChatGPT independent review; no product acceptance, main merge,
release, phone operation, or later module is implied by this checkpoint.
