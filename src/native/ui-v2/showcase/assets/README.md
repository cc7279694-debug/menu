# G1 showcase demonstration food images

These four AI-generated photographs are demonstration assets for RECIPIO's isolated G1 visual showcase only. They are not photographs of a real recipe, evidence of cooking outcomes, user media, or production recipe/library data. They must not be imported into the user's recipe library or used to overwrite existing recipe images. No logo or concept-screen crop was used.

## Provenance and processing

- Created on 2026-10-23 with Codex's built-in `image_gen` tool in default built-in mode, using independent calls. Each cover was selected from one generation; the step photo used two candidates, selecting the second for clearer chicken wing anatomy.
- No reference images, Qwen calls, CLI/API fallback, or API credentials were used.
- Each selected original was visually inspected: the three covers show one food bowl on an ivory tabletop; the step image shows cola pouring into browned chicken wing flats in a dark skillet. No typography, watermark, UI, people, or decorative props are visible.
- Original images were 1448 × 1086 PNG (4:3). Existing project Sharp resized each full image proportionally to 1000 × 750 and encoded WebP at quality 85, without cropping or compositing.
- Final filenames: `cola-wings.webp`, `tomato-egg-soup.webp`, `broccoli.webp`, `cola-step.webp`.
- `cola-step.webp` is purpose-specific demonstration media for the cola-pouring step (step 3 / index 2). It is not the finished-dish cover reused as step evidence.
- These are synthetic visual examples; ingredients, portions, and preparation correctness are not validated recipe information.

## Generation prompts

### cola-wings.webp

```text
Use case: photorealistic-natural
Asset type: standalone landscape food photograph for an isolated recipe app visual demonstration; image only, not an app screen.
Primary request: glossy Chinese cola chicken wings in a quiet ivory ceramic bowl.
Scene/backdrop: a plain warm ivory tabletop, uncluttered and understated, no props.
Subject: a generous modest serving of chicken mid-joint wings coated with rich natural dark caramel-brown cola glaze, light scattering of sesame seeds and finely sliced fresh scallion. Believable irregular chicken skin texture and appetizing natural sheen.
Style/medium: photorealistic refined cooking magazine editorial food photography, realistic food, restrained styling.
Composition/framing: one bowl, three-quarter close-up view from slightly above, centered subject with a little clean breathing room around the bowl; landscape 4:3 composition.
Lighting/mood: warm soft window daylight from the upper left, gentle shadows, natural color balance.
Constraints: generate one independent original photograph; no collage, no screenshot, no UI, no text, no typography, no logo, no watermark, no hands, no people, no utensils, no decorative clutter, no reference images; opaque background.
```

### tomato-egg-soup.webp

```text
Use case: photorealistic-natural
Asset type: standalone landscape food photograph for an isolated recipe app visual demonstration; image only, not an app screen.
Primary request: Chinese tomato and egg soup in a quiet pale ivory ceramic bowl.
Scene/backdrop: plain warm ivory tabletop, uncluttered and understated, no props.
Subject: homemade tomato and egg soup with soft red tomato wedges, delicate yellow and white egg ribbons floating naturally in translucent warm broth, a few tiny sliced scallion accents. Realistic light oil droplets and tender food textures, an ordinary believable serving.
Style/medium: photorealistic refined cooking magazine editorial food photography, restrained natural styling.
Composition/framing: one bowl, three-quarter close-up view from slightly above, centered subject with a little clean breathing room around the bowl; landscape 4:3 composition.
Lighting/mood: warm soft window daylight from the upper left, gentle shadows, natural color balance.
Constraints: generate one independent original photograph; no collage, no screenshot, no UI, no text, no typography, no logo, no watermark, no hands, no people, no utensils, no decorative clutter, no reference images; opaque background.
```

### broccoli.webp

```text
Use case: photorealistic-natural
Asset type: standalone landscape food photograph for an isolated recipe app visual demonstration; image only, not an app screen.
Primary request: simple Chinese garlic broccoli in a quiet pale ivory ceramic bowl.
Scene/backdrop: plain warm ivory tabletop, uncluttered and understated, no props.
Subject: vibrant naturally green cooked broccoli florets with small minced and thin-sliced garlic pieces, a restrained clear savory glaze with a subtle sheen, believable varied florets and tender crisp stalks, ordinary modest homemade serving.
Style/medium: photorealistic refined cooking magazine editorial food photography, restrained natural styling.
Composition/framing: one bowl, three-quarter close-up view from slightly above, centered subject with a little clean breathing room around the bowl; landscape 4:3 composition.
Lighting/mood: warm soft window daylight from the upper left, gentle shadows, natural color balance.
Constraints: generate one independent original photograph; no collage, no screenshot, no UI, no text, no typography, no logo, no watermark, no hands, no people, no utensils, no decorative clutter, no reference images; opaque background.
```

### cola-step.webp (selected second candidate)

```text
Use case: photorealistic-natural
Asset type: standalone realistic cooking-step photograph for an isolated recipe app visual demonstration; image only, not an app screen.
Primary request: cola being poured from an unlabeled small plain glass jug into browned chicken WING FLATS in a dark skillet. Accurate ingredient anatomy is essential.
Scene/backdrop: uncluttered warm home kitchen cooking surface, tightly framed around the skillet.
Subject: six to eight small elongated chicken mid-joint wing flats, clearly recognizable as narrow oval two-bone chicken wing sections with taut wrinkled skin, browned on both sides. They are NOT chicken thighs, breasts, boneless meat chunks, or drumsticks. A visible continuous stream of dark cola pours from the spout of a small transparent plain glass jug at the upper edge into the pan. Plausible initial bubbling as cola reaches the hot pan, visibly unfinished cooking process rather than a plated finished dish. The jug's handle and support remain outside the frame so no hand or person is visible.
Style/medium: photorealistic cooking magazine editorial process photography, natural believable textures, restrained realistic styling.
Composition/framing: three-quarter close-up from slightly above, six to eight identifiable whole wing flats in the main skillet and pouring stream clearly visible; landscape 4:3 composition.
Lighting/mood: natural warm kitchen window light, gentle shadows and natural color balance.
Constraints: one independent original photograph; no collage, no UI, no screenshot, no visible hands or people, no lettering, no text, no brands, no labels, no logos, no watermark, no decorative clutter, no reference images; opaque background.
```
