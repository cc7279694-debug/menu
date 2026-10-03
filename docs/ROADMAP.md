# RECIPIO Android Roadmap

2026-10-03 用户确认 APK 路线取代旧 Web Phase 执行顺序。保留旧实现与历史 checkpoint，不在 APK-0 清理旧功能。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Planned | 日常库；首页/我的菜谱/设置；实际用量、步骤、准备、关键事项、本地图片、手动编辑 |
| APK-2 | Planned | 完整备份、验证、恢复与当前数据保护 |
| APK-3 | Planned | 单步放大、可选专注模式、明确完成、轻量做过记录与修改历史 |
| APK-4 | Planned | 文字/图片 AI 整理、辅助估算、不确定项、用户确认预览 |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

只细化 APK-0；后续模块在用户授权时分别设计。不要恢复收藏、购物、菜单规划或云同步。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
