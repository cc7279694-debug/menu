# RECIPIO Android Roadmap

2026-10-05：APK-5A 用户验收后通过普通 fast-forward 提升稳定 main `f7c5d8d` / `v0.6.0-link-import`，历史版本/分支保留。当前另行批准 APK-5B URL-only Android Share；只在当前功能分支实施，不进入5C。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; initial user experience accepted | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过；用户目前未发现问题 |
| APK-2 | Accepted baseline | .recipio Format v1、完整当前/历史图片、安全 Replace；v10 与原 Golden 保留，历史验证数字不复用为 APK-3 结果 |
| APK-3 | Native verified; delivery baseline for APK-4 | 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选照片/评价/备注、只读修改历史；SQLite4 / Preview7 / Format2（兼容原v1）；历史全仓739、JVM30、connected14与模拟器完整闭环通过；v11保留，物理手机未冒称验证 |
| APK-4 | Accepted / Frozen | main d01589e / v0.5.0-ai-intake；用户与自动化证据分开保留，SQLite4 / Backup2不变 |
| APK-5A | Accepted / Stable main | main f7c5d8d / v0.6.0-link-import；公开网页 Native安全GET / DNS固定 / Parser First / 人工Preview / 显式AI；历史960全仓、114JVM、53Android不复用为5B证据 |
| APK-5B | Implemented / emulator verified; pending physical OEM Share Sheet | Android SEND/text/plain 唯一链接 → 原网页入口预填；最终982全仓/125JVM/64Android、覆盖升级与离线通过；保护编辑/AI/恢复/烹饪，pending仅内存、无自动操作；SQLite4/Backup2不变 |
| APK-5C | Deferred; not authorized | 社交/视频、搜索与多做法比较，不在本轮范围 |

当前模块证据见 verification/share-target*.md、checkpoints/2026-10-05-share-target.md。APK-4/5A 验收保留且不扩写为本轮真实Provider证据；本轮真实AI0次，重新执行相应回归。不恢复收藏、购物、菜单、Timer或云同步；交付 APK-5B 后暂停，5C需另行批准。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
