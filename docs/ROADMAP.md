# RECIPIO Android Roadmap

2026-10-27：G5 已由独立验收限定 ACCEPTED/FROZEN（cb40a9fb）；当前 G6 智能份量与厨房备料已完成授权实现及云端验证，分支 `feat/recipio-g6-serving-adjustment`，待独立审查。G2/G3/G5 既有验收继续保留；长期签名和个人数据迁移仍由用户延期，G4 PENDING、G6 未自行冻结。不合 main、不建 Tag、不部署、不进入视频/G7；当前证据见 CURRENT_STATE.md。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; initial user experience accepted | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过；用户目前未发现问题 |
| APK-2 | Accepted baseline | .recipio Format v1、完整当前/历史图片、安全 Replace；v10 与原 Golden 保留，历史验证数字不复用为 APK-3 结果 |
| APK-3 | Native verified; delivery baseline for APK-4 | 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选照片/评价/备注、只读修改历史；SQLite4 / Preview7 / Format2（兼容原v1）；历史全仓739、JVM30、connected14与模拟器完整闭环通过；v11保留，物理手机未冒称验证 |
| APK-4 | Accepted / Frozen | main d01589e / v0.5.0-ai-intake；用户与自动化证据分开保留，SQLite4 / Backup2不变 |
| APK-5A | Accepted / Stable main | main f7c5d8d / v0.6.0-link-import；公开网页 Native安全GET / DNS固定 / Parser First / 人工Preview / 显式AI；历史960全仓、114JVM、53Android不复用为5B证据 |
| APK-5B | Accepted / Stable main | main7205a3c / v0.7.0-share-target；用户Share Sheet PASS，历史982/125/64不复用为5C-A数字 |
| APK-5C-A | Accepted stable baseline for APK-6 | main8b2246d /v0.8.0-share-intake；Text /1–6静态图片Share→既有AI入口；历史998/144/89不复用为APK-6数字 |
| APK-5C-B | Deferred; not authorized as product implementation | 视频/社交专项，仅已有独立可行性实验；本轮不进入 |
| APK-6 | Accepted stable baseline | 已接受功能与 Logo 已在稳定 main649804a；历史1029/441/188/105及原失败证据保留，不改写为 UI V2 本轮测试 |
| Logo integration | Accepted stable baseline | 用户已认可新 Logo 并授权与 APK-6 共同进入稳定 main；既定品牌不在 UI V2 重绘，历史手机/OEM测试不冒称新执行 |
| UI V2 G0/G1 | Visual accepted by user / PASS WITH NOTES |9a17b1c；原三主题视觉与独立样板保留，历史证据见 ui-v2/FINAL_POLISH_VERIFICATION.md，不复用其数字作为 G2 结果 |
| UI V2 G2 | Accepted / Frozen — PASS WITH NOTES | 用户在v21 layout-fix手机上验收，冻结9e4bff3；Codex模拟器补验与用户真机反馈分别保留，历史数字不复用为G3 |
| UI V2 G3-0 | Accepted / Frozen — PASS WITH NOTES | 6cc631a/v22；用户真机六项PASS，独立于历史Codex证据；模拟器/connected/TalkBack/真实AI/完整替换恢复仍NOT_RUN，见G3_FOUNDATION_ACCEPTANCE.md |
| UI V2 G3-1/2/3 | Accepted / Frozen — PASS WITH NOTES | 2080f86/sourcee182a72/v23；用户手机覆盖升级及六项体验PASS，Codex模拟器/connected/TalkBack/真实新版在线端到端/替换恢复/性能仍NOT_RUN，见G3_ACCEPTANCE.md |
| UI V2 G4 | Not frozen | G4 历史资源中止证据保留于 G4_RESUME_VERIFICATION.md；后续 R1 无密钥工程和 v25 用户体验不等于长期签名/个人迁移或 G4 冻结，见 CURRENT_STATE.md |
| R1 signing / personal migration | Deferred by user | 无密钥工程已独立审查；长期密钥、安全保管、正式同签名更新和个人数据迁移延期，不是 G5 前置条件 |
| UI V2 G5 | Accepted / Frozen — PASS WITH NOTES | 独立验收cb40a9fb，测试源码e5fbe1b；限定日常体验，不等于G4冻结/R1完成；见 g5/G5_INDEPENDENT_ACCEPTANCE.md |
| UI V2 G6 | Ready for independent review / not frozen | 临时本地份量换算、详情/厨房共享、保守回退、零持久化和明确完成；同一源码1381JS/189JVM/23Native及三主题真实浏览器通过；边界和NOT_RUN见 g6/G6_REVIEW.md |

APK-6历史证据见 verification/find-recipe-rc2*.md 与原checkpoint，441项是1029项的子集，不能重复相加。当前Logo集成证据见checkpoints/2026-10-06-logo-integration.md：纯资源任务未重复全仓/connected/Provider测试，完成构建和窄模拟器视觉/数据保留验证；手机视觉验收独立。用户APK-6确认不是Codex重新调用AI的证据。不恢复收藏、购物、菜单、Timer或云同步；任何后续模块或main收口需另行批准。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
