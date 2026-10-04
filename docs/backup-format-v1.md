# APK-2：完整备份与安全恢复设计 / Backup Format v1

2026-10-04，用户已确认的 Backup Format v1。实现与最终验证结果见 APK-2 checkpoint 和 `verification/backup-restore-android.md`；本文件定义格式与安全边界，不替代验收证据。

本文件是本模块唯一格式规范及安全设计；执行任务见 `superpowers/plans/2026-10-04-apk-2-backup-restore.md`。继承用户提供的 APK-2 任务，不重新访谈或比较产品路线。

## 1. Task Contract

- Goal：设置页导出单个 `.recipio` 文件；完整校验、预览和二次确认后，以 Replace 恢复源数据及图片。任何提交前失败不修改当前库；提交中断后只能是完整旧库或完整新库。
- Scope：当前 Android 菜谱库、修改快照、媒体、备份服务、系统文件选择、事务边界及本模块验证工具。Web 开发适配层复用逻辑模型和事务测试。
- Out of scope：合并/部分恢复、云端、加密、账号、自动备份、定期提醒、AI、烹饪历史新功能、旧 Web 产品重构。
- Constraints：无新联网/广泛存储权限；不删除用户数据库排错；真实数据不参与破坏性验收；不提交密钥、设备数据库、私人图片或签名材料。
- Dependencies：APK-1 已验收提交 `2973893`、RecipeLibrary、SQLite 插件 8.1.1、原生系统选图模式及私有文件目录。
- Acceptance：Golden 数据全部实际实体字段、ID、顺序、时间不变；媒体字节哈希不变；旧库取消/失败不变；新库离线重开可用；升级保留数据；损坏/恶意输入在改库前拒绝。
- Verification：格式/关系测试、真实 SQLite 事务/迁移、IndexedDB 适配契约、Java ZIP 边界、Android 原生系统文件往返/失败/升级、完整现有测试、类型、Lint、构建及证据包。

## 2. 已核对的事实与方案选择

基线：`feat/recipio-daily-library` 的 `2973893`，开始审计时工作区干净；本模块分支 `feat/recipio-backup-restore` 从该提交创建。

- Android Source of Truth：`recipio` SQLite schemaVersion=2；recipes、recipe_ingredients、recipe_steps、recipe_preparations、recipe_key_tips、recipe_changes 六表。
- 子项主键是 `(recipe_id, position)`，不是独立 UUID。保留实际主键与顺序，不为备份虚构子项 ID。菜谱与修改记录 ID 原样保留。
- `recipe_changes` 已存 before/after 快照。它们是用户修改记录，不是缓存；旧快照中的图片也是引用，必须纳入完整媒体闭包。
- Android 图片：`filesDir/images/<UUID>.<ext>`；数据库存路径，不存 Blob。浏览器复用既有 IndexedDB localRecipes / recipeChanges / device-owned media。
- 当前新版没有持久化用户设置；`settings` 初版为严格空对象。不要把旧账号、通知授权或网页页面状态当成新版设置，也不提前创建设置表。
- Android 已 `allowBackup=false`，旧/新备份规则排除 cloud-backup 和 device-transfer 五个数据域。保留现状，最终审计合并清单；厂商迁移工具行为不能作绝对保证。
- 当前 driver.batch 使用 `executeSet(true)` 并内部立即提交；不能在其返回后才做可回滚的数量/外键检查。新增显式事务能力。

选择逻辑 ZIP 而非原数据库复制：与插件物理布局解耦，可在删除旧库之前验证引用及媒体。现有导出数据库接口和只导出 JSON 都不满足完整包目标。

Java 标准 ZIP / SHA-256 处理 Android 容器，不新增压缩 npm 包，不自行实现压缩或密码学。Web 本轮复用格式校验、BackupService 状态、IndexedDB 替换契约测试；正式系统文件导出/导入验收以 Android 为准，浏览器不伪装原生能力。

## 3. 容器与 Manifest

建议文件名为 `recipio-backup-<UTC ISO 时间，冒号/小数点替换为连字符>.recipio`；系统保存器允许修改显示名。界面中的创建时间按设备时区显示；包内时间统一 UTC ISO-8601。后缀/MIME/显示文件名不作为可信格式证据。

