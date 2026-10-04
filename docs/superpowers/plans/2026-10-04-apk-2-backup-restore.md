# APK-2 完整备份与安全恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. 必要独立审查可委托，但只进行本模块，不默认开启多轮全仓研究。

**Goal:** Android 设置页导出 `.recipio`，经完整校验/预览/确认后安全替换源数据与图片，失败保护原库。

**Architecture:** BackupService 协调 Recipe BackupRepository、媒体接口及原生 Archive 插件。完整新媒体先落盘、SQLite 事务同时切换业务数据与 restore commit metadata；进程中断通过元数据和引用闭包判断事实。Java 流式 ZIP 与逻辑 DTO 解耦。

**Tech Stack:** 现有 React/TypeScript/Zod、SQLite 8.1.1、Dexie Preview、Capacitor 8.5.2，Java 标准 ZIP/MessageDigest/SAF。默认无新 npm 依赖。

**Spec:** `docs/backup-format-v1.md`（唯一格式与安全规范，用户已于 2026-10-04 确认）。用户完整需求来自 2026-10-04 APK-2 粘贴文本；该计划不改变功能范围。

状态：用户批准后固定 SOL 完成实现与修补后新鲜验证；基线 `2973893`，分支 `feat/recipio-backup-restore`，代码提交至 `03ed5d3`。本轮 673 项全仓、29 项 JVM、7 项 connected 全部通过；模拟器导出/清除生成数据恢复/坏包拒绝/取消/故障/飞行模式冷启动/覆盖升级完成。准确命令、产物与未运行边界见 `docs/verification/backup-restore-android.md`，不将用户旧 APK 下载反馈或浏览器绿灯当作独立真机测试。

执行记录：复选框标记任务交付，逐项证据及 Not Run 以验收报告为准；byte 百分比事件未新增，界面使用 BackupService 阶段进度、原生 status 和最终统计，避免高频桥接。实际 service 测试文件为 `service.test.mjs`，SQLite/文件使用真实测试边界；未复用不存在的 `service.test.ts` 或 `restore-recovery.test.mjs` 来声称通过。Task7 最终冻结包/远端 HEAD 由实际交付命令核对，不在本文件写自引用 SHA。

## Global Constraints

- 仅 APK-2；Replace，不做合并/部分/加密/云/AI/烹饪历史新功能。
- 全部实际业务实体 ID/时间/顺序保留；当前及历史图片引用闭包；设置当前为空，不虚构新用户功能。
- 新图片不可变先落盘，原子 SQL 数据替换后才可视为成功；不清库排错，不先删旧图片。
- v1 limits：manifest 1MiB、data 16MiB、压缩/解压各 4GiB、media 10,000、entries 10,002、recipes 10,000、各子项 100,000、changes 20,000、JSON depth 32、entry name 128。
- FormatVersion=1；SQLite v2→v3 只增加 restore commit metadata；四种现有图片 MIME，不新增权限。
- 任意 SAF provider 不承诺原子文件写入；完整私有包 + 新文档不覆盖 + 关闭后回读 SHA 才报成功。
- 原生验收只动新专用测试环境和生成数据，不清用户手机或旧验收环境，不触云资源/线上部署/main。
- 测试后允许聚焦 Conventional Commits、普通 push 当前功能分支，不强推或合并。

## Review Focus

1. SQL commit 已成功但桥接响应丢失：不能删除被新库引用的 generation（Task 4）。
2. 旧历史快照引用已移除封面：导出与清理不能只扫描当前图片（Task 1、4）。
3. 中央目录截断/重复路径/假 size/JSON 深度炸弹：完整校验之前不能写业务库（Task 3）。
4. 删除清理 timer 与 Replace 同时执行：必须使用数据层同一协调器，不能只依赖 UI 禁用（Task 2）。
5. Provider 写到一半报错/close 失败/无法回读：不得报告成功或覆盖旧备份（Task 3、5）。

## Task 1：便携源数据格式与 Golden 样本

