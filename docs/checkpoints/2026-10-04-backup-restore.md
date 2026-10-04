# APK-2｜完整备份与安全恢复 checkpoint

2026-10-04；批准计划 `../superpowers/plans/2026-10-04-apk-2-backup-restore.md`，唯一规范 `../backup-format-v1.md`。实际技术验收状态：**BACKUP_RESTORE_COMPLETE**。最终证据包与普通推送的提交/哈希以交付时实际读取为准，不写自引用提交号。

## 1. 完成功能

- 设置页导出单个 Backup Format v1 `.recipio`：六张业务表、当前图片及修改快照 before/after 引用的旧图片，保留实体 ID、时间、顺序、空字段和中文/换行/Emoji。
- 新建系统文档，不覆盖既有备份；私有完整 ZIP 关闭后校验，再写外部文件并回读验证 manifest、counts、大小和 SHA-256。失败清理本次临时/未验证新文件，provider 拒绝删除时明确提示。
- 容器/manifest/结构/关系/所有图片哈希通过后才 staging，之后用户明确确认“替换当前数据”；取消保留原库/原图。
- 恢复前验证当前库完整私有安全副本；六表 Replace 与恢复元数据单一事务，提交前 counts/FK/完整数据核对。新媒体不可变先落盘，不先删旧图。
- 回调丢失、陈旧 journal 和进程中断均以实际 SQLite commit 元数据及完整引用闭包判断；不盲目重放恢复，不删除已提交引用的 generation。
- Android 核心纯本地，无账号/云依赖/网络权限；Web 适配只提供实际 IndexedDB 契约和诚实原生文件边界。

## 2. 修改文件

新增（按责任分组，完整精确 diff 在审查包）：

- `src/native/backup/`：format、references、coordinator、repository、preview-repository、native-archive、service、restore-recovery、runtime、backup-controls；对应测试、测试 DTO 与实际 SQLite 测试驱动。
- Android：`LocalBackupArchive.java`、`LocalBackupDocuments.java`、`LocalBackupSession.java`、`LocalBackupPlugin.java`、`LocalBackupExportState.java`；Archive/Session/ExportState JVM 测试、系统 provider instrumentation 和测试 manifest。
- `scripts/backup-fixtures.ps1`、`scripts/verify-backup-android.mjs`、`scripts/build-backup-review-packet.mjs`。
- Backup Format v1、批准的 APK-2 plan、本 checkpoint、原生验收报告。

修改：

- `src/native/recipe-store.ts`、`sqlite.ts`、`recipe-model.ts`、`preview-store.ts`：一致快照/事务、共享操作 gate、严格 generation 路径和启动核查。
- `src/native/app.tsx`、`library-app.tsx`、`native-initialization.test.tsx`：设置入口、单例状态、失败封闭和恢复成功后重新读取。
- `src/features/offline/local-db.ts`、`.test.ts`：Dexie v6 仅新增 nativeBackupState 并修正旧版本断言。
- `android/app/build.gradle`、`MainActivity.java`：严格 JSON 解析依赖/主机测试依赖、注册本地备份插件；旧模板 instrumentation 包名断言修复。
- `README.md`、CURRENT_STATE、ROADMAP、DECISIONS、ARCHITECTURE；原先未提交的批准规划内容保留并在原文件增量更新。

无产品文件、用户数据库、图片、旧 APK、模拟器或云资源删除。测试清除只在生成数据的专用 AVD。

## 3. 数据层变化与决定

SQLite v2→v3 仅新增固定单行 `backup_restore_state`，与业务替换同事务提交，不改冻结六表字段语义、不增加同步字段。Dexie v5→v6 仅增加原生恢复 metadata store，不清旧云缓存/旧业务 stores。

`UI → BackupService → Repository / 原生 Archive → SQLite + Device Files`。显式 transaction 的内部 driver 不再嵌套提交；共享 gate 覆盖 CRUD/undo/purge/snapshot/Replace。Portable DTO 不经过编辑器 normalization，图片采用内容 SHA-256 资产引用。

SAF 不保证任意 provider 原子写；采用“私有完整包 + 新文档 + 关闭回读”，不降低标准或作绝对承诺。staging generation 在确认前完成，旧图和安全副本保守保留。可信系统根目录先 canonicalize，但操作/媒体子路径仍拒绝链接逃逸。

无新 npm 依赖；Java Gson 2.11.0 严格流式校验及 host org.json 测试依赖，没有升级既有依赖。完整 v10 APK 审计 allowBackup=false、云/迁移排除，未增加 INTERNET/广泛媒体访问权限；第三方 provider/OEM 行为有明确限制。

