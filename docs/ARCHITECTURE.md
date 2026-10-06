# Architecture

## APK-5B URL-only Android Share entry（2026-10-05）

```text
Android ACTION_SEND / exact text/plain / EXTRA_TEXT
  → LocalShareTargetPlugin.handleOnNewIntent（cold + singleTask warm）
  → ShareTextParser（≤32KiB UTF-8 / exact URL dedupe / WebUrlSafety.parse, no DNS）
  → process-memory ShareTargetInbox（UUID / one pending / one-shot consume）
  → payload-free shareAvailable hint → strict JS consume → ShareTargetController
  → LibraryApp fresh route/lock/backup/viewer ownership check
      → safe: existing lazy LinkImportService.setUrl, no read
      → protected: hostname-only pending banner → explicit Open / Ignore
  → user clicks Read → unchanged APK-5A safe fetch/parser/explicit AI/Preview
```

Native removes consumed EXTRA_TEXT/ClipData but keeps Intent action identity. Capacitor's initial load already forwards the cold Intent; there is no second cold capture, persisted pending, URL event payload or raw-source logging. React subscribes to the existing link service for eligibility updates; async lazy opening rechecks the current mounted owner and latest pending UUID before prefill. Failed listener setup can be retried; stale setup handles are released. Browser has no native Share capability.

LocalShareTarget's destruction/consume/intent callbacks share a lifecycle monitor: queued calls from a destroyed Bridge cannot drain a new Activity's process-memory receipt. No data-layer lifecycle or schema is changed.

No dependency, permission, SQLite4/Preview7/Backup2 change. No auto Fetch/Parser/AI/save, attachment reads, SEND_MULTIPLE, VIEW/BROWSABLE or custom keyboard state. Process death may discard pending. Text punctuation is not guessed or rewritten. See share-target-contract.md and verification/share-target*.md for actual results; historic sections below retain their original scope.

## APK-5A 普通网页导入（2026-10-05）

```text
新增 → 独立网页链接入口
LinkImportService（仅内存 URL / HTML / parser draft / generation）
  → lazy LocalWebImport.read / cancel
      → Native SafeWebFetcher → OkHttp 4.12.0
      → 每跳全部 DNS 地址校验 → 固定已验证 DNS → 独立连接池 / 系统 TLS
  → 惰性加载 Cheerio slim，解析不可执行 HTML 字符串 → Schema.org Recipe / HowToSection
      → 完整：直接可编辑 Parser Preview（不调用 AI）
      → 部分：直接完善，或用户显式 AI
      → 无结构且正文可读：用户显式 AI
  → 原 AiIntakeService / Native secure key / 校验和人工审核（仅清洗文字，无网页图片）
  → RecipeLibrary.createDetails（操作 UUID / FIFO precondition / 不确定写入查证）
  → 普通 SQLite4 / Preview7 Recipe → 既有 Backup2
```

Parser 与 UI 延迟加载，首页不预先下载 parser chunk。来源无持久缓存、ImportJob、RecipeSource 或新表。封面、步骤图片为 null，notes 不自动存来源。取消、保存和恢复代次隔离迟到结果；未确定写入结果只能查原 UUID，保留用户修改，不重复创建。同名提示仅新建，不覆盖旧菜谱。

原生限定公网 HTTP80 / HTTPS443、GET、固定 UA、无 Cookie/Authorization/Referer/proxy；每跳重新验证全部 DNS、固定真实连接地址、独立连接池、关闭自动重试/跳转。最多3次跳转、禁止 HTTPS 降级；connect8s/read12s/全链20s（含 DNS）；解压及转 UTF-8 后 HTML/XHTML ≤2MiB。Android cleartext policy 允许批准的普通 HTTP 输入；系统 TLS、Qwen 固定 HTTPS、WebView CSP 不放宽，无新权限。第三方 HTML 永不加载到 WebView 或执行脚本。

