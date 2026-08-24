# 模块 4：购物清单验收记录

## 模块边界

- 受保护路由：`/shopping`。
- 数据库迁移：`supabase/migrations/20260824024955_shopping_lists.sql`，新增购物清单、来源、条目和条目来源表，以及 `replace_active_shopping_list`、`reorder_shopping_items` RPC。
- 本模块依赖 Supabase Auth 和 PostgreSQL；没有实现离线/IndexedDB、后台同步、Service Worker、部署、家庭共享、AI 导入或生产环境操作。
- 生成购物清单时，每个用户只保留一份 active 清单；新清单会替换旧 active 清单。旧清单以非 active 历史行保留，不会继续作为当前清单展示。
- 清单条目保存菜谱标题、选择份数、食材名称、数量、单位、区域和来源快照；后续菜谱编辑不会改写既有清单快照。
- 合并边界保持严格：只合并同一 `ingredient_id`、可计算数值数量、兼容单位的食材。文字数量、缺失数量、不同中文单位或其他不确定数量保留为独立条目。
- 清单内的勾选、手动添加、编辑、删除、排序和清理已完成项只修改购物清单，不修改菜谱或食材库。

## 串行测试证据（2026-08-24）

以下命令均在 `feat/recipe-app-shopping` 工作树中单独执行，使用单工作进程，避免 Windows 主机并发 Vitest 内存压力。

```powershell
npm.cmd run test:shopping -- --reporter=dot --maxWorkers=1 --fileParallelism=false
```

- 结果：8 个测试文件、67 个测试全部通过。
- 耗时：61.74s。
- 覆盖：购物清单 schema、保守合并、查询映射、Server Actions、生成器/页面组件、PGlite 迁移和购物清单安全测试。
- warning：1 条既有 Vite `configLoader: 'native'` 迁移警告，指向 `vitest.config.ts` 以 CommonJS 方式加载含 ESM 语法的配置。

```powershell
npm.cmd test -- --reporter=dot --maxWorkers=1 --fileParallelism=false
```

- 结果：36 个测试文件、181 个测试全部通过。
- 耗时：158.59s。
- warning：同一条 Vite `configLoader: 'native'` 迁移警告。

```powershell
npm.cmd run test:db -- --reporter=dot --maxWorkers=1 --fileParallelism=false
```

- 结果：12 个测试文件、46 个测试全部通过。
- 耗时：90.99s。
- 覆盖：本地 PGlite 迁移、RLS/RPC 安全边界、菜谱数据库回归。
- warning：同一条 Vite `configLoader: 'native'` 迁移警告。

```powershell
npm.cmd run typecheck
```

- 结果：通过，`tsc --noEmit` 退出码 0。

```powershell
npm.cmd run lint
```

- 结果：通过，0 errors、4 warnings。
- warnings：均为既有 `@next/next/no-img-element`，位置为 `src/features/recipes/components/image-picker.tsx:33`、`recipe-card.tsx:12`、`recipe-detail.tsx:39`、`recipe-detail.tsx:56`。

## 安全构建证据（2026-08-24）

使用仅本地占位的 Supabase 公共变量，没有使用远程 Supabase 或生产凭据：

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-review-placeholder'
npm.cmd run build
```

- 结果：通过，退出码 0。
- `/shopping` 生产路由成功生成：`14.1 kB`，First Load JS `151 kB`。
- 构建 warning：Next.js 检测到多个 lockfile，并将 `E:\CODEX\VIBE CODING\package-lock.json` 推断为 workspace root；未删除 lockfile 或修改配置。
- webpack cache warning：2 条 `Serializing big strings` 性能提示。
- 构建内置 lint warning：同 lint 命令的 4 条 `<img>` 优化提示。

## 浏览器验收与边界（2026-08-24）

本轮没有授权的非生产 Supabase 凭据，因此浏览器验收只覆盖未登录 smoke 和路由保护，不覆盖已认证购物清单业务流。不得把本节解读为真实 Supabase 认证、两菜谱生成、份数变化、排除食材、兼容合并/不兼容非合并、来源标签、勾选、编辑、手动添加、排序、清理、刷新持久化或 active 清单替换已通过浏览器验证。

本地开发服务器使用占位公共变量启动：

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-review-placeholder'
npm.cmd run dev -- --hostname 127.0.0.1 --port 3104
```