**Files:** 新增 `src/native/backup/format.ts`、`format.test.ts`、`references.ts`、`references.test.ts`；测试夹具 `src/native/backup/test-fixtures.ts`（不含真实菜谱/图片）。格式规范只更新既有 `docs/backup-format-v1.md`。

**Interfaces:**

- `backupDataSchema` / `backupManifestSchema`：严格、无 trim/coerce/default 的 Zod Schema，导出 `BackupData`、`BackupManifest` 类型。
- `BackupSourceSnapshot` 按唯一规范第4节定义。`MediaInspection={sourcePath:string,assetId:string,path:string,mimeType:string,size:number,sha256:string}`；file paths只接收集中localImagePath验证结果，asset path严格容器白名单。
- `validateBackupData(data: unknown, manifest: unknown): {data: BackupData; manifest: BackupManifest}`：关系/唯一性/数量/媒体闭包检查。
- `collectImageReferences(snapshot: BackupSourceSnapshot): string[]`：当前及 before/after 快照确定字段，去重，不把 notes 内容当路径。
- `toPortableData(snapshot: BackupSourceSnapshot, assets: MediaInspection[]): BackupData` / `fromPortableData(data: BackupData, paths: Record<string,string>): BackupSourceSnapshot`：只重映射媒体字段；DTO 的所有实际字段见唯一规范。

- [x] 写空库、啤酒鸭仅菜名、完整可乐鸡翅（≥3 步、封面/步骤图、历史旧封面、不同用量、文字/数字提前准备、关联事项、中文换行Emoji）测试。断言手工指定 ID/时间/顺序/counts；同样输入得到语义相同数据。
- [x] 写重复业务 ID、重复复合主键、非连续位置、非法数值/时间、悬空菜谱/步骤/资产、错 counts/未来版本、超过边界输入的拒绝测试；断言原输入未被修改/trim。写普通 notes 含 `images/...` 但不成为资产的测试。
- [x] `npx.cmd vitest run src/native/backup/format.test.ts src/native/backup/references.test.ts --maxWorkers=1`，记录 RED 原因；实现以上 API；重跑 GREEN。SHA 的实际字节校验由 Task 3负责，不用 format 测试模拟“已经验证”。
- [x] 自查实际 DTO 与规范一致，遗留历史字段不静默丢失。测试通过后聚焦 commit `feat(backup): define portable backup format`。

## Task 2：一致快照、写入隔离与真实事务

**Files:** 新增 `src/native/backup/coordinator.ts`、`coordinator.test.ts`、`repository.ts`、`repository.test.mjs`、`preview-repository.test.ts`；修改 `src/native/recipe-store.ts`、`sqlite.ts`、`preview-store.ts`、`recipe-model.ts`（严格新 generation 路径）、`src/features/offline/local-db.ts`（v6仅新增nativeBackupState metadata store），不改旧产品数据。

**Interfaces:**

- `DataOperationCoordinator.withDataAccess<T>(work:()=>Promise<T>): Promise<T>` / `.withExclusive<T>(work:()=>Promise<T>): Promise<T>`，既有写操作/读一致性、undo、purge 共用同一实例，内部事务不二次入锁。
- `SqlDriver.transaction<T>(work:(tx: SqlDriver)=>Promise<T>): Promise<T>`：事务内 query/run/batch；SQLite 插件显式事务，tx batch/run 不嵌套提交。
- `BackupRepository.snapshot(): Promise<BackupSourceSnapshot>`，完整六表，不通过 UI 的分页列表逐条 N+1 读取。
- `BackupRepository.replace(snapshot:BackupSourceSnapshot, commit:RestoreCommit): Promise<void>`；`readRestoreCommit():Promise<RestoreCommit|null>`。RestoreCommit={operationId,generationId,dataSha256,committedAt}。
- `backup_restore_state` 固定单行；metadata 不进用户包。源 DTO 当前设置严格为空。Preview 只替换新本地库所属数据，旧云/cache 等 stores 保持原样。

