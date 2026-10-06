# APK-6 Stage 0 — Responses / Web Search Provider Preflight

## Baseline

- Date: 2026-10-06
- Stable `origin/main`: `8b2246dbfac674aa837cb25675893fbbef2d79c5`
- Release: `v0.8.0-share-intake`, resolving to the same stable commit.
- Experiment branch: `exp/find-recipe-responses-preflight`, created directly from the verified stable baseline.
- Initial working tree: clean. The independent logo-refresh branch was preserved.

## Provider / request configuration

- Provider profile: **NOT VERIFIED**; neither `workspace` nor `legacy-beijing` is inferred from previous conversations.
- Endpoint host/path: **NOT SELECTED**; selection and current official-interface verification require the device's actual credential profile.
- Intended model: `qwen3.8-flash`.
- Intended tools: `web_search`, `web_extractor`, in one request.

## Verification results

- Fake HTTP tests: **NOT RUN**; no experimental client was implemented because the device-key prerequisite requires stopping.
- Android test compilation: **NOT RUN** for the same reason.
- Real Responses POST count: **0**.
- HTTP status: **NOT RUN**.
- Response status / model: **NOT RUN**.
- Completed web-search count: **NOT VERIFIED**, not zero.
- Structured source count / hostnames: **NOT VERIFIED**; no response was obtained.
- Web-extractor count / status: **NOT VERIFIED**.
- Usage counts: **NOT VERIFIED**.

## Privacy result

- Read-only Android device inventory found only another project's emulator; no RECIPIO test device or physical phone was connected.
- That emulator was not used, controlled, or inspected for RECIPIO credentials.
- `AiNativeRuntime`, `AiSecretStore`, and `AiSecretEnvelope` were inspected as code only; no stored key or encrypted envelope was read.
- No key was requested in chat, shell, environment variables, fixtures, logs, or this report. Credentials previously present in conversations were not reused.
- No Provider request body, response, or new Provider log exists for this attempt. Runtime containment / Logcat checks remain **NOT RUN**, rather than being claimed as passed.

## Final decision

**FIND_RECIPE_PREFLIGHT_NEEDS_DEVICE_KEY**

The required Android device with an existing, securely configured real AI key is unavailable. This does **not** establish that the user's phone lacks a key, that the key is invalid, or that Responses / tools are unsupported. Provider capability remains **INCONCLUSIVE**.

Resume only after an appropriate RECIPIO Android device is connected and its key is configured through the existing native Settings → AI 密钥 dialog. Do not provide the key to Codex. Then complete the approved Fake tests, test compilation, unique official endpoint verification, Native credential/privacy gates, and at most one real Responses POST.

No production code, UI, SQLite, Backup, dependencies, versions, stable branches, or release tags were changed. No formal APK was built, and no APK-6 product implementation began.