## 4. 实际测试

- 全仓 141 文件 / **673 项通过**；备份专项 8/50，界面专项 3/10，均为修补后重新运行，不沿用 APK-1 绿灯。
- TypeScript、ESLint（0 错误/5 条旧警告）、Web build、Capacitor sync、Gradle assembleDebug 全部 exit 0。
- JVM **29 项通过**；完整 connected **7 项通过**，0 failure/error/skip；Android lint 0 错误/34 警告。
- 专用 Android 36 模拟器：系统导出并独立解包核对、空库、仅菜名、全部字段/图片/历史图片、6 类损坏文件拒绝、确认取消、实际 SQL 插入失败回滚、真实 staging 失败保留旧图、进程中断、陈旧 journal、飞行模式冷启动/搜索/图片、v6→v7 与 v9→v10 覆盖升级、v9 外部备份在 v10 恢复，通过。
- connected runner 自动卸载测试 App 后，再装交付 v10，从外部 Golden 实际恢复并重新验证全部行/图片 SHA 和冷启动，测试环境正常关闭保留数据。
- 真实 Chrome 手机/桌面页面检查通过，仅作为 UI 证据，不替代原生。
- 一次独立 SOL 安全自查阻断项（归档前失败漏清新文档）先 RED→GREEN，再实际 SAF 验证；可信根别名和 test-provider 独立类加载修补均有失败日志与最终通过证据。

全部命令、exit、失败/续验经过与证据文件见 [原生验收报告](../verification/backup-restore-android.md)。本地 ledger 保留初次旧 Dexie 测试失败、选择器脚本失败和宿主资源 ANR；不是删除失败或调低断言换绿灯。

## 5. 当前限制 / Not Run

- 真机、其他 API/OEM/provider 全流程；实际系统图片为生成 PNG，其他 MIME 字节映射测过但未做全厂商视觉验收。
- 硬件断电/介质故障、4GiB/1 万图实际设备压测、厂商迁移工具保证；不把进程/空间/IO 故障等同这些测试。
- 旧 Next Production build/线上部署/真实云或私人数据破坏性测试均 Not Run，非本轮范围。
- 未加密；私有安全副本不能防清数据/卸载。旧有效媒体和安全副本保守保留可能占用空间，未新增全库 GC。
- Web preview 无 Service Worker，不承诺断网冷启动。保留现有性能/lint 警告，不做无关重构。

没有未解决的 APK-2 架构或测试阻塞。

## 6. Git 与交付

分支 **feat/recipio-backup-restore**；基线 `2973893`。聚焦提交：`e31aad0` 格式、`f1004a5` 事务 Repository、`09c5b87` 原生归档、`51c4d8a` 崩溃安全服务、`4e7ff61` 设置、`03ed5d3` 最终修补与原生验证。文档/冻结包工具的最终提交写入 packet manifest，不自引用本文件。

只普通推送此功能分支；不合并 main、不创建 PR、不强推、不部署。不提交样本图片/备份/设备数据库/APK/签名/凭据；审查包仅 8 个白名单文本及 manifest，关闭回读 SHA 验证。远端 HEAD 与本地最终 HEAD 是否一致在交付时实际查询。

实际 APK：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\recipio-backup-restore-v10-debug.apk`，**16,513,423 字节**，SHA-256 `37e51d2f2801a45d8f7a1060ec5cb850911ec02a49b66309b9c7b56102957703`。最终 fresh sync/assemble 输出与测试安装的此文件 SHA 完全相同。

生成 Golden：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\golden.recipio`，**2,761 字节**，SHA-256 `6553458a80d0bb38dce32ca791a64f30ea27f569df3ffc034ae7789874e3d313`。

生成空库：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\empty.recipio`，**584 字节**，SHA-256 `1ee4345f279975e80647498a797133093a7f468a91a524f17b4a58e5cd50c4ff`。

审查包：`E:\CODEX\VIBE CODING\recipe-step-app\artifacts\backup-restore\review-packet-backup-restore.zip`；包内 manifest 记录最终代码/文档 HEAD、各文件大小和 SHA，包大小/SHA 在最终交付时读取。

## 7. 下一次继续的位置

**停止等待用户 APK-2 验收。** 不自动进入 APK-3、AI、云同步、加密、提醒或其他新功能。以后维护此模块必须继承 Format v1、单事务提交事实、完整历史引用闭包及 immutable generation 的安全约束；不能通过清库排错。