可见正文按完整段落和菜谱相关段落优先保留，28,000 Unicode code points；超限明确提示，不静默切片。AI 只收到 ≤30,000 的清洗文字，不收到 URL、headers、HTML、图片或本地库。可见恶意文字仍是不可信输入，不宣称过滤器能消灭所有 Prompt Injection；复用严格 Native/JS schema、fieldChecks、人工门禁和普通事务保存限制其权限。

实现及证据见 link-import-contract.md、link-import-dependencies.md 与 verification/link-import.md。原生网络连接安全由 JVM 真实 OkHttp/socket 的生成测试证明；Android Fake HTTP 用于 WebView/IME/SQLite 集成，不冒充真实外网/TLS。APK-4 已获用户验收的 Provider 能力保留，无再次付费验证。下面 APK-4 的 pending 描述是历史实现时点，当前状态以 CURRENT_STATE 为准。

## APK-4 可选原生 AI Intake（2026-10-04）

```text
新增 → 手动录入（原路径） / AI 整理
AiIntakeService（App 生命周期内存 input / draft / generation）
  → lazy LocalAiIntake bridge
      → Android native password dialog / AiSecretStore
          → AndroidKeystore AES-GCM + noBackupFilesDir AtomicFile
      → cache/ai-import/<operation UUID> / SAF / sampled Bitmap + EXIF
      → 单 worker / AiRequestLifecycle / fixed credential-matched official HTTPS QwenClient
  → strict JSON + Zod → 保守 normalization → 三态 fieldChecks
  → 共用 RecipeEditor + 明确审核和保存
  → AiRecipeSaver → RecipeLibrary.createDetails（现有 FIFO gate + operation UUID）
  → 原 SQLite4 / Preview7 / Backup2
```

没有新增业务表、Migration、备份字段或第二种 AI Recipe。Provider 输出、Prompt、原文字、临时截图、审核和秘密不进入正式 Recipe/备份；仅经用户审核的普通字段进入现有事务。Web Preview 不设置密钥或直连 Provider，展示 Android 能力边界。

主 JS 无 plaintext key getter/setter。原生受保护输入和密文不经 WebView；密钥修改与请求共用互斥生命周期。仅主动操作发一个 POST，无自动请求/重试/模型回退。用户2026-10-05批准 sk-ws-（允许句点）匹配固定 maas.qianwenaiapi.com，旧北京 sk- 保留 dashscope.aliyuncs.com；同一原生 Provider 枚举决定请求与安全状态回复，绝不失败后跨接口转发。字符规则由 AiSecretEnvelope 共用，Token Plan sk-sp- 拒绝。model=qwen3.8-flash、系统 TLS不变。桌面一次 tiny-text HTTP200证明当时文字账号可用，不能代替原生图片/保存/设备验收；完整APK4仍 pending。

请求/解码使用操作 UUID、代次、取消 token 和图片 pin。终态先释放互斥/图片再回复；取消迟到回应不能覆盖新草稿。独立 cache 不属于永久媒体引用闭包；丢弃失败保留原生 pending owner，显式清理重试同时回收文件和会话名额。冷启动只清已登记失活目录，未知文件/符号链接保守保留并提示。无法清理不阻塞本地库。

严格校验后以来源数字完整 token 核对分钟/份数，拒绝 15→5、12→2 和小数通配符；适量/模糊时间原文保留、未知时间 null。缺失/推断必须明确确认，UI 与 service 双门禁；AI 不能写数据库。同操作 UUID 丢失确认可回读原记录，不重复创建。Restore 同步失效内存上下文，现有 FIFO gate 取得前的旧保存在接触库前拒绝。

仅新增 INTERNET；原系统云备份/设备转移排除不变。CSP/本地核心仍不依赖远程网络，Capacitor loggingBehavior=none 且原生 Logger 初始化先于注册。实际验证和未验证项独立见 verification/ai-intake-android.md；以下旧模块架构是历史，不表示当前 APK 没有可选 INTERNET 权限。

