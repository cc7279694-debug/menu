# P0 XHS-R3 — real public link diagnosis and minimal compatibility fix

**READY_FOR_INDEPENDENT_REVIEW — REAL_PUBLIC_LINK_PASS**, limited to **Sample A / PC_DIAGNOSTIC_DOH / REAL_RESPONSE_OFFLINE_REPLAY**. This is not acceptance, a release, a default-DNS/Android pass, or a promise of complete recipes.

## Confirmed cause

The anonymous public response puts the addressed note at `__INITIAL_STATE__.noteData.data.noteData`; its explicit noteId matches the final URL, but the old reader only supports `note.noteDetailMap`, so it discarded 409 code points of available target prose as `state_unsupported`.

There is a separate **current PC network environment** issue: system DNS returns benchmark Fake-IP; production correctly refuses it before HTTP. The original Xiaomi14 `dns_blocked` cause is **UNKNOWN**, including the user's reported no-VPN case. No network safety exception or production DoH fallback was added.

## Fixed identities and scope

- Base: `f552d142d678868b739dff9a7eecda070a319df3`. Before this patch its `src/`, `native/`, `android/app/src/main/` match accepted R2 source `c2c55d21c8328e6f78aa7f738bf9d1eba9f1423d`; R2 evidence28b1a6bf and V28-A3 registration54607862 are ancestors.
- **Source commit: `bc045adfc9bb5b6a9698580f9c1cad593d90ab35`**. Three files: one production helper and two test files; exact [diff](source.diff.patch).
- Production change:10 added/1 removed lines in `xhs-page.ts`. Only the second exact object path is allowed. Embedded ID must strictly equal the final route ID. An existing legacy map, even malformed or mismatched, cannot be rescued by the new layout.
- N2 stays **PAUSED_BY_USER**: source51a2d92 and evidenceab7f6f9 preserved in its original worktree. No segmentation code is included; N2's system-startup ANR history is not a RECIPIO parser defect or a memory excuse for this PC test.
- No UI redesign, screenshot implementation, dependency, Native production, database, backup, Provider, Key, theme, version or signing change.

## Real sample evidence — not synthetic HTML

See [complete sanitized classifications](real-link-diagnostics.json). Only host, coarse path kind, counts, statuses and booleans are published; no note ID, original URL, query/token, title, body or media.

| Stage | Actual result | Evidence boundary |
| --- | --- | --- |
| Production system DNS | Fake-IP benchmark; `dns_fake_ip`;0HTTP | EXECUTED; current PC only |
| Initial diagnostic DoH attempt | Child result could not be decoded by the local Windows output protocol; no replayable page retained | Failure preserved; count conservatively as at most3HTTP; **not** real-link PASS |
| Tool correction | Explicit UTF8 bytes + safe sidecar before private stdout; synthetic Chinese/Emoji strict-decode roundtrip PASS under GBK and UTF8; original println-style baseline fails | Offline diagnostic tooling only, not App fix or website evidence |
| Owner-approved additional round | **2HTTP:302→200**, one redirect, final public note route,49,180 UTF8 HTML bytes | Anonymous; no cookies/authentication or JS execution |
| DNS/TCP/TLS | Short host2globalIPv4; final host3globalIPv4+1globalIPv6; all answers pass production safety validation; connected IPs in validated set; TLS1.2/1.3 verified with original hostname/default trust | Diagnostic DoH injected only in PC harness; not a shipped fallback |
| Actual old parser | State present, one anchored assignment,13,286payload bytes; `state_unsupported`,0text | Before patch on real response |
| Same real response after patch | `targetResolved=true`, `target_text`,409code points, non-title prose, no truncation | **Offline replay**,0additional HTTP; not re-fetched after patch |
| Actual production Service on same real response | `ready`, **partial**,0structured candidates,0automatic AI; explicit entry enabled | Original real page retained briefly outside repository only |
| Explicit AI boundary | One local Fake call,535input code points,0images; no final URL or share parameter values; `ai-preview`,0saves, no DB opened | **Fake/no network**, not Qwen or recognition-quality evidence |

Known layout and exact target match are confirmed; recipe completeness is not. Image/video content was not read. The presence of prose does not imply every ingredient, quantity or step is present. The original partial/missing and human-review gates remain.

Request accounting: system0; first diagnostic actual count UNKNOWN, conservatively≤3; owner separately approved≤3more, of which2were used. Total conservative≤5; remaining allowance retired. No retry loop, extra sample, private endpoint or AI call.

