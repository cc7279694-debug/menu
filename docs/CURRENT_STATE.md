# Current State

## Current Stage

2026-10-04：用户已批准 APK-4 计划提交 `c8606e3` 与 `ai-intake-contract.md`，当前在 `feat/recipio-ai-intake` **连续实施 Task1–10**。继承 APK-3 `78f1877664db0b0015c132e970a4cfffe7ff03fc`；SQLite4/Preview7/Backup2冻结。用户新要求首次真实集成先1次最小图片/JSON preflight，随后最多3次人工smoke，多图仅前两项成功后进行；没有模型/账号权限则明确停止，不换模型。

本轮仅文档和分支：未修改业务代码、依赖、权限、数据库或备份，未构建新 APK，未执行 APK-4 自动化/Android 测试，真实 Provider 调用 0 次。官方模型/接入文档已核对；账户权限、密钥、真实识别质量未验证。现有 APK-3 技术状态仍为 `APK_3_COMPLETE`，模拟器证据不是物理手机验收；原计划 `fa6aa4b`、旧产物和证据全部保留。

当前真实实现：Android SQLite v4、Preview Dexie v7、Backup Format v2（读严格原 v1/v2，写 v2）、versionCode11 / `0.4.0-cooking-experience`。接受的 APK-2 基线 `b541d8a` 及原 APK/Golden 保留；旧数字只作历史，不证明 APK-3。最终交付与证据见 `checkpoints/2026-10-04-cooking-experience.md`、`verification/cooking-experience-android.md`。

APK-1 Android Native Acceptance Gate 技术验收通过，状态 DAILY_LIBRARY_ANDROID_VERIFIED。原生选图修复与证据继承 `checkpoints/2026-10-04-daily-library-acceptance.md`；用户初步体验反馈不等同本代理已完成物理手机全流程测试。

稳定 Android 36 复现了系统授权 URI 原生可读、WebView FileReader 不可读。Android 选图现改为系统选择器 → 原生流式复制 → 私有 images 路径；封面与步骤图共用，不新增网络/相册权限或数据库迁移。最终 v6 已完成稳定环境全新安装、图片、离线 CRUD/重启、返回键，以及保留旧数据的 v5→v6 覆盖升级。测试环境已正常关闭，所有模拟器与旧数据保留。

## Completed

- APK-3：完整步骤仍为默认主路径；Focus/Guided 可选、仅查看索引；用户明确完成才生成最小做过记录，照片/评价/备注可选。修改历史只读，当前菜谱是认可的最新做法，无版本切换/回滚。
- SQLite3→4 / Dexie6→7 增量迁移；记录/修改历史游标分页；成品照片和封面共享真实引用，撤销/历史/导出 pin 均保护文件。严格 v1 校验语义不变，仅内部补空 cookingRecords；v2 包含全部七实体和当前/旧/成品图片，仍使用安全副本和单事务 Replace。
- 最终实现重新执行全仓154文件/739项；原生相关30文件/151项为其子集；JVM30、完整 connected14项均通过。类型检查、ESLint（0错误/5旧警告）、Vite build、Capacitor sync、Gradle Debug/测试APK通过；Android lint 0错误/34警告。真实导出/取消/坏包拒绝/插入故障回滚/v1兼容/v2清除生成数据后恢复/图片SHA/离线冷启动/返回/大字体/两次覆盖安装通过。
- 最终 `artifacts/recipio-cooking-experience-v11-debug.apk`：16,523,535字节，SHA-256 `2dc868bb72b537798e17471e1a2621bc46cf4b9f2c15b9045f6590a3e02fb82d`。测试v2备份：3,154字节，SHA-256 `efe5d4d014ac81031c985213dff3e778926e10e2817f96d54bde15f763013ded`；绝对路径见验收报告。恢复及升级未使用真实个人数据。
- 本轮修复了延迟完成后的导航竞态及原生备份先回复后释放锁的竞态；均有 RED→GREEN 证据，最终设备和完整回归基于修复后的同一 APK。资源压力/SystemUI ANR单独记录为环境事件，没有改应用返回键或放宽验证掩盖。

以下 APK-0/1/2 结果是已接受的历史基线：

