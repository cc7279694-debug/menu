# APK-4 Provider smoke — 2026-10-05 closeout

Real paid Provider POST count: **0 / NOT RUN**. No actual access failure was observed; do not mark AI_PROVIDER_ACCESS_BLOCKED based on a missing key or unavailable device.

Candidate model `qwen3.8-flash`, Beijing, fixed HTTPS OpenAI-compatible endpoint. Actual account access remains unverified. No fallback model or region was selected.

## Implemented preflight

- Fixed nonprivate text only, 128 output tokens, strict tiny JSON schema; accept only the single string property `status: "ok"`.
- Original-token validation rejects duplicates, extra fields, wrong value/type and non-JSON chat. No caller source or generated red-square image is sent.
- Fake HTTP behavioral RED: 17 tests / 3 failed; corrected native code GREEN: 17 / 0 failed. This is not a real Provider call.
- Installed native bridge Mock test passed in both the 15-case diagnostic and final40-case connected run (final32 passed / 8 IME failures). That proves native preflight wiring only, not account or multimodal access. Final APK SHA256804de950006d5b2f61880b77a71eed36d8e4c00fcf3eab7c969e5e3c08389906.

## Required real calls — not yet executed

| Call | Input | Result / HTTP / elapsed |
| --- | --- | --- |
| 1 | Fixed text preflight | Not Run |
| 2 | Generated nonprivate text recipe | Not Run |
| 3 | One generated recipe screenshot via SAF | Not Run |
| 4 | 2–3 generated screenshots, only if the preceding three succeed | Not Run |

Total maximum four POSTs, no automated paid requests or retries. Configure the user's Beijing Key only in the native protected password dialog. Never provide it to chat, terminal, environment, JavaScript, database, backups or packet.

On ModelNotFound / NoPermission / AccessDenied / UnsupportedModel / 401 / 403: immediately stop real calls, retain only safe model/region/HTTP/elapsed/error category, mark AI_PROVIDER_ACCESS_BLOCKED. Do not retain Authorization, full input, prompt or raw response.

At least one actual inferred/missing result still needs unconfirmed-save refusal, field editing, explicit acknowledgement, ordinary Recipe creation and private-temp cleanup proof. Screenshot/multiple-image order and quality remain unverified. No private data was used or erased. Physical-phone smoke is Not Run.
