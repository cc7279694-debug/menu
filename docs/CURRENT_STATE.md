# Current State

## Current Stage

2026-10-04：用户已验收 APK-2 并批准 APK-3 冻结产品范围。已核对干净的 `feat/recipio-backup-restore` / `b541d8acfb2aec75dd139705030f3e647fc5a24a` 与远端一致，从其建立 `feat/recipio-cooking-experience`。固定 SOL；现完成最小审计及一次实施计划，按 writing-plans 门禁等待计划确认，未开始 APK-3 业务代码、迁移、测试或设备操作。计划：`superpowers/plans/2026-10-04-apk-3-cooking-experience.md`。

当前实现仍是 APK-2：SQLite v3、Dexie v6、Backup Format v1、versionCode10；APK-3 的 v4/v7/v2/versionCode11 都是计划值，不能当作已实现。APK-2 最终代码修补至 `03ed5d3`、交付文档提交 `b541d8a`，原验证结果和证据继续保留，不用来证明 APK-3 已通过。

APK-1 Android Native Acceptance Gate 技术验收通过，状态 DAILY_LIBRARY_ANDROID_VERIFIED。原生选图修复与证据继承 `checkpoints/2026-10-04-daily-library-acceptance.md`；用户初步体验反馈不等同本代理已完成物理手机全流程测试。

稳定 Android 36 复现了系统授权 URI 原生可读、WebView FileReader 不可读。Android 选图现改为系统选择器 → 原生流式复制 → 私有 images 路径；封面与步骤图共用，不新增网络/相册权限或数据库迁移。最终 v6 已完成稳定环境全新安装、图片、离线 CRUD/重启、返回键，以及保留旧数据的 v5→v6 覆盖升级。测试环境已正常关闭，所有模拟器与旧数据保留。

## Completed

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
- APK-2 用户验收已通过；真机/OEM 与极限规模/硬件掉电未实测。APK-3 实施计划待确认，暂无发现必须改变冻结语义/恢复原子性的架构阻塞。原生烹饪记录尚未实现；可选 AI 与链接/视频继续后置。
- 本预览没有 Service Worker，不承诺断网冷启动/刷新；已加载页面可以本地操作。

## Current Risks

- 完整备份已验证；清站点数据或卸载仍会丢失本地数据及私有安全副本。应先导出应用外已验证备份，当前不加密。
- 图片保守保留，未回收孤立文件；无人为大小上限，但受配额、内存和解码能力限制。
- 复制预算留 32MiB 数据库余量是尽力保护；APK-2 有操作级 staging 启动核查/清理，既有选图模块的独立 .part 不在此全库 GC 范围。没有为修复清空用户数据库或删除原图。
- API37 测试系统曾有系统服务 ANR/渲染资源警告；后续优先 Android 36 稳定环境，逐个运行模拟器，避免与其他项目争用资源。
- 此前依赖审计记录 21 项（6 moderate / 14 high / 1 critical）；本轮未重新审计或顺便升级依赖。
- 旧 Next.js/Supabase 页面保留且仍需联网，并非新版入口。无推送、部署、云数据修改。

## Current Branch / Module

`feat/recipio-cooking-experience` / APK-3 计划审核阶段；从已验收 `b541d8a` 创建。只准备产品已批准增量和一次实施计划，不重新访谈或换路线。普通提交/最终推送本功能分支，不合并 main、不部署；APK-2 检查点/备份/产物全部保留。

## Next Recommended Task

等待用户确认 `2026-10-04-apk-3-cooking-experience.md` 后，SOL 按同一计划测试先行完整实施；内部任务不再逐项询问。先原生做菜记录迁移/图片引用，再补齐 v2 + 严格 v1 导入，随后接查看/完成/历史 UI，最后重新全量及实际 Android 验证。未确认前不编码；完成 APK-3 后停止，不进入 AI。

见 PRODUCT_SPEC.md、IMPLEMENTATION_PLAN.md、checkpoints/2026-10-03-daily-library-android.md 和 verification/daily-library-android.md。旧浏览器检查点保留为历史。
