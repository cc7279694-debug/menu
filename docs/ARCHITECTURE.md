# Architecture

## Android APK-0 (2026-10-03)

`native/index.html` → `src/native/main.tsx` → 现有 UI 组件 → `RecipeNameStore` → `SqlDriver` → Capacitor Community SQLite → 本机 `recipioSQLite.db`。

独立 Vite 入口输出 `dist-native`，Capacitor 将资源装入 APK；没有 server.url、登录、Supabase、远程字体或运行时网络依赖。APK-0 不申请 INTERNET。旧 Next.js 工程保留不变。

schemaVersion=1，插件 `addUpgradeStatement` 注册 migration，再打开版本化连接。`recipes` 存名称、UUID、加入/修改时间与 5 秒内部删除时间；名称约束、参数化 SQL、加入时间排序、100 条分页。窗口内撤销恢复原行，超时/重启清理；无回收站、同步字段或图片 Blob。

SQL 使用 Node 原生 SQLite 作契约测试；Android 插件、安装、飞行模式、持久化另行验证，不由浏览器测试替代。后续增量扩展 migration，不清数据库。

以下描述保留的旧 Web 架构，并非 Android 运行依赖。

## Current transition state

Next.js App Router renders the application. Supabase Auth, Postgres, Storage and Server Actions currently provide the primary data path. Dexie/IndexedDB caches selected recipes, drafts, shopping state and cooking sessions.

## Target local state

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