```text
manifest.json
data.json
media/<assetId>.<jpg|png|webp|avif>
```

只允许上列文件，不接受目录条目、任意额外数据、嵌套包或可执行内容。媒体从生成的安全目标名写入常规文件，绝不按外部 entry 路径创建链接或文件。

Manifest 必需字段：

| 字段 | v1 语义 |
| --- | --- |
| format / formatVersion | `recipio-backup` / 整数 `1`，独立于数据库版本 |
| createdAt | UTC ISO-8601，精确到毫秒，`Z` 结尾 |
| appVersionName / appVersionCode | 实际已安装 Android 包版本名/整数版本号；不得取旧 npm 版本冒充 |
| databaseSchemaVersion | 导出源库实际版本；APK-2 预期为 `3`，见第 6 节 |
| dataFile | 固定 path=`data.json`、UTF-8 字节 size、64 位小写十六进制 sha256 |
| media | assetId、严格 path、mimeType、实际 size、sha256 的数组 |
| counts | recipes、ingredients、steps、preparations、keyTips、changes、media 的非负整数 |

assetId 采用文件内容 SHA-256，图片字节相同的多个引用共用一个资产；这是新增的便携资产标识，不替换任何已有业务实体 ID。同一字节不能出现矛盾 MIME。允许 JPG/PNG/WebP/AVIF，extension 与 MIME 对应且核对文件签名。源设备路径和 content/blob URI 不写入包。

数据文件和图片都有逐文件 size / SHA-256。SHA-256 只说明完整性，不证明可信来源或加密；仍须做完整业务校验。

## 4. data.json 与关系校验

顶层严格对象：`recipes`、`ingredients`、`steps`、`preparations`、`keyTips`、`changes` 数组及 `settings: {}`。

| 集合 | 逻辑字段 |
| --- | --- |
| recipes | id, title, createdAt, updatedAt, totalMinutes, servings, caloriesPerServing, coverAssetId, notes |
| ingredients | recipeId, position, name, amount |
| steps | recipeId, position, instruction, imageAssetId |
| preparations | recipeId, position, instruction, minutes, timingText |
| keyTips | recipeId, position, instruction, stepNumber |
| changes | id, recipeId, changedAt, before, after |

快照 before 保留原菜谱 ID/时间与原详情字段；after 保留原实际详情字段。只在确定的封面/步骤图字段里将本机路径换为 assetId，不对备注/指令字符串做递归正则替换。恢复只重映射存储路径，业务内容不得改写；测试比较便携引用图及图片字节，不要求新设备私有路径与旧设备绝对一致。

用 Zod 独立备份 Schema 校验，不调用会 trim/coerce/default 的编辑器保存流程。不生成新 ID、不重新打时间、不本地化数字、不把未知值变为 0。保留中文、换行、Emoji、有效历史值与空值；不能静默删未知必需字段。

`BackupSourceSnapshot` 是上述关系 DTO 的设备投影：recipes 的 coverAssetId 改为 coverPath，steps 的 imageAssetId 改为 imagePath，快照使用实际 before/after 类型并保留确定的设备图片字段；另附 sourceSchemaVersion。asset 变换不得经过 createDetails/saveDetails。其余源字段与 BackupData 一致，settings 为 `{}`。

约束：

- 所有真实实体 ID 非空且有长度上限；recipes.id、changes.id 唯一。ID 不能参与文件路径生成。
- 每种子项 `(recipeId, position)` 唯一，每道菜从 0 连续排序；不悄悄重排损坏的顺序。
- 子项/修改记录的 recipeId 必须存在；keyTips.stepNumber 为 null 或实际存在的 1-based 步骤号。
- 快照必须可按其正式结构解析，所属菜谱一致；全部当前与历史 asset 引用存在，所有声明媒体确实被引用。
- 时间有效且为 UTC `Z`；数量、耗时、份数、文本长度遵循当前领域边界；检查顺序关系和非法数值。
- Manifest counts 与实际数据、媒体数量逐项一致。当前 core 字段无枚举；未来枚举不得以任意字符串通过。
- 不导出 deleted_at 非空的菜谱或其修改记录。不导出未保存编辑内容；仍在五秒撤销窗口时提示先撤销或等待结束，再开始，不能把它永久删除以便备份。
- 不导出搜索结果、派生 preparationHint、缓存、日志、孤立媒体、临时文件、原 APK、云记录或 restore metadata。

