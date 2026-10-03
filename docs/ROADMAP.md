# RECIPIO Android Roadmap

2026-10-04：日常菜谱库原生技术验收已通过，等待用户体验验收；保留底座和旧 Web 回退。未进入后续模块或部署。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; awaiting user acceptance | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过 |
| APK-2 | Planned | 完整备份、验证、恢复与当前数据保护 |
| APK-3 | Planned | 单步放大、可选专注模式、明确完成、轻量做过记录与修改历史 |
| APK-4 | Planned | 文字/图片 AI 整理、辅助估算、不确定项、用户确认预览 |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

当前范围见 IMPLEMENTATION_PLAN.md；原生验收后再单独确认备份恢复。不要恢复收藏、购物、菜单规划或云同步。未授权进入后续模块。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
