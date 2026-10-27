# Theme refresh ledger

Plan: `../superpowers/plans/2026-10-23-ui-v2-theme-refresh.md`.
Start: `c956e59bc791ed1ea728f2af4092c19e38902eca`; clean local/remote feature and stable main freshly verified.

Task1: implemented. RED: 11 new theme tests failed against G1 (20 existing passed). Material Sheet and safe-confirmation focus each had a separate RED test. Latest targeted GREEN: 33/33 (13 new +20 existing).

Task2: implemented and browser-inspected. Shared appearance context, frozen theme tokens, Portal propagation, CSS glass, scrolling control overlays and measured bottom clearance are in place. Material comparison uses existing local demo photos only. Cooking photo frame is bounded at50dvh/420px after the overlap test caught the earlier frame stopping at the glass edge.

Task3: final verification/evidence/review complete. Delivery identity is the focused feature commit containing THEME_REFRESH_CHECKPOINT; final Git read-back is reported alongside that commit. Whole195 files/1062 PASS; native71/474 PASS (subset); original41×3 browser and additional71 PASS; typecheck/lint/local build/isolation/expected DEV-build rejection PASS. Nine main screens and27 selected actual PNGs total preserved separately from G1. No G2 wiring, production data access, Android build or real AI calls.

Browser repairs: explicit minmax grid track fixes real narrow overflow; open-Portal pause now includes small detail photo controls. Portal geometry no longer subtracts background footer. Native autoFocus on the safe cancel button stole Base UI's previous-focus capture; replaced with the library's initialFocus ref after a failing regression. No custom focus trap or delay. The first full run (1061 tests) predates this final repair and is NOT final delivery evidence; the fresh complete run passes1062. Engineering reviewer found no remaining Critical/Important; its provenance Minor was repaired with actual input-file fingerprints. User/ChatGPT visual acceptance remains pending.

Preflight: the same appearance context is consumed by root, nested cooking and every Base UI portal; theme is deliberately absent from all React keys. CSS material/layout work consumes those attributes. Browser tests use frozen literal values, not mirrored app constants.

Rulings: user-supplied frozen design/implementation brief avoids a redundant interview; use CSS glass without a new library; preserve this durable Windows ledger. Scope/costs are in the plan. Inline completion marker has precedence over the attachment's alternate spelling.