当前 Web adapter 中兼容旧模型的字段/内部子项 ID 不得在 Replace 中顺手重写其他旧产品表。Web 测试需明确便携源数据投影边界；正式“所有源数据完整备份”的交付断言针对当前 Android 六表及其媒体，不冒称整个旧 Web/PWA 数据库已被备份。

## 5. 资源与档案安全

v1 MVP 的处理上限（不是日常单张照片上传限制）：manifest 1MiB、data 16MiB、压缩包及累计实际解压各 4GiB、媒体 10,000 个、文件条目 10,002 个、菜谱 10,000 道、子项累计各 100,000 条、修改快照 20,000 条、JSON 深度 32、entry 名称 128 字符。达到任一边界，明确提示不支持或空间不足，不挂起、不删除当前数据。

所有限制按实际读入/写入计数，使用 long/安全整数及防溢出判断；不能只相信 ZipEntry size、Manifest 或剩余空间预估。导出也不得生成本版本不能恢复的包。剩余空间预算应包含私有安全备份、输入副本、新 generation 和 SQLite 余量，捕获真实 IO/空间错误。

先按压缩字节预算流式复制系统 URI 到内部生成的私有文件，再使用 `ZipFile` 检查中央目录、条目集合和重复路径。逐项流式读取并核对实际大小、CRC、SHA-256；严格 UTF-8 和有界 JSON 解析；拒绝非 ZIP、中央目录截断、路径穿越、绝对/反斜杠/控制字符路径、重复 path、伪装 MIME 与缺失文件。

固定 64KiB IO buffer。桥接只传有界业务 JSON、内部 token、路径引用清单和进度/统计，不传图片或整个 ZIP 的 Base64。ZIP 工作使用插件自有单线程 executor，不能长期占据 Capacitor 公共 HandlerThread，取消与状态查询应可响应。

## 6. Repository、并发与最小 Migration

`UI → BackupService → BackupRepository / MediaStore → Native Archive / SQLite`。UI 不写 SQL，不遍历图片目录。

新增统一 DataOperationCoordinator：Backup/Restore 最多一个；CRUD、undo、purge 的数据访问及恢复提交共用协调器，不能仅禁用按钮。快照读取使用一致事务；快照完成后普通数据写入可恢复，图片不可变且备份期间禁止回收。Restore 预览不长期锁库，确认时重新取当前数量与创建安全快照。

SqlDriver 增加受控 `transaction(work)`，提供事务内 query/run/batch；原生显式 begin → 参数化分块写入（内部关闭嵌套事务）→ counts/foreign_key_check → commit，异常 rollback。同一事务内的工作不重新进入外部锁。查询/写入失败不得吞掉异常。

实现 schemaVersion=3，仅增加单行 `backup_restore_state` 运维元数据表：operation_id、generation_id、data_sha256、committed_at；固定主键 1。v1/v2 到 v3 增量迁移，不改六张业务表原有字段或数据。此行与 Replace 同一事务提交，用于进程中断/提交响应丢失后确认实际结果，包括恢复空库的情况；它不是用户设置、不备份、不增加同步字段。

Web 用同一逻辑 DTO、IndexedDB 事务和测试专用测试库验证替换/回滚；如需要同等提交状态，Dexie v5→v6 仅新增 `nativeBackupState` metadata store（主键 id=`active`），不重建或清空旧表。不会把原生 SQLite 测试替换为 IndexedDB 结果。原生连接关闭/重开只在需要时做，缓存/已选菜谱/撤销通知必须在恢复成功后失效，不靠强制刷新隐藏错误。

## 7. 导出与系统保存边界

