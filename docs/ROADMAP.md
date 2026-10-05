# RECIPIO Android Roadmap

2026-10-05：APK-2 用户验收已通过，APK-3 基线为 `78f1877`。APK-4 已实现并按本轮最终 Android Back / IME 范围完成；用户日常 AI 与 Codex 原生证据分开记录。保留底座和旧 Web 回退；无部署，停在 APK-4 交付，不进入 APK-5。

| Module | Status | Scope |
| --- | --- | --- |
| APK-0 | Implemented; awaiting acceptance | 本地 Android + SQLite；菜名 CRUD/search/5 秒撤销；构建、离线、重启、覆盖升级已在模拟器验证 |
| APK-1 | Native verified; initial user experience accepted | 日常库已实现；622 项回归与 6 项 Java 测试通过；原生图片、取消、离线 CRUD、重启、排序、返回键、v5→v6 覆盖升级验证通过；用户目前未发现问题 |
| APK-2 | Accepted baseline | .recipio Format v1、完整当前/历史图片、安全 Replace；v10 与原 Golden 保留，历史验证数字不复用为 APK-3 结果 |
| APK-3 | Native verified; delivery baseline for APK-4 | 完整步骤默认、可选 Focus/Guided、明确最小做过记录、可选照片/评价/备注、只读修改历史；SQLite4 / Preview7 / Format2（兼容原v1）；历史全仓739、JVM30、connected14与模拟器完整闭环通过；v11保留，物理手机未冒称验证 |
| APK-4 | Complete under approved final closeout; awaiting delivery acceptance | 用户真机 Key/账号/文字/截图/Preview/保存六项已接受；实际 WebView/IME/Back8项、connected45、APK应用290、JVM95、离线/同v12覆盖保留与静态安全回归通过；真实AI本轮0次；生产ad54de3未改，SQLite4/Backup2不变；OEM/真实多图/Key轮换未新增验证 |
| APK-5 | Planned | 链接、视频结构与静态关键图、分享接收、找做法和比较 |

当前模块证据见 verification/ai-intake-back-ime-final.md、verification/ai-intake-android.md、checkpoints/2026-10-04-ai-intake.md 与保留的用户验收记录；严格兼容见 backup-format-v2.md。APK-4批准功能/合约不变，旧 pending 检查点为历史；本轮8项原生门禁已关闭，不重复已验收 AI、不把历史数字当新回归。停止等待交付验收。不要恢复收藏、购物、菜单规划、Timer或云同步；APK-5未获实施授权。
此前浏览器 Dexie Repository 与 `/offline/app` 纵切是可复用资产，不是 Android SQLite 验收证据。
