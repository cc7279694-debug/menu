# Search focus B1 — independent review evidence

## Review disposition and scope

The user reported that independent review of `533c82a` was BLOCKED on B1:
the keyboard focus indicator was only a subtle border. This follow-up keeps
the rounded touch-focus border and the removal of the input's rectangular
outline, and adds a 2px theme-colored, offset outline on the rounded container
for keyboard focus. It does not alter search, storage, signing, or the v27 APK.

The search control tracks local pointer versus keyboard interactions because
Chromium may match a touch-focused text input with `:focus-visible`. Pointer
focus keeps the 1px border; keyboard input restores the 2px ring. Composition
and unidentified key events are not treated as keyboard modality changes.
The clear button retains its own focus indicator. Forced-colors mode uses the
system `Highlight` color. For engines without `:has()`, a CSS fallback is
present; that fallback was reviewed in source but not run in such an engine.

## Fresh verification against the final source

- Isolated Chromium browser, 390 × 844, fresh synthetic preview data: Warm
  Ivory, Pure Glass and Soft Sage each passed. Before B1, keyboard focus had no
  outer outline; after B1 it had a 2px rounded outline with 2px offset. Touch
  focus had a subtly changed border without a rectangular inner outline.
- In all three themes, the browser checks exercised touch, typing, switching
  from touch to keyboard, Tab and Shift+Tab, the clear button and focus return,
  blur, home/library navigation and forced colors. `Highlight` color, clear
  button focus, geometry and console errors were checked. No network provider
  was called and no personal data was used.
- Vitest: 3 targeted files, 37 tests passed. TypeScript, lint and local Vite
  build passed; lint reported 5 existing warnings and the build reported its
  existing large-chunk warning. The mixed touch-to-keyboard regression was
  observed failing before the corresponding code change and passed afterward.
- The synthetic browser's touch emulation is not an Android IME, TalkBack,
  OEM, physical keyboard, or physical-phone test. Those remain **NOT_RUN**.
  Different IMEs and accessibility settings may dispatch different input events;
  the browser checks do not establish their real-device behavior.
- No APK was built or installed. The existing v27 APK SHA-256 remains
  `b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`.
  Any future update must use a versionCode above 27 and the existing personal
  signing identity; this task creates no new signing material.

## Screenshot evidence

Actual screenshots were generated separately from this text packet using the
same final source and an isolated browser with synthetic data. Each is a
390 × 844 PNG. Names and SHA-256 values are provided so the separately
delivered images can be matched to this record:

| Theme | Keyboard-focus screenshot | SHA-256 |
| --- | --- | --- |
| Warm Ivory | `after-warm-ivory-keyboard.png` | `2204695540e69a4eb1864df974f38999c4335ff723ef1f9fb73a47668edf8f36` |
| Pure Glass | `after-pure-glass-keyboard.png` | `cf87dd8237419cd46400336fbf907991e82f571a7c884fc7c5d063c03b3d5687` |
| Soft Sage | `after-soft-sage-keyboard.png` | `6f1f7b391d5905f27d4956c25357045a4fae2cfa2ce0f24d033016f0d4c89a98` |

Touch-focus and pre-B1 screenshots are retained separately for comparison.
The packet manifest identifies the committed source used for review; screenshots
must be checked against the hashes above rather than assumed to be in the text
packet. Independent review is pending; no product acceptance is claimed.
