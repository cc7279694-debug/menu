# RECIPIO Android Roadmap

2026-10-04：日常菜谱库原生技术验收已通过，用户下载与初步体验无问题。APK-2 已按批准计划实现并通过本轮技术验收，等待用户验收；保留底座和旧 Web 回退，无部署，不进入后续模块。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; initial user experience accepted | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过；用户目前未发现问题 |
| APK-2 | Native verified; awaiting user acceptance | .recipio Format v1、完整当前/历史图片、校验/staging 后确认、事务、安全副本和启动核查；全仓 673、JVM 29、connected 7 项通过，模拟器导出/清除生成数据恢复/取消/坏包/故障/冷启动/覆盖升级通过；v10 交付 |
| APK-3 | Planned | 单步放大、可选专注模式、明确完成、轻量做过记录与修改历史 |
| APK-4 | Planned | 文字/图片 AI 整理、辅助估算、不确定项、用户确认预览 |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

APK-2 范围见 backup-format-v1.md 与 superpowers/plans/2026-10-04-apk-2-backup-restore.md，实际证据见 verification/backup-restore-android.md；IMPLEMENTATION_PLAN.md 保留为旧 APK-1 合同。不要恢复收藏、购物、菜单规划或云同步。未授权进入 APK-3 及后续模块。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
