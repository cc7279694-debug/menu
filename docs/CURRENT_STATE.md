# Current State

## Current Stage

2026-10-04：APK-1 Android Native Acceptance Gate 技术验收通过，状态 DAILY_LIBRARY_ANDROID_VERIFIED；等待用户体验验收。本轮只修复选图读取边界并补齐原生验证，没有进入备份或 AI。旧失败记录保留，新证据见 `checkpoints/2026-10-04-daily-library-acceptance.md`。

稳定 Android 36 复现了系统授权 URI 原生可读、WebView FileReader 不可读。Android 选图现改为系统选择器 → 原生流式复制 → 私有 images 路径；封面与步骤图共用，不新增网络/相册权限或数据库迁移。最终 v6 已完成稳定环境全新安装、图片、离线 CRUD/重启、返回键，以及保留旧数据的 v5→v6 覆盖升级。测试环境已正常关闭，所有模拟器与旧数据保留。

## Completed

- 保留 APK-0 底座及原 Android 模拟器验证证据，详见原 checkpoint；未覆盖旧 APK。
- 首页、我的菜谱、设置；仅菜名可保存，完整手动编辑食材用量、步骤、提前准备、关键事项、备注、耗时、份数和参考热量。
- 菜名/食材搜索、创建时间排序、100 条分页、不重叠耗时筛选、五秒删除撤销。
- 本地封面与步骤图片适配；Android 使用原生系统选择器直接复制，取消保留原引用，失败保留文本。浏览器仍用 File/IndexedDB。
- 共享 RecipeLibrary 契约；Android SQLite v2 增量迁移、关联表、原子保存及修改快照；浏览器复用 IndexedDB localRecipes/media，数据库版本 5。
- 云缓存清除不会删除新版设备专属图片。
- 本轮修复后完整回归 133 文件/622 项、原生相关 9 文件/34 项通过；Java 复制边界 6 项通过。类型检查、ESLint（0 错误/5 条旧警告）、Vite/Capacitor sync/Gradle Debug 构建通过；Android lintDebug 为 0 错误/30 警告，包含可用空间 API 的优化建议。
- 实际旧 APK-0 SQLite v1→v2 保留原始数据的历史证据继承；本轮重跑独立失败迁移，旧行与 v1 保留。最终 v6 在新稳定模拟器完成全新安装与飞行模式强制停止/重开，SQLite v2 integrity=ok。
- 原生封面新增/替换/移除/重启显示；步骤图片新增/重启显示/移除；真实选择器取消保留原封面、未保存文本及数据库原值；改名、创建时间排序、搜索、完整字段编辑、删除撤销/到期删除、原生返回键保护全部专项通过。
- 实际 v5→v6 `install -r` 后六张表每个字段一致，封面 33,533 字节及 SHA-256 一致，SQLite integrity/foreign_key_check 正常。API37 首次复跑因 CDP 超时失败，一次有界复跑通过，不掩盖旧系统服务 ANR。
- 最终 v6：`artifacts/recipio-daily-library-v6-debug.apk`，16,439,275 字节，SHA-256 `8087A68F79B404A25508D291691B3F9ABE9588B0FE8F84D591D51B3971B90F97`。旧 APK 均保留。
- 浏览器手机/桌面检查，完整菜谱和图片刷新持久化；已加载应用断网新增、编辑、删除撤销通过。

## Pending / Not Run

- 用户体验验收、物理手机/OEM 行为验证未执行；本轮原生证据来自模拟器，不冒充真机。
- 真实系统选择器/视觉解码验收使用 PNG；其他 MIME 的复制映射在 JVM 验证，不等于四种格式在所有 Android 版本上都已实测。
- 备份恢复、烹饪记录、可选 AI 与链接/视频：后续模块，未实现。
- 本预览没有 Service Worker，不承诺断网冷启动/刷新；已加载页面可以本地操作。

## Current Risks

- 未完成备份前，不应存唯一重要数据。清站点数据或卸载会丢失对应本地数据。
- 图片保守保留，未回收孤立文件；无人为大小上限，但受配额、内存和解码能力限制。
- 复制预算按当前可用空间减 32MiB，留数据库余量属于尽力保护；强杀进程可能遗留 .part，尚无启动回收。没有为修复清空数据库或删除原图片。
- API37 测试系统曾有系统服务 ANR/渲染资源警告；后续优先 Android 36 稳定环境，逐个运行模拟器，避免与其他项目争用资源。
- 此前依赖审计记录 21 项（6 moderate / 14 high / 1 critical）；本轮未重新审计或顺便升级依赖。
- 旧 Next.js/Supabase 页面保留且仍需联网，并非新版入口。无推送、部署、云数据修改。

## Current Branch / Module

`feat/recipio-daily-library` / 日常菜谱库；仅本地提交。

## Next Recommended Task

本模块停止等待用户体验验收。用户确认后再单独授权 APK-2 完整备份恢复；目前未实现该模块，不应保存唯一重要数据。

见 PRODUCT_SPEC.md、IMPLEMENTATION_PLAN.md、checkpoints/2026-10-03-daily-library-android.md 和 verification/daily-library-android.md。旧浏览器检查点保留为历史。
