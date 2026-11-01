# RECIPIO Xiaohongshu reliability — GitHub review entry

**Superseded for BLOCKING-01 re-review:** ChatGPT found an ownership blocker in
this original delivery. See the [targeted follow-up](../xhs-blocking01-20261101/README.md),
source `eef0bec324a96f5ca97a0e050b30417d39e20448`. This original report and its
screenshots remain historical evidence; they do not prove the blocker repaired.

Review the immutable commit supplied in the review request, rather than a moving
branch or `main`. No ZIP or local-machine access is needed.

- Repository: `cc7279694-debug/menu`.
- Branch: `fix/recipio-xhs-link-reliability`.
- Base: `6c580bf0d00ff3162a965d53ce7835ca4484b27c`.
- Tested implementation: `87e3fa6cafa22876d0f5140c8166b9e92fb6d7ca`.
- [Exact implementation diff](https://github.com/cc7279694-debug/menu/compare/6c580bf0d00ff3162a965d53ce7835ca4484b27c...87e3fa6cafa22876d0f5140c8166b9e92fb6d7ca).
- Later delivery commits only add or update documentation and synthetic evidence.
- [Verification, root causes, limits and screenshot hashes](../2026-11-01-xhs-link-reliability.md).
- [Selected actual browser screenshots](screenshots): nine PNGs, generated data only.
- [Browser execution results](browser-results.json): 24 flows, 27 captures, no
  external requests or console/page errors. Only the nine selected captures
  are included in this GitHub evidence; the other 18 are local and unreviewed here.

## Bounded review checklist

1. Keep every-address validation, per-hop DNS pinning, TLS verification and
   refusal of private/benchmark addresses. `dns_fake_ip` must remain a refusal,
   not an IP exception or production DNS fallback.
2. Preserve legal domains and share parameters. Keep invalid URLs, blocked DNS,
   unsafe redirects, HTTP login/access failures and HTML walls distinguishable.
3. Read only bounded inert public state for the target note. Reject expressions,
   wrong/ambiguous IDs, hidden text and recommended/shell content. No cookies,
   login, private API, signatures, script execution or media downloads.
4. Never describe a title-only or step-free result as complete. Text supplements
   are transient and local; AI remains explicitly initiated and manually reviewed.
5. Preserve existing save UUID/recovery/duplicate protections. Keep SQLite4,
   Preview7, Backup2, the v27 APK and signing identity unchanged.
6. Distinguish submitter test reports from independent execution. Android,
   Xiaomi14, TalkBack, IME/Back, real AI accuracy and phone DNS remain NOT_RUN.

## Relevant source

- [Native fetch](../../../android/app/src/main/java/app/recipio/local/SafeWebFetcher.java)
  and [URL/address safety](../../../android/app/src/main/java/app/recipio/local/WebUrlSafety.java).
- [Public state reader](../../../src/native/link-import/xhs-page.ts),
  [visible text](../../../src/native/link-import/visible-text.ts),
  [page classification](../../../src/native/link-import/page-status.ts),
  [service](../../../src/native/link-import/service.ts),
  [screen](../../../src/native/link-import/screen.tsx) and
  [safe error contract](../../../src/native/link-import/contract.ts).
- Targeted tests are next to the source; native tests are under
  `android/app/src/test/java/app/recipio/local/`.
- [Browser runner](../../../scripts/verify-xhs-link-browser.mjs) and
  [synthetic fixture](../../../scripts/fixtures/xhs-link.tsx) are excluded from
  the production bundle.

The real supplied sample is intentionally absent. Its separate safe diagnostic
ended at a platform login page; the user's phone DNS cause is unconfirmed.
This evidence does not claim anonymous access to that sample or all platform
notes, and does not authorize an APK, main merge, phone operation or next module.
