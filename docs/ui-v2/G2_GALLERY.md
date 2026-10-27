# G2 — real core UI, controlled local data

Actual390×844 browser captures. Unlike G1, these are the production core
components reading/writing the real PreviewRecipeLibrary and media service in a
fresh ephemeral browser context. The labelled geometric image is a non-private
local media fixture, not a food photo, G1 asset, or shipped fallback. No sample
recipes are installed by the application.

| Screen | Actual G2 capture | Accepted G1 reference / intentional difference |
| --- | --- | --- |
| Home | [home](evidence/g2/home-390.png) | [G1](evidence/final-polish/after/warm-ivory/home-390.png); no sample toolbar; actual bounded records and local image |
| Library | [library](evidence/g2/library-390.png), [search](evidence/g2/search-390.png) | Existing real100/offset pagination and duration select preserved |
| Detail | [detail](evidence/g2/detail-390.png) | [G1](evidence/final-polish/after/warm-ivory/detail-390.png); same4:3/hierarchy, real fields/full steps/history; document scroll |
| Focus | [focus](evidence/g2/focus-390.png) | Read-only real step, never creates a cooking record |
| Guided | [cooking](evidence/g2/cooking-390.png) | [G1](evidence/final-polish/after/warm-ivory/cooking-390.png); same deep solid controls, actual current step/media |
| Editor | [editor](evidence/g2/editor-390.png) | Existing field/value/save/dirty owners, scoped Warm Ivory styling |
| Completion | [completion](evidence/g2/completion-390.png) | Created only by explicit completion; every extra remains optional |
| Cooking History | [history](evidence/g2/history-390.png) | Real record and original pagination/delete semantics |
| Change History | [changes](evidence/g2/changes-390.png) | Actual before/after summary, not version switching |

## Edge states / overlays

[Empty](evidence/g2/empty-390.png) · [long name only/no cover](evidence/g2/name-only-390.png)
· [Add sheet](evidence/g2/add-sheet-390.png)
· [read-only ingredients](evidence/g2/ingredients-sheet-390.png)
· [solid material](evidence/g2/solid-home-390.png).

320px/200% text: [Home](evidence/g2/home-320-200.png),
[Detail end](evidence/g2/detail-320-200.png),
[Editor](evidence/g2/editor-320-200.png),
[Cooking](evidence/g2/cooking-320-200.png).

The shared G1 showcase was rerun unchanged for all three themes:41 checks each.
These checks prove extraction did not break its existing flows, not that G2 is
visually accepted or that production now offers theme switching.

Preview: `npm run dev:local -- --host 127.0.0.1 --port 5184 --strictPort`.
Open http://127.0.0.1:5184/ in a normal browser. A new origin starts empty and
does not read the user's old5173 data or G1 memory-only fixtures. Add a local
test recipe to experience the core pages. G1 remains at5182/ui-v2-showcase/.

See [verification](G2_VERIFICATION.md) and [browser results](evidence/g2/browser-results.json).
No Android/IME/phone acceptance is claimed by this gallery.