## Fresh verification

| Check | Result | Receipt |
| --- | --- | --- |
| RED before production patch |3new tests fail,89pass; same missing mobile layout as real response | [RED](tests/red.txt) |
| Final link-import tests | **196 PASS /8files** | [JS](tests/targeted-js.txt); includes parser/service/screen/native bridge and existing save/recovery behavior |
| Pure JVM network tests | **25 PASS**:7URL safety,14fetcher,4request | [log](tests/jvm-tests.txt), [exact javac/JUnit/cache/source hashes](tests/jvm-network-receipt.json); local MockWebServer only, no Gradle/device. Java files unchanged from recorded base |
| Typecheck | PASS | [final](tests/typecheck.txt). Initial new test accessed a zero-argument Fake's inferred tuple, causing3TS errors; corrected by using the typed bridge interface, no suppression. [failure retained](tests/typecheck-initial-failure.txt) |
| Lint |0errors,5existing warnings | [log](tests/lint.txt); diagnostic evidence `.mjs` also [checked](tests/diagnostic-tool-lint.txt) |
| Local production build | PASS | [log](tests/build.txt); isolated generated output moved outside repository, not synced into Android |
| Production isolation | PASS:326modules,15shared V2,0showcase/fixtures | [log](tests/isolation.txt), write=false |
| Final source review | SOURCE_REVIEW_PASS | Fixed own-property path, strict ID, old-map precedence, inert bounded JSON, no generic XHS fallback; not independent device execution |

New tests cover mobile identity absent/null/numeric/wrong; unfinished short link; recommendation siblings; malformed/conflicting legacy map; unsupported containers; sanitization/budgets; valid mobile→explicit Fake AI only; wrong mobile+complete unrelated JSON-LD/main stays blocked; human review, UUID/save behavior via existing scoped tests. All fixture text/IDs are synthetic.

## Security and retained boundaries

- No production network changes: all-address DNS rejection, Fake-IP/private/reserved rejection, redirect-by-redirect pinned connection, original SNI/default certificates, HTTPS downgrade refusal,20second total/2MiB response/redirect limits unchanged. No login cookies, private APIs, signatures, fingerprint spoofing or anti-bot bypass.
- Legacy BLOCKING-01 remains: unowned XHS `main/body`, recommendations and JSON-LD cannot make a recipe. No recursive search or executable state evaluation. State256KiB/depth32/nodes4000/text28000 unchanged.
- Source fetching still makes0AI calls. Explicit cleaned text→existing AI normalization/Preview/manual confirmation/ordinary Recipe contract unchanged; no original URL/token automatically sent. Actual Provider is **NOT_RUN**.
- SQLite4 / Preview7 / Backup2, native Key/Provider, local media and user data untouched. No new permission or dependency. No N2 long-image code.
- Signed V28 SHA-256 remains `52dfed4ef23afb5aa0dc6fb2b6089921af240993627aec9479ff69ea3d94b59b` (read-only recheck); no APK build/sync/install/signing or phone operation.
- Source and evidence commits are separate; later evidence commit does not change source. No main merge/tag/release. Diagnostic code is audit evidence under [diagnostic-tools](diagnostic-tools/README.md), never imported into production.

## NOT_RUN / UNKNOWN / remaining limitations

**NOT_RUN**: real Android/Xiaomi14/OEM/IME/Back/TalkBack; original phone network failure reproduction; production system-DNS full real chain; post-patch fresh HTTP re-fetch; more real notes/platform stability; actual AI/Key/recognition accuracy; real Recipe save from this sample; personal data/upgrade; full-repository historical tests and connected tests. No screenshots or simulated webpage result is counted as real direct-link proof.

The current PC's system-DNS Fake-IP condition remains blocked as designed. This patch does not fix VPN configuration and does not establish the Xiaomi cause. Login/challenge/restricted or media-only pages still cannot supply unavailable prose. The existing signed V28 does **not** contain this source fix.

## Short owner verification later — not executed now

After independent approval and a separately authorized same-key future build: on Xiaomi14 preserve existing data, open the public link importer, read the permitted public link, check the shown target title/body and reason. Do not clear data or disable security protections. Record only error category, network/VPN state and whether target prose appears. AI remains a separate explicit/cost-bearing choice; merely reading the page must not request it. If only title/login/verification/media is available, stop and report that category rather than invent steps.

Stop for ChatGPT independent review. Do not resume N2, produce/sign an APK, merge main or operate a phone.