- [x] 先写真实 Node SQLite v1/v2→v3 迁移数据保留、失败迁移回滚；全六表快照与时间字段；100 条以上无截断测试。
- [x] 先写 Replace 删除后第 N 项插入失败、提交前 counts/FK 不符的回滚测试，比较所有旧表字段和 metadata；空库替换、旧 A→新 B不合并、ID/时间不重打。
- [x] 先写并发 save/undo/purge 与 snapshot/Replace 的排序测试，确保 timer 不越过协调器；真实 IndexedDB 的事务失败回滚和其他旧 stores 不变。
- [x] 运行 `npx.cmd vitest run src/native/backup src/native/recipe-store.test.mjs src/native/recipe-details.test.mjs src/native/preview-store.test.ts --maxWorkers=1 --no-file-parallelism` RED→最小实现→GREEN；保留原测试，不用重写期望隐藏数据变化。
- [x] 聚焦 commit `feat(backup): add transactional snapshot and replace repositories`。

## Task 3：原生流式 ZIP、系统文件与容器防护

**Files:** 新增 Android 同包 `LocalBackupArchive.java`、`LocalBackupPlugin.java`；新增对应 `src/test/java/app/recipio/local/LocalBackupArchiveTest.java`，`src/androidTest/java/app/recipio/local/LocalBackupPluginTest.java`；修改 MainActivity 注册插件；新增 `src/native/backup/native-archive.ts` / `.test.ts`。

**Interfaces:** 注册 `LocalBackup`。单操作 token 为插件内部创建的 UUID，不接受任意原始文件路径。

- `chooseExport({suggestedName}): Promise<{cancelled:true}|{token:string}>`。
- `inspectMedia({token,paths}): Promise<{assets:MediaInspection[]}>`：按原数据安全路径读私有文件，分块 SHA；sourcePath→assetId/MIME/size/hash，禁止相对路径逃逸。
- `writeExport({token,data:BackupData}): Promise<{manifest:BackupManifest,fileName:string,size:number,sha256:string}>`：实际包版本/库版本由受控调用传入并交叉校验；先私有完整包再外部写与回读。
- `chooseRestore(): Promise<{cancelled:true}|{token:string,manifest:BackupManifest,data:unknown}>`：原生先容器/媒体完整性验证，再返回有界 JSON供 Task1语义检查；不触业务库。
- `stageMedia({token}): Promise<{generationId:string,paths:Record<string,string>}>`；`discard({token}):Promise<void>`；`status():Promise<ArchiveOperationStatus>`；进度 listener；只允许安全已注册操作。
- `createSafetySnapshot({token,data:BackupData,paths:Record<string,string>,sourceSchemaVersion:number}):Promise<{size:number,sha256:string}>`：写/验证私有完整包，不弹外部保存器；无法验证则停止Replace。
- `writeJournal({token,phase:"staged"|"committing",dataSha256:string,generationId:string}):Promise<void>` / `readJournal():Promise<RestoreJournal|null>` / `finishOperation({token,committed:boolean}):Promise<void>`：phase不决定SQL结果；最后一项只能在Task4确认实际commit后调用。
- `ArchiveOperationStatus` 为严格单操作state/progress/阶段结果或idle；`RestoreJournal={operationId:string,generationId:string,dataSha256:string,phase:"staged"|"committing"}`。Native桥只接受本operation实际登记的generation，不能凭JS字符串删除目录。PackageManager读实际appVersion，sourceSchemaVersion取Repository实际版本，不沿用npm/固定旧APK号。

