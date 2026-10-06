# RECIPIO Android Roadmap

2026-10-06：当前已批准稳定基线main8b2246d / v0.8.0-share-intake；历史分支/Tag与独立未合并Logo v16保留。本轮仅批准APK-6帮我找做法，在feat/recipio-find-recipe实施，不合并main，不进入视频。

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
| APK-6 | APK_6_RC2_PENDING_DEVICE_TEST; not accepted after physical v17 invalid_output | v18函数参数提交替代正文JSON；1029/441/188/105回归及离线保留验证通过，真机土豆丝一次Search复测独立；不进入下一模块 |

当前模块证据见 verification/find-recipe-rc2*.md、checkpoints/2026-10-06-find-recipe-rc2.md；原v17记录仅历史。已验收模块作为稳定基线继承，不扩写为本轮真实Provider证据；本轮真实AI0次，最终回归已重新执行，441项为1029项子集。不恢复收藏、购物、菜单、Timer或云同步；交付APK-6后暂停，任何后续模块需另行批准。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
