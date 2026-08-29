# 食序 ORDINE

食序 ORDINE 是一个中文优先的个人菜谱与分步烹饪 PWA。模块 1 已完成项目基础、邮箱验证码登录、认证路由保护和手机/桌面响应式导航；模块 2 已加入私有菜谱数据模型、菜谱编辑、搜索筛选、收藏、回收站和详情页；模块 3 提供单步引导烹饪；模块 4 提供基于菜谱的在线购物清单；模块 5A 提供安全的 PWA 安装壳、离线公共页和用户确认更新流程。

## 模块 3：引导烹饪边界

- 受保护的烹饪路由为 `/recipes/[recipeId]/cook`。
- 本模块没有数据库迁移；不新增 Supabase 表、RPC、Storage 或服务端 API。
- 进度使用浏览器 Local Storage，键名为 `food-sequence:cooking:v1:<recipeId>`。它仅保存在当前设备/浏览器，不会跨设备同步。
- 计时器以绝对结束时间为准，恢复或回到前台时重新计算剩余时间，避免依赖间隔计时造成累计漂移。
- Screen Wake Lock 和浏览器 Notifications 都是可选增强能力；不支持、被拒绝或失败时，步骤导航和页面内计时仍可用。

## 模块 4：购物清单边界

- 受保护的购物清单路由为 `/shopping`，需要 Supabase Auth 登录后访问。
- 用户可以从多个私有菜谱生成当前购物清单，为每个菜谱选择目标份数，并在生成前排除不需要采购的食材。
- 合并规则保持保守：只合并同一 `ingredient_id`、可计算数值数量、兼容单位的食材；文字数量、缺失数量、不同中文单位或其他不确定项会保留为独立条目。
- 生成结果写入快照表，保存菜谱标题、选择份数、食材名称、数量、单位、区域和来源关系。后续编辑菜谱不会改写既有清单快照。
- 当前版本每个用户只保留一份 active 购物清单；生成新清单会替换旧 active 清单，但历史行会作为非 active 记录保留在数据库中。
- 清单支持勾选、手动添加、编辑、删除、上下移动排序和清理已完成项；这些操作只影响购物清单，不会修改菜谱。
- 本模块是在线功能，依赖 Supabase 数据库和认证。离线查看、IndexedDB 缓存、后台同步和 PWA 离线购物流程延期到模块 5。

## 模块 5A：PWA 公共壳与更新边界

- Manifest 的应用入口为 `/recipes`，安装图标和苹果触控图标使用仓库内的暖中性视觉基底。
- Service Worker 只预缓存离线页、Manifest 和图标；不会缓存登录后的页面、Supabase/API 响应、Next.js 构建资源或其他私人数据。
- 新版本安装后保持 waiting，用户点击“立即更新”才会发送 `SKIP_WAITING`；新 worker 接管后只刷新一次，并清理旧公共壳缓存。
- `/sw.js`、`/manifest.webmanifest`、`/offline.html` 和 `/icons/*` 在认证中间件中直接放行，避免离线壳依赖 Supabase Auth。
- 断网时显示可访问的状态提示；离线页只包含内联 HTML/CSS，不依赖脚本或私有数据。
- IndexedDB 私有菜谱快照、离线购物修改和后台同步属于模块 5B，当前未实现，也未修改数据库、业务 API 或认证模型。

## 本地要求

- Node.js 22 或兼容 Next.js 15 的较新 LTS 版本
- npm
- 一个非生产 Supabase 项目（只有实际验证登录、数据库和 Storage 时才需要）

## 开始运行

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

首次使用菜谱数据时，需要在已授权的非生产 Supabase 项目中执行 `supabase/migrations/20260823132418_recipe_management.sql`。启用购物清单时，还需要执行 `supabase/migrations/20260824024955_shopping_lists.sql`。当前仓库只提供迁移文件和本地 PGlite 迁移测试，不会自动连接或修改任何 Supabase 项目。

然后打开 <http://localhost:3000>。

`.env.local` 只填写非生产 Supabase 的公共变量：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

菜谱来源整理的 AI 调用只允许在服务端执行。要在本地 Preview 验证时，可在 `.env.local` 增加：

```dotenv
DASHSCOPE_API_KEY=
RECIPE_AI_MODEL=qwen3.7-flash
```

`DASHSCOPE_API_KEY` 不会发送到浏览器，也不应提交到 Git。也可使用 `QIANWEN_API_KEY` 作为别名；如 Qwen 控制台提供了其他模型 ID，可用 `RECIPE_AI_MODEL` 覆盖默认的 `qwen3.7-flash`。生产环境变量需要在 Vercel 项目中单独配置；未配置时，导入功能会给出配置缺失提示。

不要提交 `.env.local`，也不要把 service-role key 放进前端或仓库。

## 验证命令

```powershell
npm.cmd test
npm.cmd run test:shopping
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

真实邮箱验证码登录、菜谱数据、购物清单生成和持久化需要经授权的非生产 Supabase 项目和测试邮箱；没有这些输入时，只运行代码级验证和未登录路由保护冒烟。不要使用生产项目或个人凭据完成验收。

## 设计文档

- [产品规格](docs/superpowers/specs/2026-08-23-personal-recipe-cooking-app-design.md)
- [模块 1 实施计划](docs/superpowers/plans/2026-08-23-module-1-foundation-auth-navigation.md)
- [模块 2 实施计划](docs/superpowers/plans/2026-08-23-module-2-recipe-management.md)
- [模块 2 验收记录](docs/testing/module-2-recipe-management-acceptance.md)
- [模块 3 引导烹饪实施计划](docs/superpowers/plans/2026-08-23-module-3-guided-cooking.md)
- [模块 3 引导烹饪验收记录](docs/testing/module-3-guided-cooking-acceptance.md)
- [模块 4 购物清单实施计划](docs/superpowers/plans/2026-08-24-module-4-shopping-list.md)
- [模块 4 购物清单验收记录](docs/testing/module-4-shopping-list-acceptance.md)
- [模块 5A PWA 公共壳与更新验收记录](docs/testing/module-5a-pwa-shell-acceptance.md)
- [模块 6A 来源导入验收记录](docs/testing/module-6a-recipe-source-import-acceptance.md)
