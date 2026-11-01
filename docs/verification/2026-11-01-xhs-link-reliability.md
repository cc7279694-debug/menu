# Xiaohongshu link reliability — ready for independent review

## Frozen source and task boundary

Branch: `fix/recipio-xhs-link-reliability`.
Tested implementation: `87e3fa6cafa22876d0f5140c8166b9e92fb6d7ca`.
Base: `6c580bf0d00ff3162a965d53ce7835ca4484b27c`.
The following delivery commit only records documentation/evidence. It does not
alter the tested product or test code. Independent ChatGPT acceptance is pending.

Only public link reading, bounded text extraction, diagnostic categories and
completeness/fallback UI are changed. No APK, version bump, signing, phone,
database schema, backup, or personal-data operation was performed. The existing
untracked `android/.idea/` directory is preserved and excluded from the change.

## Confirmed causes and outcomes

- Legal platform domains and escaped sharing parameters already passed URL
  validation. Tests protect this; no domain allowlist or IP bypass was needed.
- Native DNS refusals previously shared one category; now benchmark/Fake-IP
  answers, other unsafe addresses, unsafe redirects, HTTP login responses and
  access refusals remain distinct safe errors. Every address is still checked,
  including mixed answers and IPv4-mapped forms; per-hop pinning/TLS is intact.
- The generic parser reads Recipe JSON-LD, while the text extractor removes
  scripts. That discarded publicly serialized note descriptions. A new bounded
  inert reader retrieves only the matching note's public title/description.
  It rejects arbitrary JavaScript, malformed or ambiguous state, wrong IDs,
  excessive resources, hidden text and unrelated recommended notes.
- No steps is never described as a complete recipe. Title-only, partial text,
  missing structured steps and incomplete AI results have explicit messages.
  Users can add text locally, choose the existing screenshot/text path or
  manually edit. AI remains explicitly requested, schema-checked and reviewed.
  Source material and supplements remain transient; existing save/recovery
  safeguards are used without modification.

## Real sample — limits of the evidence

The user supplied one public short link (Sample A) and reported no VPN on the
phone. Its full URL, query, tokens and HTML are deliberately omitted here.

1. On this desktop, system DNS for the platform hosts returned benchmark/Fake-IP
   addresses. The normal safe path refused connection. This is a desktop
   **NETWORK_ENVIRONMENT_LIMIT**, not proof of the phone's DNS cause.
2. A separate read-only diagnostic using standard DoH obtained two public A
   addresses. Each hop validated all answers and pinned the HTTPS connection
   while retaining the hostname/SNI/certificate check. With no Cookie,
   Authorization or Referer, the sample followed two302 redirects to the
   platform's `/login` route and returned200 HTML (about36,790 bytes), no
   readable note description and no target note map. The correct result there
   is **platform login limitation**, not an imported recipe.
3. This diagnostic did not add DoH to production and is not evidence that the
   Android native fetch path succeeded. The original phone `dns_blocked` cause
   remains unconfirmed. Login/captcha restrictions are respected.

