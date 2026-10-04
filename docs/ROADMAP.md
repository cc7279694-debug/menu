# RECIPIO Android Roadmap

2026-10-04：APK-2 用户验收已通过，APK-3 已完成最终回归与模拟器技术验收（交付 `78f1877`）。用户授权进入 APK-4；其冻结范围及10任务实施计划已形成，待一次开工前审核，业务代码尚未实施。保留底座和旧 Web 回退；无部署、不进入 APK-5。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; initial user experience accepted | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过；用户目前未发现问题 |
| APK-2 | Accepted baseline | .recipio Format v1、完整当前/历史图片、安全 Replace；v10 与原 Golden 保留，历史验证数字不复用为 APK-3 结果 |
| APK-3 | Native verified; delivery baseline for APK-4 | 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选照片/评价/备注、只读修改历史；SQLite4 / Preview7 / Format2（兼容原v1）；历史全仓739、JVM30、connected14与模拟器完整闭环通过；v11保留，物理手机未冒称验证 |
| APK-4 | Plan ready; awaiting pre-implementation approval | 文字/1–6截图/组合 → 原生 BYOK Qwen → strict校验与保守审核 → 人工编辑确认 → 普通本地菜谱；临时来源/key不入库或备份，SQLite4/Backup2不变；固定SOL Task1–10，尚未编码/调用AI |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

当前运行基线证据见 verification/cooking-experience-android.md 与 checkpoints/2026-10-04-cooking-experience.md；严格兼容见 backup-format-v2.md。APK-4 待审计划见 superpowers/plans/2026-10-04-apk-4-ai-intake.md，合约见 ai-intake-contract.md；不把计划当验收结果。APK-2 及旧 APK-1 合同保留为历史。不要恢复收藏、购物、菜单规划、Timer 或云同步。APK-4 最终交付后停止，APK-5 未获实施授权。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