1. 设置页点击导出，原生 ACTION_CREATE_DOCUMENT 请求新文档、CATEGORY_OPENABLE、EXTRA_LOCAL_ONLY；取消不得读写业务数据或启动重复任务。
2. 取一致源数据快照并收集完整引用闭包，解除短暂数据锁；文件不可变，暂不 GC。
3. 原生分块哈希/写 ZIP 到私有临时文件，完成、关闭、sync 并重新完整验证；此过程不改业务数据。
4. 将完整包流式复制到本次新建系统文档，关闭后回读验证整体字节数和 SHA-256。只有这一步通过才能显示成功。
5. 失败仅尽力删除本次新建外部文件，不覆盖/删除旧备份；保留内部已验证包供本次重试。残留外部部分文件须明确提示不是成功备份。

Android ACTION_CREATE_DOCUMENT 不覆盖已有同名文件，会自动追加序号。任意 provider 没有统一原子 rename/write 事务保证，不能对用户宣称外部文档写入绝对原子。本文采用“私有完整包 + 不覆盖旧文件 + 回读确认”，而不是假设任意 URI 支持原子提交。EXTRA_LOCAL_ONLY 请求本地内容，不是控制其他 provider 云上传行为的安全沙箱；不集成或主动调用云服务，界面提醒选择设备本地位置。

## 8. Restore：Validate → Stage → Commit → Cleanup

1. 系统文件选择器只返回 content URI；读入内部随机工作目录，完整容器/Manifest/数据/媒体校验。任何不合法包先拒绝，尚未触碰业务库。
2. 将新媒体在 `images/generation-<内部UUID>/<assetId>.<ext>` 完整写入并校验，关闭、sync、发布最终不可变路径；扩展集中 localImagePath 只接受旧路径及该精确新形式。然后展示创建时间、实际应用版本、各数量、图片总大小、格式版本；显示“恢复后将替换当前设备上的 X 道菜谱和相关图片”。取消清理本次未提交 generation 和临时物，不改原库。这一顺序继承用户最终批准的“先 staging，再确认”，取代早期草案。
3. 点击“恢复并替换当前数据”后再二次确认；若本机数量变动，重新显示实际 X；确认前退出等同取消。
4. Acquire exclusive data gate。先生成并验证当前库完整私有安全备份；失败即停止。界面提醒安全副本仍在本机，不能防卸载，用户应先导出到设备外部位置。
5. 再次核对已经完成的 generation 路径可读，防止预览期间文件损坏；绝不提前删除旧图片。
6. 写入轻量操作 journal。只在新媒体已经可读后，显式单事务删除/插入六表业务数据、重映射当前及快照媒体、写 backup_restore_state；提交前校验 counts、数据关系及 foreign_key_check。
7. 事务失败 rollback。提交结果不明确先重读事务内元数据确定旧/新状态，不能立即删除新 generation。无法确认时保留所有文件和安全副本，显示恢复状态待核查，禁止自动再次 Replace。
8. 提交成功后失效 UI/Repository 状态，重新读取列表与搜索；显示恢复结果。删除旧业务数据是用户此次 Replace 的范围，但不先删图片。
9. 成功冷启动再以完整当前/快照引用闭包核对文件。清理仅限此次操作生成的无引用 staging；旧有效媒体及已验证安全备份默认保守保留，本轮不扩大到全库孤立图片 GC。清理失败不把已成功恢复重新报告成失败。

崩溃：SQL 提交前原库有效；SQL 提交后新库完整引用已落盘媒体。journal/bridge 回调都不是提交事实源；启动 reconciliation 以 SQLite metadata 和完整引用闭包为准，不能按旧 marker 删除新 generation。数据库不可读/marker 损坏时不进行破坏性清理或自动恢复，只提供可重试状态。

新媒体先落盘、再 SQL 提交覆盖进程异常中断路径；不把 JVM/模拟器测试宣称为所有硬件断电耐久保证。

## 9. UI、隐私与生命周期

设置 → 数据与备份：导出完整备份 / 导入并恢复。进度区分选择位置、准备、媒体、写入、校验、预览、恢复、成功/取消/失败/版本不支持；aria-live、可触摸按钮、错误可重试。

