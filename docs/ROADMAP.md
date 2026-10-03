# RECIPIO Android Roadmap

2026-10-03：日常库浏览器实现后，用户明确要求先完成 APK-1 Android Native Acceptance Gate，再考虑备份恢复。保留底座和旧 Web 回退；本轮不增加功能或部署。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native acceptance blocked by test environment | 日常库已实现；614 项回归通过；剩余图片/排序专项与最终覆盖安装尚未通过原生验收 |
| APK-2 | Planned | 完整备份、验证、恢复与当前数据保护 |
| APK-3 | Planned | 单步放大、可选专注模式、明确完成、轻量做过记录与修改历史 |
| APK-4 | Planned | 文字/图片 AI 整理、辅助估算、不确定项、用户确认预览 |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

当前范围见 IMPLEMENTATION_PLAN.md；原生验收后再单独确认备份恢复。不要恢复收藏、购物、菜单规划或云同步。未授权进入后续模块。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
