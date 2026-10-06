# 谱序 RECIPIO

## 当前本地日常菜谱库

新产品入口使用 Vite + React，共享界面通过 Repository 分别访问 Android SQLite/私有文件与浏览器 IndexedDB。核心无账户、无 Supabase/Vercel 运行依赖；旧 Web 代码保留作回退，不代表新产品范围。

本地预览：`npm run dev:local`。稳定 main 已按用户授权 fast-forward 到验收 APK-5A `f7c5d8d` / `v0.6.0-link-import`。本轮 `feat/recipio-share-target` 新增 **APK-5B Android 分享链接入口**，最终交付 `artifacts/recipio-share-target-v14-delivery-debug.apk` / versionCode14 / `0.7.0-share-target`；v13/v12/v11 保留不覆盖。交付状态、哈希和未验证项以 [CURRENT_STATE](docs/CURRENT_STATE.md) 与 [分享入口验证](docs/verification/share-target.md) 为准。重建时使用 `scripts/build-apk.ps1` 明确传入 ArtifactName、VersionCode、VersionName；旧 `npm run build:apk` 默认仍是旧 v5 命名，不代表最新交付。

当前证据见 [APK-4 Android 验证](docs/verification/ai-intake-android.md)、[模块交付报告](docs/checkpoints/2026-10-04-ai-intake.md)、[AI 合约](docs/ai-intake-contract.md)、[Backup Format v2](docs/backup-format-v2.md) 和 [CURRENT_STATE](docs/CURRENT_STATE.md)。完整步骤是默认主路径，Focus/Guided 可选，只有用户明确完成才生成轻量做过记录；照片/评价/备注可选，修改历史只读。设置页导出包含当前/历史/成品图片的完整 `.recipio`，严格兼容旧 v1 输入，经校验、预览和明确确认后安全替换恢复。备份未加密，应保存到应用外部本地位置；私有安全副本不能防卸载或清数据。浏览器不伪装原生 SQLite/文件选择器验收。APK-1/2/3 证据保留为历史。

APK-4 是已验收的可选在线增强：自由文字、1–6 张截图或组合，经原生 Qwen 请求、本地严格校验与保守审核、人工编辑确认，保存为普通菜谱。用户 Key/账号/文字/截图/编辑/保存六项真机验收记录保留；不是 Codex 再执行的真实 AI 测试。原生安全输入匹配已批准的北京百炼或千问 workspace 凭据端点，密钥不进入 JS、数据库、备份或日志；截图仅为私有临时缓存。浏览器不提供真实密钥或 Provider。AI 失败不影响本地核心。

APK-5A：“新增” → “从网页链接导入” → 公网安全读取 → 优先 Schema.org Parser → 可编辑 Preview → 保存普通本地菜谱。读取不会自动调用 AI；缺结构时仅用户点击“使用 AI 继续整理”才联网使用现有 Qwen。网页来源与图片不长期保存，旧 SQLite4/Backup2 不变。私网、认证 URL、非默认端口和不安全跳转拒绝。详见 [合约](docs/link-import-contract.md)、[依赖与许可](docs/link-import-dependencies.md)、[Android 专项](docs/verification/link-import-android.md)。

APK-5B：Android“分享” → “谱序 RECIPIO” → 唯一 HTTP(S) 链接预填上述入口，**不会自动读取网页、调用 AI 或保存**。编辑/AI/已有链接/恢复/烹饪弹窗受保护，待处理分享只展示域名，由用户打开或忽略。仅文字URL，无附件/视频/社交专项/网页搜索/云同步/5C；来源仅进程内存。详见 [分享合约](docs/share-target-contract.md)、[验证](docs/verification/share-target-android.md)。

## 保留的旧 Web / PWA 版本

谱序 RECIPIO 是一个中文优先的个人菜谱与分步烹饪 PWA。模块 1 已完成项目基础、邮箱验证码登录、认证路由保护和手机/桌面响应式导航；模块 2 已加入私有菜谱数据模型、菜谱编辑、搜索筛选、收藏、回收站和详情页；模块 3 提供单步引导烹饪；模块 4 提供基于菜谱的在线购物清单；模块 5A 提供安全的 PWA 安装壳、离线公共页和用户确认更新流程；模块 6/7 提供提前准备事项、AI 提取和烹饪前确认；模块 8 提供周菜单、准备提醒和按周生成购物清单。

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
- IndexedDB 私有菜谱快照、离线购物修改和后台同步由后续 Local-first 模块维护；当前版本已经为离线菜谱、编辑、烹饪和购物清单提供本机读取与同步基础。

## PWA 深化：Local-first 与弱网体验

- 应用安装入口会根据浏览器能力提供原生安装提示，或显示 Android、iOS Safari、桌面浏览器的手动安装步骤；已安装或独立窗口运行时会明确显示状态。
- Service Worker 注册完成后只在首次打开、回到前台、窗口重新获得焦点或网络恢复时检查更新，并以 5 分钟为最短间隔，避免持续轮询；新 worker 仍需用户点击“立即更新”才接管。
- 页面导航请求设置 3.5 秒弱网超时；超时后进入已有的离线壳或私有离线应用入口，不会无限等待网络。
- 离线入口的“返回在线页面”会根据当前网络状态启用或禁用，网络恢复后不会自动跳转；用户可以继续使用本机已缓存的菜谱、编辑、烹饪进度和购物勾选。
- Manifest 使用固定 `id`、支持任意屏幕方向，并通过安全区间距适配刘海屏和独立窗口；桌面端保持原有布局。

