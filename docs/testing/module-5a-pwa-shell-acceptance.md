# 模块 5A：PWA 公共壳与更新验收记录

## 范围

本次只交付 PWA 安装壳、公共离线页、严格的公共资源缓存白名单、用户确认更新提示和网络状态提示。没有新增数据库迁移、Supabase 表、RPC、Storage、业务 API 或大型依赖；IndexedDB 私有快照与离线购物同步保留到模块 5B。

## 代码级验证

| 检查 | 结果 |
| --- | --- |
| Manifest、图标、离线页测试 | 通过（3/3） |
| Service Worker 源码与 `/sw.js` 路由测试 | 通过（4/4） |
| PWA 运行时更新/断网组件测试 | 通过（5/5） |
| 认证中间件公共资源放行测试 | 通过（5/5，含既有路由访问测试） |
| TypeScript | 通过 |
| ESLint | 通过；保留既有 4 条 `<img>` 性能建议 |
| 生产构建 | 通过；Next.js 15.5.23，生成 `/manifest.webmanifest` 与 `/sw.js` |
| `git diff --check` | 通过 |

前端与数据库测试的完整串行 runner 在本机 Node/Vitest worker 阶段出现无输出长驻进程，已停止以避免持续占用内存；本次新增及相关路由定向测试共 17/17 通过。该 runner 状态属于本机测试基础设施限制，不能替代完整回归结论。

## 缓存安全验收

预期 Cache Storage 只出现一个以 `food-sequence-public-shell-` 开头的缓存，且只包含：

- `/offline.html`
- `/manifest.webmanifest`
- `/icons/icon-192.png`
- `/icons/icon-512.png`
- `/icons/icon-maskable-512.png`
- `/apple-touch-icon.png`

不得出现 `/api/`、`/_next/`、Supabase 请求、登录后 HTML、菜谱数据或购物清单数据。生产 HTTP 冒烟已确认：Manifest、Service Worker、离线页和 192px 图标均返回 200；Service Worker 包含 `qa-v1` 版本、无 `cache.put`、无私有/API/Next 路径；未登录 `/recipes` 保持 307 认证跳转。

## 浏览器与移动端验收

需要在桌面浏览器和 360px、390px、430px 视口确认：

- 首屏和页面切换无空白等待，PWA 状态卡片不遮挡主要操作；
- 离线页可独立显示，恢复网络后可回到应用；
- 新 worker 等待时只显示更新提示，不自动刷新；点击“稍后”保留旧 worker，点击“立即更新”后只刷新一次；
- 页面无横向溢出，控制台无新增错误或警告。

当前环境的 Opera 浏览器连接需要重新认证，未能完成真实安装、Cache Storage 面板、离线切换和 Lighthouse 采集；这些项目不以 HTTP 冒烟或静态检查冒充完成，待浏览器连接恢复后补验。