## APK-3 本地烹饪与个人演进（2026-10-04）

```text
RecipeDetail（默认完整步骤）
  → 可选 StepViewer（Focus / Guided，仅当前查看索引）
  → 用户明确完成 → RecipeLibrary.recordCooking（操作 UUID 重试幂等）
  → CookingCompletion（可选照片 / 评价 / 备注 / 调整当前做法）
  → CookingHistory / RecipeChangeHistory（时间 + ID 游标分页）
RecipeLibrary + DataOperationCoordinator
  → Android SQLite v4 / Web Preview Dexie v7
  → 不可变私有图片路径 + LocalMediaLifecycle 引用闭包 / 导出 pin
BackupService / LocalBackup
  → 严格 v2（schema4、七张业务表）导出及安全副本
  → 严格原 v1（schema3）校验后只补空 cookingRecords
  → 已有 staging → 二次确认 → 安全副本 → 单事务 Replace / 提交事实核查
```

SQLite v3→v4 增量增加 `cooking_records`、记录/修改历史的分页索引；不修改旧表行、不重建数据库。Dexie 的 v6 声明保持原样，v7 增加设备专属 `nativeCookingRecords` 和修改历史索引。所有业务数据经 Repository，UI 不直接执行 SQL。

做过记录只由用户明确操作创建，最小记录先持久化，随后才可补照片/评价/备注。同一次失败重试保留 UUID 与首次成功时间；打开详情、Focus、Guided 或停留都没有自动完成语义。保存最小记录期间统一保护返回/编辑/历史/主导航，避免异步结果覆盖未保存编辑。Focus/Guided 不建立第二套状态机，也没有 Timer。

当前 Recipe 是认可的最新做法。规范化比较无变化则不写时间/修改记录；正式 before/after 投影不含卡片派生字段。历史只读、不提供回滚或版本切换。首页最后做过时间来自真实记录，不改变原加入时间排序。

成品照片作为封面时共享一个相对路径而非复制。闭包覆盖封面、步骤、修改记录 before/after、烹饪照片和仍可撤销的软删除菜谱；导出在释放短快照锁前 pin 全部媒体，回读结束后释放。只对删除记录/到期菜谱产生的候选文件执行引用复查；还有引用、pin 或查询失败都保留。图片清理失败是已成功数据写入后的警告，不假装事务回滚；编辑草稿、替换留下的旧图和未知孤立文件不做目录扫除。

v1 校验器及 required changes 语义不变；规范化仅补 `cookingRecords: []`，journal 和 SQL 提交仍使用输入包原始 manifest/hash。v2 新增 required cookingRecords/counts、记录照片资产引用；七实体和恢复事实在同一数据库事务回读校验后提交。原生启动引用审计也检查 cooking-only 图片。原生worker先释放已结束操作的busy/phase再回复，禁止在回复后的finally改写下一操作的锁。旧 APK-2 不能读 v2，新 APK-3 可读 v1/v2。详细格式与兼容性见 `backup-format-v2.md`。

实际验证结果单列于 APK-3 checkpoint / verification。以下 APK-2 章节保留为已验收历史架构，不代表当前数据库仍为 v3。

## APK-2 完整备份与 Replace（2026-10-04）

```text
Settings / BackupControls
  → 单例 BackupService（预览、二次确认、进度、错误和不确定状态）
  → BackupRepository + DataOperationCoordinator
      → Android SQLite v3 / Web Preview Dexie v6
  → LocalBackup 原生插件（独立单线程 executor）
      → SAF 新文档 / 用户选中的本地文件
      → 私有 backup-work/<operation UUID> / 标准 ZIP + SHA-256
      → 不可变 images/generation-<UUID>/<asset SHA>.<ext>
      → 私有 backups/safety-<operation UUID>.recipio
```