## 模块 6：提前准备与 AI 整理

- 菜谱可以记录腌制、浸泡、解冻、醒发等正式烹饪前的准备事项，精确时间按分钟保存，只有文字描述时保留原文。
- 菜谱列表显示最长提前时间，详情页和离线详情页显示完整准备清单；烹饪开始前可逐项确认，也可以明确跳过确认。
- 网页、图文、视频文案和截图导入会提取来源明确的提前准备要求，并在保存前交给用户检查。
- 新增数据库迁移为 `supabase/migrations/20260830142826_recipe_preparations.sql`；执行前必须确认目标 Supabase 项目，仓库不会自动修改线上数据库。

## 模块 8：周菜单与准备提醒

- 受保护路由为 `/plan`，支持在同一天的早餐、午餐和晚餐安排多道菜，保存目标份数、开做时间、状态和备注。
- 开做时间在浏览器按设备本地时区输入和显示，写入 Supabase 时使用 `timestamptz` UTC 时间。
- 精确提前分钟会换算成准备时间并显示即将开始、已到时间或已逾期；只有文字时间时原样展示，不推算不存在的具体时间。
- 浏览器通知是用户主动授权后的可选增强，只在应用打开时发送；拒绝或不支持通知不影响应用内提醒。
- “生成购物清单”先按菜谱汇总本周待做份数，再复用模块 4 的保守合并规则；已完成和已跳过计划不会加入。
- 本模块保持在线使用，不增加 Cron、邮件、远程推送、离线编辑或冲突同步。
- 新增数据库迁移为 `supabase/migrations/20260831032930_meal_plan_entries.sql`；执行前必须再次确认目标 Supabase 项目。

## 模块 9：烹饪历史与个人改进

- 引导烹饪完成后可保存实际份数、评分、成品照片和“下次注意”，也可以跳过保存；保存失败时本地烹饪进度不会丢失。
- 菜谱详情展示累计次数、平均评分、最近三次记录和私有签名照片；从周菜单开始烹饪会预填目标份数，完成后同步菜单状态。
- 历史记录和照片只属于当前用户，使用强制 RLS 与私有 `recipe-media` Storage 路径；删除菜谱或菜单后保留标题快照并安全解除关联。
- 当前版本不提供完整历史中心、记录编辑、家庭共享或离线历史同步。
- 新增数据库迁移为 `supabase/migrations/20260831094439_cooking_history.sql`；执行前必须再次确认目标 Supabase 项目。

## AI 导入审核

- 默认使用 Qwen 3.8 Flash；自动模式仅在可恢复失败时尝试已配置的 Gemini。
- “来源明确”表示 AI 在输入内容中识别到明确依据，不代表人工核验。
- 数量、火候或时间无法确认时保持为空，并在保存前要求用户检查。
- 链接无法公开读取时，可改用粘贴文案或上传截图。

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

首次使用菜谱数据时，需要在已授权的非生产 Supabase 项目中执行 `supabase/migrations/20260823132418_recipe_management.sql`。启用购物清单时，还需要执行 `supabase/migrations/20260824024955_shopping_lists.sql`；使用提前准备事项时，再执行 `supabase/migrations/20260830142826_recipe_preparations.sql`；使用周菜单时，继续执行 `supabase/migrations/20260831032930_meal_plan_entries.sql`。当前仓库只提供迁移文件和本地 PGlite 迁移测试，不会自动连接或修改任何 Supabase 项目。

然后打开 <http://localhost:3000>。

`.env.local` 只填写非生产 Supabase 的公共变量：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

菜谱来源整理的 AI 调用只允许在服务端执行。要在本地 Preview 验证时，可在 `.env.local` 增加：

```dotenv
DASHSCOPE_API_KEY=
RECIPE_AI_MODEL=qwen3.8-flash
GEMINI_API_KEY=
GEMINI_RECIPE_AI_MODEL=gemini-3.7-flash
```

`DASHSCOPE_API_KEY`、`GEMINI_API_KEY` 不会发送到浏览器，也不应提交到 Git。也可使用 `QIANWEN_API_KEY` 作为 Qwen 别名；如控制台提供了其他模型 ID，可分别用 `RECIPE_AI_MODEL` 或 `GEMINI_RECIPE_AI_MODEL` 覆盖默认模型。导入菜谱时可以选择“自动推荐”“只用 Qwen 3.8 Flash”或“只用 Gemini”：自动模式会优先使用 Qwen，遇到可恢复的服务错误时最多回退到 Gemini 一次；单模型模式不会调用另一家服务。生产环境变量需要在 Vercel 项目中单独配置；未配置时，导入功能会给出配置缺失提示。

不要提交 `.env.local`，也不要把 service-role key 放进前端或仓库。

## 验证命令

```powershell
npm.cmd test
npm.cmd run test:imports
npm.cmd run test:shopping
npm.cmd run test:plan
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
- [模块 9 烹饪历史验收记录](docs/testing/module-9-cooking-history-acceptance.md)
