# RECIPIO Android Roadmap

2026-10-04：APK-2 用户验收已通过，APK-3 已按批准计划完成最终回归与模拟器技术验收，等待用户验收。保留底座和旧 Web 回退；无部署，不进入 APK-4。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; initial user experience accepted | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过；用户目前未发现问题 |
| APK-2 | Accepted baseline | .recipio Format v1、完整当前/历史图片、安全 Replace；v10 与原 Golden 保留，历史验证数字不复用为 APK-3 结果 |
| APK-3 | Native verified; awaiting user acceptance | 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选照片/评价/备注、只读修改历史；SQLite4 / Preview7 / Format2（兼容原v1）；最终全仓739、JVM30、connected14与模拟器完整闭环通过；v11交付 |
| APK-4 | Planned | 文字/图片 AI 整理、辅助估算、不确定项、用户确认预览 |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

当前证据见 verification/cooking-experience-android.md 与 checkpoints/2026-10-04-cooking-experience.md；严格兼容见 backup-format-v2.md。APK-2 及旧 APK-1 合同保留为历史。不要恢复收藏、购物、菜单规划、Timer 或云同步。APK-3 交付后停止，未授权进入 APK-4 及后续模块。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