Backup Format v1 是逻辑 ZIP，不是复制正在打开的数据库。六张业务表及当前、before/after 历史图片构成完整引用闭包；设备路径只在明确媒体字段映射为内容 SHA，不重写 ID、时间、排序或文字。设置暂为空对象，提交记录不进入备份。

SQLite v2→v3 仅增加固定单行 `backup_restore_state`；Dexie v5→v6 仅增加 `nativeBackupState`。共享协调器隔离 CRUD、撤销、清理、一致快照和恢复；显式数据库事务在校验数量、外键与完整读回后提交六表和恢复事实。

恢复先完成容器、数据、关系、媒体哈希校验并暂存新媒体，再显示确认。确认时重新核对当前数量、创建并回读安全副本，然后单事务替换。图片不先删除；旧媒体及安全副本保守保留。SQL 提交响应丢失时复读真实提交记录；不能确定结果则保留文件、阻止重复恢复。启动核查以实际 SQL 提交记录和当前/历史引用为准，不以 journal phase 推断提交，不重放 Replace。

原生私有根目录先规范化 Android 系统路径别名，之后仍拒绝工作目录、媒体和删除目标中的符号链接。只清理由插件登记且未被引用的暂存 generation；未发布操作记录可清理，损坏已发布记录失败关闭。

导出创建新系统文档，不覆盖原文件；先完成私有包，再复制、关闭并回读完整包和 SHA。失败清理新建外部文档；provider 拒绝删除时明确警告。外部 provider 不提供统一原子事务，完整私有包保留供核查。`EXTRA_LOCAL_ONLY` 不保证第三方 provider 永不上传，UI 要求选择设备本地位置。

Android 继续无登录、无 INTERNET 运行依赖，系统云备份/设备转移规则保持排除。浏览器展示原生能力边界，使用同一 DTO 和真实 IndexedDB 事务测试，不伪装 SAF/SQLite 验收。当前验证结果单列在 APK-2 checkpoint 与 `verification/backup-restore-android.md`。

## 当前日常菜谱库（2026-10-04）

```text
native/index.html → native/main.ts → src/native/main.tsx
  → LibraryApp / RecipeEditor / RecipeDetail
  → RecipeLibrary + RecipeDetails Zod 校验
      → PreviewRecipeLibrary → 既有 Dexie localRecipes / recipeChanges
      → RecipeNameStore → SqlDriver → Android SQLite
  → LocalImage / media adapter
      → 浏览器既有 media 表（Blob）
      → Android Directory.Data/images（路径引用，不存数据库 Blob）
        → LocalImagePickerPlugin → 系统文档选择器 → ContentResolver 字节流
        → 私有 images/<UUID>.<ext>.part → 关闭/同步 → 同目录重命名
```

Vite 本地预览可独立运行，无登录、Supabase 请求或远程资源。生产静态入口 CSP 仅允许自身脚本与本地图片；开发 CSP 单独允许本机热更新。浏览器预览没有 Service Worker，离线验证只覆盖已加载页面操作。

APK-1 基线 SQLite schemaVersion=2（APK-2 当前为 v3）；v1 名称数据保留，增量添加耗时/份数/热量/封面路径/备注，以及按位置规范化的食材、步骤、准备、关键事项表，删除级联。修改快照以 before/after JSON 存在 recipe_changes，无历史界面。完整新建与保存通过 executeSet 事务执行，开启外键；5 秒撤销期保存关联数据，过期后清理。

APK-1 基线 Dexie schemaVersion=5（APK-2 当前为 v6），沿用 v4 stores，仅新增 recipeChanges。设备媒体 owner 固定为 recipio-library-preview；旧云缓存清除不得删除此 owner 的文件。图片保守保留，孤立回收后置。不存在云同步、新账户或远程业务主库。

