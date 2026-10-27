# G6 智能份量与厨房备料 — review/checkpoint

Status: **RECIPIO_G6_READY_FOR_REVIEW** — 2026-10-27. All authorized execution gates below completed; not independent acceptance or G6/G4 freeze.

## Scope and source

- Branch: `feat/recipio-g6-serving-adjustment`.
- G5 accepted/frozen baseline: `cb40a9fb1d07a1856f08725269563fd297299003`.
- Current tested product/tests/workflow source: `d8f2e3afcaffce886d4a08caec7ce99a97a4531d`.
- Final-source cloud run: [40440306979](https://github.com/cc7279694-debug/menu/actions/runs/40440306979).
- G4 remains PENDING; R1 signing/personal migration remains DEFERRED_BY_USER.

## What changed

1. 详情食材区可直接输入本次人数、加减或恢复原始份数；3→2 时，600 克→400 克、330 毫升→220 毫升、2 个→约 1.33 个。
2. 同一个临时会话目标供详情和既有 Focus/Guided 食材 Sheet 使用。厨房改人数后回详情保持一致；编辑取消、相关历史返回保持本次目标。离开后重进、换菜、重启和成功编辑保存后重新基于原始菜谱初始化。
3. 不完整输入、越界、空值保留最近有效展示并关联错误提示。原始份数缺失时只提示编辑填写，不虚构 1 人份。
4. 原始食材、步骤、时间和热量不改写。步骤内的数字仍是原文，不是新的计算结果。调整不是完成；只有原有明确完成操作才记录，快速双击仍只一条。
5. Warm/Pure/Sage 和深色厨房使用既有 tokens。48px 操作区、长文本、320/390/412、CSS 200%、solid/reduced-motion 均走真实页面检查。较早历史只改文案为“展开较早记录（预览 N 条）”，查询和排序没改。

## Calculation and ownership

- 只解析整个 amount 字段的单一非负小数和受支持单位：克/g/千克/公斤/kg；毫升/ml/mL/升/L；个/只/颗/片/根/瓣。允许正常空格及半/全角数字。
- 适量、少许、半勺、范围、分数、混合数量、缺单位、附加说明等保持原文；不从食材名称抽数字。
- BigInt 十进制有理数比例，最多两位、半入舍入、去尾零、不转换单位。发生舍入或离散单位为小数则标“约”。比例 1 原文直出；极小正值将变零或超出安全边界则保留原文。
- 原始分母只取 `RecipeDetails.servings`；0.1～10000 合法小数均可。加减保留小数段，避免二进制误差和虚假“约”。
- `LibraryApp` 仅持有 React 内存 target；局部输入字符串与有效 target 分开。展示投影不回填 DTO，不写 Repository、SQLite、IndexedDB、local/sessionStorage、文件、历史或 Backup。

## Verification — final source only

| Gate | Result | Evidence / boundary |
|---|---|---|
| G6 pure + actual LibraryApp + affected G5 | PASS 217/217 | 186 pure +11 actual LibraryApp +20 affected G5; included in full suite, not additive |
| Full current JS/TS | PASS 1381/1381 | 212 files; final Windows job121978794017 |
| Typecheck / lint / local build / isolation | PASS | 0 lint errors/5 existing warnings; isolation317 production modules,14 shared V2,0 Showcase/fixture assets |
| Real browser 3 themes / layout / zero external network | PASS | 33 groups,39 geometry,9 computed materials,12 PNGs; external/page/console0 |
| Capacitor sync / JVM / lint / Debug / AndroidTest | PASS | Final build job; JVM 189/189, 0 skipped |
| Fresh cloud API36 native fixtures | PASS 23/23 | Real instrumentation, 0 skipped; own fresh AVD only |
| Physical phone / OEM / actual TalkBack / Android font scaling / performance | NOT_RUN | No user device authority or evidence |
| Process cold boot + flight mode / real AI / durable-signature upgrade / personal migration | NOT_RUN | Outside this synthetic G6 verification; R1 deferred |

All four jobs in run40440306979 attempt1 completed successfully at the exact source above. Browser job121978793796, Android build121978794095, native121979936009. JVM189 and native23 both have0 failures/errors/skips. These are fresh G6 counts; targeted217 is a subset of1381.

Native 23 = storage/backup 11 + old IME/Back 8 + G5 UI 2 + G6 2. G6 uses an actual numeric IME, system Back, private generated image bytes and real SQLite snapshots. First Back hides IME without page event, second closes the Sheet, current step/target remain; Activity restart returns to original target. Adjustment writes/network calls remain zero; explicit completion writes exactly one real record. Activity restart is not a process cold boot or a physical-phone claim.

Browser evidence is actual Chromium151.0.7922.34 / pinned QA Playwright1.62.1. Warm uses320/390/412 at CSS100/200%; Pure/Sage use390 at CSS100/200%, sharing the same layout. All three check reduced-motion and existing solid CSS on actual Root/cooking/Portal scopes;9 computed materials are opaque/no blur. This is the data-attribute CSS contract, not an actual unsupported-WebView `@supports` test. Native image-byte consistency is not a pixel-level native screenshot presentation claim; the latter remains NOT_RUN.

## Test-first evidence and repairs

- `c27fb73`, run [40343923995](https://github.com/cc7279694-debug/menu/actions/runs/40343923995): affected G5 20 PASS; initial G6 172 total, 112 expected behavior failures / 60 fallback cases PASS. Failures came from stub/missing UI, not broken imports.
- `3a75dc4`, run [40345842092](https://github.com/cc7279694-debug/menu/actions/runs/40345842092): pure 162 PASS; integration 9 PASS / 2 FAIL. Added literal regression reproduced 2.3−1 as 1.2999999999999998. Decimal stepping repaired and 24 pure cases added without changing original expectations.
- The other integration failure clicked the existing disabled History Back before its real local read finished. Test now waits for enabled state; production history logic and assertions remain intact.
- `e80ac3e`, run [40346467769](https://github.com/cc7279694-debug/menu/actions/runs/40346467769): all 10 browser business flows PASS, then input geometry correctly rejected 44px at Warm320. Scoped G6 `#root` selector fixes legacy ID specificity; 48px assertion retained. Android build passed; emulator SDK archive extraction failed before tests, therefore native NOT_RUN for that attempt. Subsequent final-source fresh setup produced the 23 actual passes above.
- `0483b41` intermediate run superseded by `f84d3e9`; final-source screenshot framing shows original/adjusted ingredient values rather than a cover-only first viewport. No final success inferred from canceled/intermediate runs.
- At `f84d3e9`, run40347864982 Windows1381/JVM189/native23 passed. Browser attempt1 was cancelled while the official Ubuntu font mirror stalled, before the probe ran. Attempt2 passed all10 business flows and Warm size/font geometry, then failed test setup: selecting only already-present `data-v2-solid` missed the actual root. `d8f2e3a` changes only the browser probe/ledger, not production, native tests or workflow. It activates real fallback scopes and adds computed-material/kitchen assertions while retaining all33 groups and48px/overflow/CTA assertions. Final run40440306979 passed all four jobs, with39 geometry/9 materials/12 PNGs and0 external/page/console errors. No previous failure was skipped or relabeled PASS.
- Internal read-only review found and rechecked the decimal P2; no remaining confirmed static finding. This does not replace ChatGPT independent acceptance.

## Selected actual screenshots

All are generated-data screenshots from `d8f2e3a`, run40440306979. The full12-file manifest is in the raw [browser result](evidence/browser-results.json); its file paths are relative to the CI artifact, not this evidence directory. The repository retains these7 representative originals (759633 bytes), not a large packet:

| Screenshot | Theme / viewport | What to inspect |
|---|---|---|
| [Original3](screenshots/warm-original-390.png) | Warm390×844 | 600克/330毫升/2个 and raw text |
| [Adjusted2](screenshots/warm-adjusted-390.png) | Warm390×844 | 400克/220毫升/约1.33个 plus original references |
| [Kitchen reference](screenshots/warm-kitchen-390.png) | Warm390×844 | Same target2 and amounts in existing Sheet |
| [Pure](screenshots/pure-glass-adjusted-390.png) | Pure390×844 | Shared layout and current accent |
| [Sage](screenshots/soft-sage-adjusted-390.png) | Sage390×844 | Shared layout and current accent |
| [Large text](screenshots/warm-320-CSS200-kitchen.png) | Warm320×844,root32px | Wrapped text/usable controls; vertical Sheet scrolling expected |
| [Solid kitchen](screenshots/warm-ivory-solid-kitchen.png) | Warm412×844 | Opaque existing dark fallback and readable amounts |

Root visually inspected these7 actual PNGs; labels, original/adjusted amounts, long-text wrapping and dark/light controls are readable. This is Codex review of browser images, not ChatGPT acceptance or physical-phone evidence.

## Files and unchanged contracts

- New: `serving-adjustment.ts` + pure tests; `serving-control.tsx`; scoped `ui-v2/g6-serving.css`; actual LibraryApp tests; cloud browser/native probes; G6 workflow and these docs/evidence.
- Modified UI: `library-app.tsx`, `recipe-detail.tsx`, `step-viewer.tsx`, optional IngredientsList render projection in `ui-v2/components.tsx`, CSS import in `main.tsx`.
- Minimal permitted history copy/test change: `cooking-history.tsx`, `g5-cooking.test.tsx`.
- No data model/migration, SQLite v4, Preview v7, Backup v2, Repository, Native production, permissions, dependency lock, Provider/security, media lifecycle, Logo or signing-workflow change. Static frozen-path diff is empty. Complete Preview rows/media snapshots, and native SQLite recipe/related-history snapshots plus generated-image hashes, provide runtime data evidence.
- No real Provider call, phone/data/backup operation, main merge, tag, PR, release or formal APK. No local heavy execution: initial free RAM 0.83 GiB; hosted-only guard prevents probes from using local devices/profiles. Other project worktrees/devices/processes are untouched.

## Test fixture identity

Only an ephemeral internal CI Debug fixture was built: `app.recipio.local`, versionCode25, `0.10.0-g6-qa`. It was installed only on a fresh empty owned cloud AVD, never offered for user installation or used as a durable update candidate.

App fixture SHA-256: `a5aabca6ec000046745b0f1fc18567d59a629691069dbfdb4e660a6d772b80be`.
AndroidTest fixture SHA-256: `23ecf959bee81590eabbe7102438eac0cb50e96d6a5e737b8ae7d0dce34ec516`.
Existing user v23/v25, personal recipes/images/backups and old signing identities remain unchanged.

## Handoff

Implementation/testing is ready for ChatGPT's one independent decision. This final delivery adds only documentation/evidence after tested sourced8f2e3a; no product/test/workflow change is permitted without affected verification. Ordinary push is to the G6 feature branch only; final local/remote equality and clean worktree are checked after commit. Stable main4a26b88658a309b0b06d24f42a764bdaf72eaaec, G5 frozen worktree and video worktree are unchanged. No PR/tag/merge/deployment/formal APK or G7/R1 work. Known limits and5 existing lint warnings remain visible above; G6 is not independently ACCEPTED/FROZEN.