- [x] Java RED：空库合法ZIP；PNG/WebP等实际 bytes及已知SHA；读/输出/close失败；假长度和资源边界；中央目录损坏/截断、CRC错误、缺manifest、额外entry、重复path、`../`/绝对/反斜杠、空/非ZIP、hash错/媒体missing、伪MIME。每项旧源图片保持不变。
- [x] JVM用实际临时文件与受控 Input/OutputStream，不把“fake returned success”当 ZIP 成功。插件provider边界放 Android测试，不能拿Java host模拟SAF。
- [x] 执行 `./android/gradlew.bat -p android :app:testDebugUnitTest --console=plain --max-workers=2` RED→标准 ZipFile/ZipOutputStream、MessageDigest、64KiB流式、私有随机路径及独立executor实现→GREEN。
- [x] 增加桥接调用的非法token/重复operation/cancel测试。原生进程启动残留暂不删除源文件；Task4提供安全reconcile决策。
- [x] 聚焦 commit `feat(backup): add native streaming archive and document picker`。

## Task 4：服务编排、安全副本与崩溃一致性

**Files:** 新增 `src/native/backup/service.ts`、`service.test.ts`、`restore-recovery.ts`、`restore-recovery.test.mjs`；native archive 增加私有 safety snapshot/journal 管理及专用测试；集成 app.tsx / sqlite.ts 的启动 reconcile。

**Interfaces:**

- `BackupService.export():Promise<void>`、`.inspectRestore():Promise<void>`、`.confirmReplace():Promise<void>`、`.cancel():Promise<void>`、`.getState():BackupState`、`.subscribe(listener):()=>void`；单例不会随 React 页面卸载消失。
- BackupState区分idle/choosing/preparing/media/writing/validating/preview/restoring/success/cancelled/error/uncertain；预览包含备份摘要和当前实际X，不含外部URI路径。
- `reconcileRestore(repository:BackupRepository,archive:ArchivePort):Promise<RecoveryResult>`；SQLite commit元数据+引用闭包决定safe cleanup，journal不是权威。

- [x] RED：从真实repository/流式文件导出再Replace往返；自动安全副本创建/校验失败止步；图片第N项staging失败；事务失败；提交成功但回调抛错；SQLcommit后journal仍旧phase；未完journal/损坏journal；空备份提交；旧历史封面；清理失败不报假恢复失败。
- [x] 断言旧行/图片仍存在，或完整新图可读；绝无数据库新版本却缺图。测试使用真实SQLite及真实文件，外部系统选择器可替身，不能伪造数据安全边界。
- [x] 验证取消预览与二次确认前退出不写库；Commit不可半途取消；重复confirm/组件重挂载只执行一次；当前数量变化重显X后再确认。
- [x] `npx.cmd vitest run src/native/backup --maxWorkers=1 --no-file-parallelism` RED→实现→GREEN；再跑对应Java/Android残留操作测试。
- [x] 聚焦 commit `feat(backup): restore validated data with crash-safe media generations`。

## Task 5：设置页完整状态与移动端入口

**Files:** 新增 `src/native/backup/backup-controls.tsx` / `.test.tsx`；修改 library-app.tsx、app.tsx；保留现有按钮/布局组件，不重做首页。

**Consumes:** Task4单例BackupService，Task2共享写入隔离。UI不直接调用SQL/目录。

- [x] RED：导出/导入可访问入口、进度、全部摘要、未加密提示、明确“恢复并替换当前数据”及X、取消、二次确认、损坏/未知版本/IO错误、重试、重复点击、离开再进入与 Android Back。
- [x] 实现“设置→数据与备份”；Web预览明确原生系统文件能力边界，不显示假的“完整备份成功”。恢复成功触发重新读取列表/搜索，清掉旧已选项和undo状态。
- [x] `npx.cmd vitest run src/native/backup/backup-controls.test.tsx src/native/library-app.test.tsx src/native/native-initialization.test.tsx --maxWorkers=1` GREEN；浏览器手机/桌面无横向溢出、触控与错误恢复检查。
- [x] 聚焦 commit `feat(settings): add full backup and replace restore controls`。

## Task 6：真实 Android 验收、破坏性边界与完整回归

**Files:** 新增 `scripts/verify-backup-android.mjs`、专用生成Golden/坏包工具及 `docs/verification/backup-restore-android.md`。复用android-webview.mjs，只扩展与本任务有关的功能。`scripts/verify-daily-android.mjs` 中明确v2的历史断言保留原含义，新模块用独立v3验收脚本，不能把历史v2结果误算为APK-2通过。