SQLite 使用 Node 原生数据库验证迁移与事务；Android 安装、文件与持久化另在模拟器验证，证据边界以 CURRENT_STATE 和最新原生检查点为准。下列 APK-0 与旧 Web 内容为历史/保留实现，不代表新版范围。

Android 编辑器拦截选图输入的点击，调用应用内 LocalImagePicker 插件，不把系统 content URI 交给 WebView FileReader。插件只接收用户通过系统选择器选中的 content URI，拒绝应用自身 FileProvider；MIME 仅 JPEG/PNG/WebP/AVIF。后台复制完整字节，返回已生成的相对路径，取消不修改旧引用。无固定图片大小上限；复制预算为当时可用空间减 32MiB，尽力为数据库留余量。读取/关闭/空间不足异常删除本次部分文件，不删除已有图片；进程被强杀可能遗留 .part，尚无启动回收。没有新增权限、依赖、SQLite 字段或 Migration。浏览器继续使用 File 输入与 IndexedDB。

Android 系统返回键通过 MainActivity 的 OnBackPressedDispatcher 发出可取消的 `recipio:back` 事件。界面处理详情/列表导航，编辑器沿用未保存确认和写入锁；根页面未拦截时将应用置于后台，不删除数据。没有引入新的路由或数据层。

## Android APK-0 (2026-10-03)

`native/index.html` → `src/native/main.tsx` → 现有 UI 组件 → `RecipeNameStore` → `SqlDriver` → Capacitor Community SQLite → 本机 `recipioSQLite.db`。

独立 Vite 入口输出 `dist-native`，Capacitor 将资源装入 APK；没有 server.url、登录、Supabase、远程字体或运行时网络依赖。APK-0 不申请 INTERNET。旧 Next.js 工程保留不变。

schemaVersion=1，插件 `addUpgradeStatement` 注册 migration，再打开版本化连接。`recipes` 存名称、UUID、加入/修改时间与 5 秒内部删除时间；名称约束、参数化 SQL、加入时间排序、100 条分页。窗口内撤销恢复原行，超时/重启清理；无回收站、同步字段或图片 Blob。

SQL 使用 Node 原生 SQLite 作契约测试；Android 插件、安装、飞行模式、持久化另行验证，不由浏览器测试替代。后续增量扩展 migration，不清数据库。

以下描述保留的旧 Web 架构，并非 Android 运行依赖。

## Current transition state

Next.js App Router renders the application. Supabase Auth, Postgres, Storage and Server Actions currently provide the primary data path. Dexie/IndexedDB caches selected recipes, drafts, shopping state and cooking sessions.

## Legacy target (superseded product scope)

```text
React UI
  -> Application services
  -> Repository interfaces
       -> IndexedDB/Dexie (browser/PWA)
       -> SQLite + filesystem (Android)
  -> Optional AI adapter (Qwen 3.8 Flash)
```

## Ownership

- Local database: recipes, plans, shopping, cooking history, settings and import drafts.
- Local media index: original images, thumbnails, MIME type, byte size and local path/blob key.
- AI service: optional, online-only, never the source of truth for saved records.
- Supabase/Vercel: transition fallback and rollback deployment only until local acceptance.

## Transition rule

New UI code must depend on Repository interfaces rather than importing Supabase clients directly. The legacy adapter remains available until the local vertical slice is accepted.

## Retained legacy browser slice (historical, not the native entry)

- `/offline/app` is the current feature boundary for device-local recipe list, detail, create and edit flows.
- The local recipe service maps shared editor input to the Dexie repository and adapts records to the existing offline UI.
- Authenticated `/recipes` pages still use the legacy Supabase path during the transition.
- If the local repository is empty or unavailable, compatible legacy snapshots remain readable; promoting a legacy recipe preserves favorite and source metadata.
- Media was deferred in that historical slice. Current native/Preview media and cooking behavior are described in the APK-3 section above; this legacy boundary is not the current implementation claim.