Public structure reference: [a public extractor's implementation](https://github.com/wuaishare/sharextract/blob/main/sharextract/extractors/xiaohongshu.py)
illustrates the serialized state shape; it is not an official stability promise
or production dependency. [The platform authorization scope documentation](https://openaccount.xiaohongshu.com/docs/scope)
does not promise anonymous access to arbitrary notes. No login-state tools or
private API were used. Agent Reach was checked but its CLI was unavailable;
public-source reading and the bounded diagnostic were used instead.

## Fresh verification

- JS/TS: **16 files / 275 tests PASS**, covering link parsing/text, native bridge
  error mapping, service and real React screens, source review, explicit AI,
  duplicate-title protection, save failure/UUID recovery and session disposal.
- JVM: **25 tests PASS**, compiled with official JDK21/javac and run using JUnit
  + MockWebServer with a256MiB heap and cached dependencies. This is not a
  Gradle, native instrumentation or Android device result.
- TypeScript PASS; lint0errors/5existing warnings; local Vite build PASS.
  Production-graph isolation PASS:326 modules,15 shared V2 modules, no showcase
  or fixture modules. Existing Vite configuration/chunk-size and JSDOM scrollTo
  warnings remain. No new dependencies were installed.
- Browser: **24 flows / 27 actual screenshots PASS**. Three themes,390×844,
  isolated fresh contexts, real LibraryApp/LinkImportService/AiIntakeService/
  PreviewRecipeLibrary; external HTTP/Provider replaced with synthetic ports.
  Browser plugin unavailable; existing Playwright1.62.1 + local Chrome used.
  No external requests or page/console errors. Scenarios: public serialized
  note, title-only plus local supplement, video-only steps, ingredients without
  steps, login, challenge, Fake-IP and complete JSON-LD. Fake AI previews have
  missing steps, show the warning and keep save disabled pending review.
- RED→GREEN: the new diagnostics/service checks first failed9 cases; UI checks
  first failed2 cases; further partial-metadata access-wall regression failed
  before repair. Parser tests first failed on missing state support and then on
  13 additional ID/visibility/wall boundaries. Native diagnostics first failed3
  checks before the final25 PASS. These are repair history, not added totals.
- Real paid AI calls: **0**. No recognition-accuracy claim is made.
- Existing signed v27 APK SHA-256 unchanged:
  `b87edc7b33e19845f417bac3dc98f70ed3c9b1d2824d379e20918db8cca6ab95`.

Commands: targeted `vitest run src/native/link-import src/native/intake-review`
with one worker; `npm run typecheck`; `npm run lint`; `npm run build:local`;
`node scripts/verify-ui-v2-isolation.mjs`; scoped javac/JUnit invocation;
`node scripts/verify-xhs-link-browser.mjs` with an isolated runtime/output.

## Remaining limits and NOT_RUN

Actual anonymous accessible Xiaohongshu recipe pages are **NOT_RUN**; the only
real supplied sample ended at a login wall. Public page-state formats can
change. Image/video contents, speech and image-only steps are unsupported by
the webpage reader; the existing explicitly initiated screenshot AI is the
alternative. Native Android bridge/Gradle/connected tests, Xiaomi14, TalkBack,
Android IME/Back, real Provider quality and phone DNS diagnostics are NOT_RUN.
No claim of device compatibility is inferred from browser or JVM checks.
Any future APK must use versionCode>27 and the existing signing identity.

## Screenshot evidence

Only generated recipes and synthetic URLs appear in the screenshots. The
separate visual evidence archive contains the selected files and SHA-256 sums;
the source packet contains text/source files only. Full browser results record
the tested implementation SHA above. No real note/media is distributed.

| Actual screenshot | SHA-256 |
| --- | --- |
| `warm-ivory-public-note.png` | `930a90dc42242dd138d7d9b1212f51b7b1ebd169e7822d52e3205fc162680507` |
| `warm-ivory-title-only.png` | `3daa7409e5041876b82bfae2636c460c4a36c01611b73ada9e2705cc0c2f335e` |
| `warm-ivory-video.png` | `74b2f26a4a2330e7f84d8b5e066c7ad3b5a800d46832a1975a1072b55d46f92a` |
| `warm-ivory-login.png` | `1fd93f1f4dd09a5be2e7056b7132a7f81b432f2d8fa911b4bd3ae98ebc52f700` |
| `warm-ivory-fake-ip.png` | `ef73f7bd1531a5c3285c149a11ec83a7fee03a837035be34d8b7554ec813a392` |
| `warm-ivory-partial.png` | `2ff8c99ffecdfed266f85070849fc0e589c9407455b316ca06b38bf8f7786bd8` |
| `warm-ivory-incomplete-ai.png` | `9e01008e33725c9a9be2279643277d6669e92ed39fe5160c4e5aaaf5b378be52` |
| `pure-glass-video.png` | `3297b4940ee9e752b77cb261b1b23ab708e6f9547a5a342b57552a666989a4eb` |
| `soft-sage-video.png` | `ccd0208b82094cce3db2b7f7db91200c78b92674743068e44e265ddecd3098d1` |
