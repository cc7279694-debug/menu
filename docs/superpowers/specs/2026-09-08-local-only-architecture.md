# 谱序 RECIPIO Local-only Architecture

## Goal

将谱序逐步改造成以设备本地数据为唯一业务数据源的 React 应用：浏览器使用 IndexedDB，Android 使用 SQLite；Supabase 保留为当前线上回退版本，后续不再作为本地应用运行时依赖。

## Decisions

- 采用单一 React + TypeScript 业务层，使用 Repository 接口隔离存储实现。
- 浏览器适配器使用 Dexie/IndexedDB；Android 适配器使用 Capacitor SQLite。
- 当前阶段不迁移现有云端数据，不删除 Supabase 项目，不修改 Production。
- 不再引入登录和多设备同步到本地版本；本地数据默认属于当前设备。
- 原图保存在设备本地，数据库只保存媒体索引与路径；同时维护缩略图。
- AI 继续使用 Qwen 3.8 Flash，但仅作为可选联网能力；AI 失败不阻塞核心菜谱功能。
- 链接导入和导入后营养分析先实现可用基础版，兼容性和精度在后期单独优化。
- 备份使用带版本号的 ZIP（manifest、JSON 数据、媒体文件），恢复前自动创建安全备份。

## Non-goals for the first implementation slice

- 不删除现有 Supabase 查询、Server Actions、Auth 或 Vercel 部署。
- 不把所有页面一次性改成离线页面。
- 不实现云同步、冲突合并或家庭共享。

## Acceptance baseline

- 本地 Repository 可以在浏览器 IndexedDB 中创建、读取、更新和软删除菜谱。
- 数据模型使用 UUID 和 ISO 时间戳，刷新页面后记录仍可读取。
- 现有 Supabase 路径和线上回退版本行为不变。
- 单元测试、TypeScript 和现有相关测试通过。