- [x] 创建非既有数据的专用API36测试AVD（存在同名先检查、不可force/wipe）；明确serial与只有生成样本后才允许 `pm clear app.recipio.local`。不得在用户真机或旧验收AVD执行清除。
- [x] 真实UI创建Golden数据和封面/步骤图、编辑后旧图进入历史；ACTION_CREATE_DOCUMENT导出 `.recipio` 到Downloads；记录path/size/SHA。拉取包独立比较六表便携字段与媒体字节。
- [x] 清仅专用测试app数据→冷启动→系统选择包→校验预览/取消→确认恢复→比较实体和bytes→飞行模式 force-stop重开，搜索、当前与步骤图可读。
- [x] 已有临时A时取消保留，再Replace仅含备份B；坏data/hash/图missing/版本/ZIP攻击包拒绝且旧表/图片hash不变。
- [x] 故障原生instrumentation：staging失败、事务中途失败、SQL前/后杀进程、marker遗留，全部读取实际SQLite/私有文件验证；不得为注入故障给生产UI留debug入口。
- [x] 从保留的v6测试fixture到APK-2正常 `install -r` 后原数据不变；新备份再覆盖更高versionCode同代码构建仍可校验/恢复。旧v6尚无备份功能，不能宣称v6产出的旧包兼容已验证。
- [x] 完整命令逐条记录exitcode/count/fail/skip：`npm.cmd test -- --pool=threads --maxWorkers=2 --testTimeout=120000 --hookTimeout=120000`；`npm.cmd run typecheck`；`npm.cmd run lint`；`npm.cmd run build:local`；`npm.cmd run sync:android`；Gradle `:app:testDebugUnitTest :app:connectedDebugAndroidTest lintDebug assembleDebug`；命名独立APK build-apk.ps1（首个APK-2 versionCode7，versionName0.3.0-backup-restore）。旧Next线上build不是此次原生运行验收，Not Run如实记录。
- [x] 从实际最终APK/备份文件取hash，不沿用中间hash；无设备则只交付PENDING_DEVICE_TEST，不能完整宣布通过。

## Task 7：独立安全审查、文档与交付

**Files:** 更新 CURRENT_STATE / ROADMAP / DECISIONS / ARCHITECTURE / README 当前段（不删旧历史）；新增 APK-2 checkpoint 和 `scripts/build-backup-review-packet.mjs`；唯一格式规范确认实现后同步。

- [x] 一次独立审查恢复原子性、commit响应丢失、损坏包/资源边界、媒体闭包和取消；修复阻断项时先加RED用例，不顺手重构全仓。
- [x] 生成review-packet-backup-restore.zip，仅白名单manifest.json、diff.patch、checkpoint.md、verification.md、backup-format-v1.md、android-verification.md、test-results.txt、sample-backup-metadata.txt；样本只为生成数据。检查每个文件hash、无真实照片/菜谱/数据库/credentials；实际生成包再验证entries。
- [x] `git diff --check`、检查精确提交文件和敏感信息；所有适用验收通过后聚焦最终commit，普通 `git push -u origin feat/recipio-backup-restore`，不main/强推/PR/部署。
- [x] 报告完整结果与未运行项、模块状态 BACKUP_RESTORE_COMPLETE / PENDING_DEVICE_TEST / BLOCKED，据事实选择；停止等用户验收，不进入 APK-3 或AI。

## 集中审核与执行方式

本用户已给出固定需求与实施目标，本计划不新增产品选择。推荐原生执行：当前代理逐任务实施，只在安全边界进行一次独立审查。若用户明确改为子代理执行，先按对应Skill路由；不要求用户更换当前可执行模型。

当前停止点：APK-2 已完成适用技术验收，交付后等待用户验收。继承已批准的 SAF“完整私有包+不覆盖+回读”、SQLite v3 提交事实和旧图/安全副本保守保留决定；不重复确认、不切换模型、不进入 APK-3。
