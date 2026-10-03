# Decisions

## 2026-10-03 — Android APK-first product baseline

### Decision

采用用户确认的 `RECIPIO_CODEX_APK_EXECUTION_PROMPT.md` 基线。当前只执行 APK-0：Vite 静态资源随 Capacitor APK 安装，原生 SQLite 无账户菜名闭环。完整备份提前到 APK-2，AI 后置为可选在线录入能力。

### Context

用户确认个人菜谱库定位，并优先要真实离线 APK。旧分支已有浏览器 Dexie/React/UI/规则等资产，没有 Android 工程。

### Alternatives

继续旧浏览器媒体模块，或全量重写。均不符合 APK-0 范围。

### Reason

最小 Android 纵切先验证资源、原生桥、SQLite、升级持久化。保留旧 Next/Supabase 功能避免丢失可复用成果。

### Consequences

名称是正常菜谱，允许重名。删除只提供 5 秒撤销，窗口内保留原记录，超时永久清理，无回收站。`RecipeNameStore` 是精简 SQL 投影，不复用含分类/收藏等旧字段的完整云模型；APK-1 再增量扩展原生表。
禁用系统备份并排除设备转移数据；厂商迁移不保证遵从。完整备份前不作为唯一重要数据来源。旧云资源不动，共享 AI 密钥不得进入 APK。

### Supersedes

2026-09-08 浏览器优先执行顺序和提前实施 AI/营养的顺序被 APK 路线取代。保留本地事实源、云回退保留、不迁移旧数据的原则。

## 2026-09-08 — Local-only runtime before cloud retirement

### Decision

Make device-local storage the source of truth for the new browser/PWA/Android runtime. Keep Supabase/Vercel as a rollback version during migration.

### Context

The user prioritizes fast domestic access, offline use and no VPN dependency. Existing data is small and does not need migration or multi-device sync.

### Alternatives

Keep Supabase as the primary source with a larger cache; build a separate Android client; or gradually introduce a shared local Repository layer.

### Reason

The Repository layer allows browser IndexedDB and Android SQLite to share business logic without duplicating the product, while avoiding a premature distributed sync system.

### Consequences

The migration temporarily carries both legacy cloud and local paths. AI remains online-only, and local backups become the recovery mechanism.

## 2026-09-08 — Basic link import and nutrition first

### Decision

Keep basic link/image import and post-import nutrition analysis in scope, but defer advanced link compatibility and nutrition precision/UI refinement.

### Context

These capabilities are valuable but are not required for the core offline recipe experience.

### Reason

Separating the core local data path from optional AI prevents an AI outage from blocking cooking and recipe editing.

### Consequences

The first local version must show clear AI-unavailable states and allow manual editing/saving without AI results.