- 服务器结果：`http://127.0.0.1:3104` ready。
- 服务器 warning：同构建的多个 lockfile workspace root 推断 warning；首次页面编译出现 2 条 webpack cache `Serializing big strings` 提示。
- in-app Browser 桌面访问 `http://127.0.0.1:3104/shopping` 后跳转到 `http://localhost:3104/login?next=%2Fshopping`，标题为 `登录 · 食序`。
- 桌面 DOM：`main` 数量 1，正文非空，文本包含“登录食序”“邮箱地址”“发送验证码”。
- 桌面视口：`innerWidth 1280`、`innerHeight 720`、`scrollWidth 1280`、`scrollHeight 720`，无横向溢出。
- 桌面错误遮罩：`nextjs-portal` 存在但为空且不可见；`[data-nextjs-dialog-overlay]`、`[data-nextjs-dialog]`、`[data-nextjs-toast]` 和 `#__next-build-watcher` 均未出现可见错误遮罩。
- 桌面 console：`warn`/`warning`/`error` 日志为空。
- 交互 smoke：在邮箱框输入 `review@example.test` 并点击“发送验证码”后，页面进入“6 位验证码”状态并显示“验证码已发送，请检查邮箱”；按钮变为“验证并登录”和“更换邮箱”。这是本地占位环境下的表单状态循环，不证明真实邮件或已认证登录。
- 360px 复查：设置 360px 视口后打开 `http://127.0.0.1:3104/login?next=%2Fshopping`，实际 `innerWidth 361`、`innerHeight 800`、`scrollWidth 361`、`scrollHeight 800`，无横向溢出，标题仍为 `登录 · 食序`，正文非空。
- 360px console：`warn`/`warning`/`error` 日志为空。

需要在获得授权的非生产 Supabase 项目和测试账号后补做已认证浏览器验收：至少两份菜谱、不同目标份数、一个排除食材、一个兼容合并、一个不兼容非合并、来源标签、勾选/编辑/手动添加/排序/清理、刷新持久化，以及生成新清单只保留一个 active 清单。

## 范围、安全和依赖检查（2026-08-24）

```powershell
git diff --check
```

- 结果：通过，退出码 0。

```powershell
git diff --stat acb2913...HEAD
git diff --name-only acb2913...HEAD
```

- 结果：相对 `acb2913` 共 32 个文件，`7133 insertions(+), 70 deletions(-)`。
- 范围：购物清单路由、shopping feature、共享数量解析、菜谱查询类型补充、Supabase database types、PGlite 迁移加载、购物清单迁移/安全测试和模块计划文档。
- 未发现本任务范围外的离线/IndexedDB、部署、家庭共享、AI 或生产环境操作文件。
- `src/features/cooking/servings.ts` 的变更来自 Task 2 共享数量解析边界；本任务没有继续修改该实现。

```powershell
rg --files-with-matches -I "service_role|SUPABASE_SERVICE_ROLE|eyJ[A-Za-z0-9_-]{20,}|password=|NEXT_PUBLIC_SUPABASE_ANON_KEY=.+[A-Za-z0-9_-]{20,}" --glob '!package-lock.json' --glob '!.next/**' --glob '!node_modules/**' .
```

- 命中文件：模块 1/2/3/4 计划或验收文档中的检查命令文本，以及 `supabase/config.toml` 对本地 `service_role` Data API 角色的说明。
- 未发现真实 service-role key、JWT、密码或生产凭据。

```powershell
npm.cmd audit --omit=dev --audit-level=high
```

- 结果：退出码 1，3 个 high severity vulnerabilities。
- 来源：`next@15.5.23` 依赖的 `postcss <=8.5.22` 和 `sharp <0.35.0`。
- npm 建议 `npm audit fix --force`，会安装 `next@16.3.2`，属于破坏性升级；本模块未执行。

## 当前结论

- 代码级、PGlite、typecheck、lint 和安全占位 build 均已通过。
- 未登录浏览器 smoke 已覆盖桌面和 360px 的路由保护、页面身份、非空 DOM、无可见框架错误遮罩、console 健康和横向溢出。
- 已认证购物清单浏览器流程仍受凭据边界限制，必须在授权非生产 Supabase 环境中补验后，才可声称真实端到端验收完成。
