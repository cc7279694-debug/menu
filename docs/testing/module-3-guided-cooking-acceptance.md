# 模块 3：引导烹饪验收记录

## 模块边界

- 受保护路由：`/recipes/[recipeId]/cook`。
- 不包含数据库迁移、Supabase API/RPC/Storage、部署或新的服务端接口。
- 本机进度键为 `food-sequence:cooking:v1:<recipeId>`；Local Storage 仅在当前设备和浏览器中保存，不提供跨设备同步。
- 计时器保存绝对 `endsAt`，页面回到前台或恢复会从当前时间重新计算剩余时间。
- Wake Lock 和 Notifications 是渐进增强：不支持、拒绝或失败都不会阻断步骤导航或页面内计时。
- 模块 4 购物清单与模块 5 离线/IndexedDB 保持延期，未在此模块启动。

## 纯函数与组件证据（2026-08-24）

使用单工作进程串行执行，避免当前 Windows 主机的并发 Vitest 内存耗尽问题：

```powershell
npm.cmd test -- src/features/cooking --reporter=verbose --maxWorkers=1 --fileParallelism=false
```

- 结果：7 个测试文件、50 个测试全部通过（16.10 秒）。
- 覆盖：份数缩放与文字数量保留、步骤食材映射和覆盖优先级、版本化 Local Storage 会话、绝对结束时间与并行计时器、恢复/完成、Wake Lock、Notifications，以及烹饪入口和单步屏幕的组件交互。
- Vitest 输出 1 条既有 Vite `configLoader: 'native'` 迁移警告：`vitest.config.ts` 以 CommonJS 方式加载时含 ESM 语法；本模块未修改该配置。

## 本地构建与测试证据（2026-08-24）

以下命令均按顺序单独执行：

```powershell
npm.cmd test -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd run test:db -- --reporter=dot --maxWorkers=1 --fileParallelism=false
npm.cmd run typecheck
npm.cmd run lint
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-review-placeholder'
npm.cmd run build
```

- 全量测试：27 个测试文件、102 个测试全部通过（77.03 秒）。
- 数据库/PGlite 测试：10 个测试文件、32 个测试全部通过（41.68 秒）。这只验证本地迁移、RLS/RPC/Storage 策略，不能替代真实 Supabase Data API、认证或 Storage 验收。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run lint`：0 errors、4 warnings。均为既有 `@next/next/no-img-element` 警告，位于 `image-picker.tsx`、`recipe-card.tsx` 和 `recipe-detail.tsx`（2 处）；本模块的步骤图片仍使用 `<img>`，该优化风险在后续图片策略中统一处理。
- `npm.cmd run build`：通过。构建显示同样的 4 条 `<img>` 警告，另有 1 条多个 lockfile 导致 Next.js 推断工作区根目录的警告；没有通过删除 lockfile 来压制该警告。
- 生产构建已列出动态路由 `/recipes/[recipeId]/cook`（6.52 kB，首载 163 kB）。构建仅使用本地安全占位的 Supabase 公共变量，不连接真实项目。

## 浏览器验收与能力边界

- 本记录创建时，in-app Browser 的视觉/交互冒烟由模块控制方单独执行；未在此工作树保存截图。
- 需要使用授权的非生产 Supabase 项目和测试账号，在桌面与 360px 宽度验证：三步、两计时器、关联食材和步骤图片的菜谱；4 人份数值数量翻倍而文字数量不变；当前步骤食材与覆盖数量；跨步骤并行计时；隐藏/恢复后按 `endsAt` 重算；刷新后恢复步骤、份数和计时器；Wake Lock 拒绝/不支持提示；完成后清理本地会话及返回/编辑备注链接。
- 同次浏览器验收还应确认 URL/标题、有效 DOM、无框架错误遮罩、控制台健康、键盘焦点、无横向溢出，并将截图保存在仓库外。
- 尚无授权的非生产认证会话证据，因此真实 Supabase 认证、真实菜谱读取、浏览器 Wake Lock/Notifications 设备行为和跨设备边界仍待后续非生产验收；不得使用生产项目或个人邮箱。

## 安全、依赖与范围检查（2026-08-24）

```powershell
git diff --check
git status --short --branch
git grep -n -I -E "service_role|SUPABASE_SERVICE_ROLE|eyJ[a-zA-Z0-9_-]{20,}|password=" -- . ":(exclude)package-lock.json"
npm.cmd audit --omit=dev
```

- `git diff --check`：通过；执行文档提交前需再次复跑。
- 密钥模式扫描只命中已有实施计划中的命令文本，以及 `supabase/config.toml` 对本地 `service_role` 角色的说明；未发现前端 service-role key、JWT 或密码值。
- `npm.cmd audit --omit=dev`：3 个 high 严重度依赖建议，来自 Next.js 15.5.23 间接依赖的 `postcss` 和 `sharp`。自动修复要求强制升级到破坏性版本 `next@16.3.2`，本模块未执行。
- 相对基线 `8acd366...HEAD` 的实现范围仅含模块 3 烹饪路由、组件、hooks、纯函数和测试，以及任务计划/报告；没有购物清单、离线/IndexedDB、数据库迁移、部署或无关重构文件。