单例 BackupService 保存操作状态，重复点击/重挂载不会启动第二次任务；原生单操作注册表再次防护。离开预览取消；已开始 Commit 的恢复不允许“取消后强制停在半途”。旋转/后台不重新启动，进程结束依 journal/SQLite 事实恢复状态而非自动重放 destructive 操作。

提示：“备份文件可能包含菜谱照片和个人备注，请妥善保管。此备份未加密。”不保存 API Key、系统通知权限或文件授权令牌，不提供密码/账号。

## 10. 版本与向后兼容

v1 的初次生产写出对应 SQLite v3。该模块没有任何旧 `.recipio` 生产格式需要迁移；支持 formatVersion=1 与已知源 schemaVersion=3。输入的更高未知格式/库版本提示“该备份由更高版本谱序创建，当前版本无法恢复”；未知旧版本明确拒绝，不猜结构或默默补字段。

未来 schema 升级需添加显式 `formatVersion + source schema → 当前逻辑 DTO` 迁移链及旧 Golden 包回归。不得更改 v1 必需字段语义、静默删未知源数据或把 physical SQLite 版本等同容器版本。

## 11. 实施门禁与验收材料

用户已在 2026-10-04 集中批准方案及实施计划，固定 SOL 执行；逐任务 RED → GREEN。APK/设备数据库清除只在专用测试环境执行，测试包只用生成数据/图片。继承当前 SDK/JDK；只管理本模块专用模拟器，不关闭其他项目进程。

验收包括空库、仅菜名、完整中文/Emoji Golden 库、编辑快照历史图片、同库替换/取消、所有损坏/未来格式/越权路径输入、真实 SQLite 中途插入失败与提交前校验回滚、空间/输入/输出故障、进程中断后恢复、系统导出与实际文件重读、离线冷启动、v6 覆盖升级。

交付完整验证命令/exit codes/失败/skip/warnings、APK 与测试备份路径/大小/SHA-256、测试设备、APK-2 checkpoint、whitelist review-packet-backup-restore.zip。全部适用测试通过才提交并推送当前功能分支；不合并 main、不部署。状态只据证据输出 COMPLETE / PENDING_DEVICE_TEST / BLOCKED。

2026-10-04 实施事实：SQLite v3 / Dexie v6，交付 versionCode10。最终全仓 673、JVM 29、完整 connected 7 项通过；专用 API36 模拟器实际系统导出、清除生成数据恢复、坏包/取消/事务与 staging 故障、进程中断、离线冷启动和覆盖升级已验证。阶段进度由 Service state + native status 提供，不承诺字节百分比。物理手机/OEM/极限硬件压测未执行；具体样本大小/哈希和限制见验收报告，不能从格式规范推定普遍设备通过。

## 12. 官方接口证据

- [Android SAF 文档](https://developer.android.com/training/data-storage/shared/documents-files)：用户选择文件；无需广泛存储访问；ACTION_CREATE_DOCUMENT 不覆盖旧文件。
- [DocumentsContract.Document](https://developer.android.com/reference/android/provider/DocumentsContract.Document)：rename/write/delete 为 provider 可选能力，不构成跨 provider 原子事务承诺。
- [Intent.EXTRA_LOCAL_ONLY](https://developer.android.com/reference/android/content/Intent#EXTRA_LOCAL_ONLY)：请求选择已在设备上的数据，不能承诺第三方 provider 不联网。
- SQLite 显式事务依据本仓库实际安装插件 definitions.d.ts / Android Database.java 核对，不猜 API。

浏览器、真实 Node SQLite、JVM 容器测试、Android provider instrumentation、模拟器系统选择器与物理手机是不同证据边界。当前实现仅支持已知 v1/schema3，未执行的设备/厂商场景必须在验收记录中单列，不能由本格式文档推定通过。
# Successor note — APK-3

This v1 definition remains frozen. APK-3 writes v2/schema4 with cooking records, while importing valid strict v1 through unchanged validation. See `backup-format-v2.md`; no missing original v1 field is defaulted or redefined.