- APK-2：严格 Backup Format v1、六表和完整当前/历史图片；校验/staging 后确认 Replace、安全副本、单事务提交事实、启动核查及设置入口；根路径与导出提前失败清理修补先 RED→GREEN。
- 本轮最终全仓 141 文件/673 项、JVM 29 项、完整 connected 7 项通过；类型/ESLint（0 错误/5 条旧警告）/Web build/Capacitor sync/assembleDebug 通过，Android lint 0 错误/34 警告。模拟器真实导出、清除生成数据恢复、取消、6 类坏包拒绝、SQL 回滚、staging 故障、进程中断、飞行模式冷启动及覆盖升级通过。
- APK-2 最终 `artifacts/recipio-backup-restore-v10-debug.apk`：16,513,423 字节，SHA-256 `37e51d2f2801a45d8f7a1060ec5cb850911ec02a49b66309b9c7b56102957703`。Golden 2 道菜/3 资产及空库外部备份已回读验证；路径/大小/SHA、失败及续验边界见 `verification/backup-restore-android.md`、`checkpoints/2026-10-04-backup-restore.md`。本任务 AVD 正常关闭、数据保留。
- 保留 APK-0 底座及原 Android 模拟器验证证据，详见原 checkpoint；未覆盖旧 APK。
- 首页、我的菜谱、设置；仅菜名可保存，完整手动编辑食材用量、步骤、提前准备、关键事项、备注、耗时、份数和参考热量。
- 菜名/食材搜索、创建时间排序、100 条分页、不重叠耗时筛选、五秒删除撤销。
- 本地封面与步骤图片适配；Android 使用原生系统选择器直接复制，取消保留原引用，失败保留文本。浏览器仍用 File/IndexedDB。
- 共享 RecipeLibrary 契约；APK-1 基线 Android SQLite v2 增量迁移、关联表、原子保存及修改快照；浏览器复用 IndexedDB localRecipes/media，基线版本 5。APK-2 当前分别为 v3/v6，只增加恢复元数据。
- 云缓存清除不会删除新版设备专属图片。
- APK-1 历史修复后完整回归 133 文件/622 项、原生相关 9 文件/34 项通过；Java 复制边界 6 项通过。历史类型、ESLint、Vite/sync/Debug 及 lintDebug（0 错误/30 警告）见旧 checkpoint，不是本轮 APK-2 最终结果。
- 实际旧 APK-0 SQLite v1→v2 保留原始数据的历史证据继承；本轮重跑独立失败迁移，旧行与 v1 保留。最终 v6 在新稳定模拟器完成全新安装与飞行模式强制停止/重开，SQLite v2 integrity=ok。
- 原生封面新增/替换/移除/重启显示；步骤图片新增/重启显示/移除；真实选择器取消保留原封面、未保存文本及数据库原值；改名、创建时间排序、搜索、完整字段编辑、删除撤销/到期删除、原生返回键保护全部专项通过。
- 实际 v5→v6 `install -r` 后六张表每个字段一致，封面 33,533 字节及 SHA-256 一致，SQLite integrity/foreign_key_check 正常。API37 首次复跑因 CDP 超时失败，一次有界复跑通过，不掩盖旧系统服务 ANR。
- 最终 v6：`artifacts/recipio-daily-library-v6-debug.apk`，16,439,275 字节，SHA-256 `8087A68F79B404A25508D291691B3F9ABE9588B0FE8F84D591D51B3971B90F97`。旧 APK 均保留。
- 浏览器手机/桌面检查，完整菜谱和图片刷新持久化；已加载应用断网新增、编辑、删除撤销通过。

## Pending / Not Run

- 用户已反馈下载和初步体验正常；物理手机/OEM 全流程独立验证未执行，既有原生技术证据来自模拟器，不冒充真机。
- 真实系统选择器/视觉解码验收使用 PNG；其他 MIME 的复制映射在 JVM 验证，不等于四种格式在所有 Android 版本上都已实测。
- APK-2 用户验收已通过；APK-3 模拟器技术验收完成，物理手机/OEM、极限规模、硬件掉电、所有 MIME 在所有系统的选择器显示未实测；没有未解决的 APK-3 迁移/恢复/图片引用架构阻塞。APK-4 文字/截图 AI 的实施计划待批准；链接/视频仍属未授权实施的 APK-5。
- APK-4 后续必须证明原生安全密钥、显式原生 Qwen、临时截图及人工审核门禁；计划和旧测试不能作为新鲜证据。当前无用户秘密、无真实 AI 请求、无 APK-4 安装或费用。
- 本预览没有 Service Worker，不承诺断网冷启动/刷新；已加载页面可以本地操作。

## Current Risks

- 完整备份已验证；清站点数据或卸载仍会丢失本地数据及私有安全副本。应先导出应用外已验证备份，当前不加密。
- 图片仅对明确删除候选执行全引用复查，草稿/替换旧图/未知孤立文件保守保留；无人为大小上限，但受配额、内存和解码能力限制。
- 复制预算留 32MiB 数据库余量是尽力保护；APK-2 有操作级 staging 启动核查/清理，既有选图模块的独立 .part 不在此全库 GC 范围。没有为修复清空用户数据库或删除原图。
- API37 测试系统曾有系统服务 ANR/渲染资源警告；后续优先 Android 36 稳定环境，逐个运行模拟器，避免与其他项目争用资源。
- 此前依赖审计记录 21 项（6 moderate / 14 high / 1 critical）；本轮未重新审计或顺便升级依赖。
- 旧 Next.js/Supabase 页面保留且仍需联网，并非新版入口。仅普通推送当前功能分支；无 main 合并、部署、云数据修改。原生 APK 无 INTERNET 权限。

## Current Branch / Module

`feat/recipio-ai-intake` / APK-4 计划待批准；由 APK-3 交付 `78f1877664db0b0015c132e970a4cfffe7ff03fc` 创建。当前只有聚焦计划文档提交，普通 push 留到 APK-4 最终交付；不合并 main、不部署。APK-2/3 检查点、备份、旧功能分支和产物全部保留；SQLite4 / Preview7 / Backup2 当前实际实现不变。提交自身的 SHA 以 Git HEAD 为准，不写伪自引用。

## Next Recommended Task

等待用户/独立开工前审阅确认 `superpowers/plans/2026-10-04-apk-4-ai-intake.md` 与 `ai-intake-contract.md`。批准后从 Task1 的 strict draft/review/normalization RED 测试开始，按 Task1–10 连续完成实现、同版本验证和交付；普通细节不再逐项询问。仅当前模块，不进入 APK-5。

见 PRODUCT_SPEC.md、IMPLEMENTATION_PLAN.md、checkpoints/2026-10-03-daily-library-android.md 和 verification/daily-library-android.md。旧浏览器检查点保留为历史。
