# Architecture

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

## Implemented browser slice

- `/offline/app` is the current feature boundary for device-local recipe list, detail, create and edit flows.
- The local recipe service maps shared editor input to the Dexie repository and adapts records to the existing offline UI.
- Authenticated `/recipes` pages still use the legacy Supabase path during the transition.
- If the local repository is empty or unavailable, compatible legacy snapshots remain readable; promoting a legacy recipe preserves favorite and source metadata.
- Local media is intentionally deferred to the next module, so unavailable images degrade to placeholders without blocking recipe text.
