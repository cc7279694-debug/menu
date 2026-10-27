# RECIPIO Android Roadmap

2026-10-27：ChatGPT 已完成 G7-A～E 集中独立验收，用户授权登记为 ACCEPTED / FROZEN — PASS WITH NOTES；源码 e8c2f948、交付6f1df128、CI40460260275，分支 feat/recipio-g7-reliable-intake。本轮仅三份验收文档修改，不重跑产品测试。G5/G6 冻结及 NOTES 保留，G4 整体 PENDING、R1 DEFERRED_BY_USER 不变；不是整体正式发布验收，不合 main、不建 Tag、不部署、不进入视频/G8。见 CURRENT_STATE.md 和 g7/G7_INDEPENDENT_ACCEPTANCE.md；原 g7/G7_REVIEW.md 保留历史送审记录。

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
| UI V2 G6 | Accepted / Frozen — PASS WITH NOTES | ChatGPT 独立验收 G6-A～E；源码 d8f2e3a、交付 e295dd2、CI40440306979；1381JS/189JVM/23云端Android/33浏览器组PASS。保留明确数量单位/复杂原文回退、极窄大字观察和全部NOT_RUN；见 g6/G6_INDEPENDENT_ACCEPTANCE.md，不构成G4冻结或R1完成 |
| UI V2 G7 | Accepted / Frozen — PASS WITH NOTES | ChatGPT 独立验收G7-A～E，用户授权登记；源码e8c2f948、交付6f1df128、CI40460260275：1503JS/189JVM/25云端Android、G7浏览器29及G6厨房回归33组PASS，保留5项Lint警告。当前草稿检查/会话来源/稳定行映射/审核同名恢复保护限定冻结；SQLite4/Preview7/Backup2不变，真实AI0。真机/OEM/TalkBack/系统字号/性能/飞行模式进程冷启动/原生临时图片像素呈现/未执行历史connected项目仍NOT_RUN。G4 PENDING、R1延期，不构成整体发布，不进入G8；见 g7/G7_INDEPENDENT_ACCEPTANCE.md |

APK-6历史证据见 verification/find-recipe-rc2*.md 与原checkpoint，441项是1029项的子集，不能重复相加。当前Logo集成证据见checkpoints/2026-10-06-logo-integration.md：纯资源任务未重复全仓/connected/Provider测试，完成构建和窄模拟器视觉/数据保留验证；手机视觉验收独立。用户APK-6确认不是Codex重新调用AI的证据。不恢复收藏、购物、菜单、Timer或云同步；任何后续模块或main收口需另行批准。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
